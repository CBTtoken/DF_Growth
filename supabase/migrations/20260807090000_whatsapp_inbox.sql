-- WhatsApp inbox inside Growth Admin (scripts/handoff-whatsapp-inbox.md).
--
-- The number runs on the WhatsApp Cloud API and every message is read and
-- answered by Dewald from one screen in Growth Admin. There is no matching
-- engine, no dispatch, no generated text anywhere; the only automation is
-- the three-door first reply and the short scripted questions behind each
-- door, all of it fixed text Dewald wrote.
--
-- The retention design (handoff section 7) is the reason this schema has
-- two halves. A conversation carries a person: their number, their name,
-- everything they typed. It is deleted automatically once it has an
-- outcome and the configurable retention period has passed. A demand line
-- carries a market fact: trade, suburb, date, outcome. It references its
-- conversation only while that conversation is alive (on delete set null),
-- and it survives the cleanup indefinitely. That survival is the handoff's
-- own acceptance test.
--
-- Tables are prefixed wa_ and are admin-only: RLS is enabled with no
-- policies (default-deny for anon and authenticated) and service_role is
-- granted explicitly, same pattern as homepage_inquiry_replies. The July
-- WhatsApp onboarding bot's whatsapp_conversations table is untouched and
-- superseded, not dropped, pending Dewald's say-so.

create table public.wa_settings (
  -- Singleton: the primary key is a constant, so a second row cannot exist.
  id boolean primary key default true check (id),
  -- Handoff section 7: the retention period is configurable and is NOT
  -- approved. 72 is a build default awaiting Dewald's attorney.
  retention_hours int not null default 72 check (retention_hours >= 1),
  -- A conversation nobody ever marks with an outcome cannot hold personal
  -- information forever. After this many days of silence it is resolved
  -- automatically, which starts the retention clock above.
  auto_resolve_days int not null default 30 check (auto_resolve_days >= 1),
  updated_at timestamptz not null default now()
);

insert into public.wa_settings (id) values (true);

create table public.wa_conversations (
  id uuid primary key default gen_random_uuid(),
  -- Meta's `from` phone number, the send address. Unique because one
  -- person is one thread, forever, same as WhatsApp itself.
  wa_id text unique not null,
  -- Business-scoped user id (messages[].user_id). Kept alongside the phone
  -- number because Meta has said numbers may be absent for username-only
  -- accounts in future payloads.
  bsuid text,
  profile_name text,
  -- Which door they chose: 'job' | 'member' | 'join'. Null until they tap.
  door text check (door in ('job', 'member', 'join')),
  -- Where the scripted flow is. 'door' = three-door reply sent, waiting.
  -- door1_trade/door1_suburb/door1_urgency = collecting job fields.
  -- door2_menu = saved answers offered. door3_question = asked which kind
  -- of member they want to be. 'done' = script finished, Dewald owns it.
  flow_step text not null default 'door',
  -- Door 1's three structured fields (handoff section 3): stored as
  -- columns, not only message text, so the demand line can be written
  -- without re-reading the thread.
  trade text,
  suburb text,
  urgency text,
  labels text[] not null default '{}',
  -- Outcome starts the retention clock. Null = still live.
  outcome text check (outcome in ('converted', 'declined', 'resolved', 'unmatched')),
  outcome_at timestamptz,
  outcome_set_by text, -- 'admin' or 'auto' (the auto-resolve sweep)
  -- The "Dewald needs to look at this" flag: set when a flow hands over,
  -- when a message arrives outside the script, or when a send fails.
  needs_human boolean not null default false,
  needs_human_since timestamptz,
  -- Last time the needs-you email went out, so a chatty thread does not
  -- send one email per message.
  notified_at timestamptz,
  -- The 24-hour window anchor. Every inbound message resets it, including
  -- a thumbs up.
  last_inbound_at timestamptz,
  last_outbound_at timestamptz,
  -- Set when the hour-20 nudge is sent, so it is offered once per window.
  nudge_sent_at timestamptz,
  unread_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index wa_conversations_inbox_idx
  on public.wa_conversations (last_inbound_at desc nulls last);

create table public.wa_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.wa_conversations(id) on delete cascade,
  direction text not null check (direction in ('in', 'out')),
  -- Meta's message id. Unique so a redelivered webhook cannot double-store
  -- an inbound message, and so a status update can find its send.
  wamid text unique,
  -- 'text' | 'button_reply' | 'list_reply' | 'image' | 'document' |
  -- 'audio' | 'video' | 'sticker' | 'reaction' | 'unsupported'
  kind text not null default 'text',
  body text,
  -- Inbound rows stay 'received'. Outbound rows walk
  -- queued -> sent -> delivered -> read, or land on 'failed', which the
  -- inbox must show loudly (handoff: a silent send failure is the worst
  -- possible outcome).
  status text not null default 'received',
  error_detail text,
  -- 'system' for scripted sends, otherwise the admin email that typed it.
  sent_by text,
  saved_answer_id uuid,
  created_at timestamptz not null default now()
);

create index wa_messages_thread_idx
  on public.wa_messages (conversation_id, created_at);

create table public.wa_saved_answers (
  id uuid primary key default gen_random_uuid(),
  -- Which door offers this answer as a button: 'member' | 'join' | 'job'
  -- | 'general' (general = only offered to Dewald in the composer, never
  -- sent automatically).
  group_slug text not null default 'general'
    check (group_slug in ('member', 'join', 'job', 'general')),
  -- Shown on the WhatsApp list row / button. Meta caps row titles at 24
  -- characters and button titles at 20; the admin form enforces 20.
  button_label text not null,
  body text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Everything the system can say on its own, keyed by slug, editable in the
-- admin screen. approved=false until Dewald signs each one off; the report
-- quotes every row. Nothing anywhere generates reply text.
create table public.wa_bot_copy (
  slug text primary key,
  label text not null,
  body text not null,
  approved boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.wa_demand_lines (
  id uuid primary key default gen_random_uuid(),
  -- Alive only while the conversation is: deleting the conversation nulls
  -- this, and the line keeps standing on its own four fields.
  conversation_id uuid references public.wa_conversations(id) on delete set null,
  trade text,
  suburb text,
  urgency text,
  requested_on date not null default current_date,
  outcome text,
  created_at timestamptz not null default now()
);

-- Handoff section 7: log every automatic deletion. The conversation id is
-- recorded as a bare uuid; by the time anyone reads this log the row it
-- named is gone, so it identifies nothing.
create table public.wa_deletion_log (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  door text,
  outcome text,
  messages_deleted int not null default 0,
  retention_hours int not null,
  deleted_at timestamptz not null default now()
);

alter table public.wa_settings enable row level security;
alter table public.wa_conversations enable row level security;
alter table public.wa_messages enable row level security;
alter table public.wa_saved_answers enable row level security;
alter table public.wa_bot_copy enable row level security;
alter table public.wa_demand_lines enable row level security;
alter table public.wa_deletion_log enable row level security;

grant select, update on public.wa_settings to service_role;
grant select, insert, update, delete on public.wa_conversations to service_role;
grant select, insert, update, delete on public.wa_messages to service_role;
grant select, insert, update, delete on public.wa_saved_answers to service_role;
grant select, insert, update on public.wa_bot_copy to service_role;
grant select, insert, update on public.wa_demand_lines to service_role;
grant select, insert on public.wa_deletion_log to service_role;

-- Draft copy for every scripted message. All of it ships approved=false:
-- Dewald approves or rewrites each row in /admin/whatsapp/answers before
-- the number goes live. House style: no em dashes, South African English.
-- Button labels live in their own slugs because Meta caps them at 20
-- characters and they are sent as button titles, not body text.
insert into public.wa_bot_copy (slug, label, body) values
  ('welcome_doors',
   'First reply: the three doors',
   'Good day, you have reached DigitalFlyer SA. Tap one of the options below and we will help you straight away.'),
  ('door_button_job', 'Door button 1', 'Someone for a job'),
  ('door_button_member', 'Door button 2', 'I am a member'),
  ('door_button_join', 'Door button 3', 'I want to join'),
  ('door1_ask_trade',
   'Job: ask what work',
   'What kind of work do you need done? For example plumbing, painting or tiling.'),
  ('door1_ask_suburb',
   'Job: ask which suburb',
   'Which suburb or town should the person work in?'),
  ('door1_ask_urgency',
   'Job: ask how urgent',
   'How soon do you need it done?'),
  ('urgency_button_today', 'Urgency button 1', 'Today'),
  ('urgency_button_week', 'Urgency button 2', 'This week'),
  ('urgency_button_norush', 'Urgency button 3', 'No rush'),
  ('door1_handoff',
   'Job: handover to Dewald',
   'Thank you. Dewald at DigitalFlyer will look at this personally and send you a link to the right person. You will hear from us here shortly.'),
  ('door2_menu_intro',
   'Member: saved answers menu',
   'What do you need help with? Tap a question below, or just type your message.'),
  ('door2_menu_button', 'Member: menu open button', 'Choose a question'),
  ('door2_other_row', 'Member: something else row', 'Something else'),
  ('door2_handoff',
   'Member: handover to Dewald',
   'Thank you. A real person will read this and reply to you here shortly.'),
  ('door3_question',
   'Join: qualifying question',
   'Lovely. Which of these sounds most like what you need?'),
  ('door3_button_found', 'Join button 1', 'Get found online'),
  ('door3_button_invoice', 'Join button 2', 'Quotes and invoices'),
  ('door3_reply_found',
   'Join: get found reply',
   'DigitalFlyer gets your business found by real customers, with your own page on our marketplace. Have a look here: https://digitalflyer.co.za/pricing and if you have any questions, just ask right here.'),
  ('door3_reply_invoice',
   'Join: quotes and invoices reply',
   'KatisoBiz gives you quotes, invoices and slips from your phone, the SARS-ready way. Have a look here: https://katisobiz.co.za and if you have any questions, just ask right here.'),
  ('door3_handoff',
   'Join: handover to Dewald',
   'Dewald at DigitalFlyer will also see your message and can help you personally to get set up.'),
  ('nudge_20h',
   'Hour 20 nudge (sent only when Dewald taps it)',
   'Just checking in, is there anything else you need from us on this? You can reply here any time.');
