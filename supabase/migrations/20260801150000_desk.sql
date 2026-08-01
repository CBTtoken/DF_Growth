-- The Desk. A private, single-user tool for one operator, living in this
-- database because it needs no infrastructure of its own.
--
-- Two tables, prefixed like every other product in this project (bizup_,
-- board_, shop_). The handoff calls them "items" and "assets"; unprefixed
-- names that generic in a shared public schema with 58 other tables would
-- collide with the next feature that wants them.
--
-- Nothing here references or alters an existing table.

create table public.desk_items (
  id uuid primary key default gen_random_uuid(),

  -- The only field required at capture. Stored exactly as typed, including
  -- misspellings: the triage function is forbidden from rewriting it.
  title text not null,

  area text not null default 'business' check (area in ('personal', 'business')),

  -- Free text, not an enum. The list of ventures changes faster than a
  -- migration can keep up, and a wrong enum blocks capture.
  venture text,

  -- One sentence, the literal next physical step.
  next_action text,

  effort text not null default 'shallow' check (effort in ('shallow', 'deep')),

  -- 'me', the literal string 'date', or a person's name. Anything that is
  -- not 'me' is off the Today rotation and on the Waiting On list.
  blocked_by text not null default 'me',
  blocked_since date,

  due_date date,

  status text not null default 'open' check (status in ('open', 'done', 'parked', 'killed')),

  -- Section 3.6, the one rule enforced in code: an item leaves the list by
  -- being done, parked with a written trigger, or killed with a date.
  -- Both halves of that are constraints rather than form validation, so
  -- there is no route into the database that can bypass them.
  park_trigger text,
  killed_at timestamptz,

  skip_count integer not null default 0,
  notes text,

  done_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint desk_items_park_needs_trigger
    check (status <> 'parked' or (park_trigger is not null and length(trim(park_trigger)) > 0)),
  constraint desk_items_kill_needs_date
    check (status <> 'killed' or killed_at is not null)
);

-- The three selection queries all filter on status and blocked_by first.
create index desk_items_open_idx on public.desk_items (status, blocked_by, effort, skip_count, created_at);
create index desk_items_waiting_idx on public.desk_items (blocked_by, blocked_since);

create table public.desk_assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'other' check (type in ('domain', 'subscription', 'account', 'tool', 'other')),
  provider text,
  area text not null default 'business' check (area in ('personal', 'business')),

  -- Annual costs are stored divided by twelve so one column can be totalled.
  -- billing_cycle keeps the real cycle visible.
  cost_zar_monthly numeric(10, 2),
  billing_cycle text not null default 'unknown'
    check (billing_cycle in ('monthly', 'annual', 'once', 'unknown')),

  renewal_date date,

  -- A pointer in plain words, never a credential. No password, key or secret
  -- goes in this table or anywhere in this application.
  where_login_lives text,

  status text not null default 'unknown' check (status in ('active', 'cancel', 'unknown')),
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.desk_assets.where_login_lives is
  'Plain words only, for example "password manager" or "unknown". Never a credential.';

alter table public.desk_items enable row level security;
alter table public.desk_assets enable row level security;

-- No policies. Every read and write goes through the admin client behind the
-- single-user session gate, so nothing reaches these tables from a browser.
-- The grant is not optional: a new table on this project gets service_role
-- nothing by default and the failure is a silently empty page.
grant select, insert, update, delete on public.desk_items to service_role;
grant select, insert, update, delete on public.desk_assets to service_role;

-- Seed. Extracted from Dewald's own written record, 1 August 2026. Every
-- field is editable in the app; these are a starting position, not a claim
-- to be correct.
insert into public.desk_items (title, area, venture, effort, blocked_by, blocked_since, status, park_trigger) values
  ('Bob Go courier plugin not sorted', 'business', 'Growth', 'shallow', 'me', null, 'open', null),
  ('Booking module needs proper testing (appointments, calendar, BnB-type)', 'business', 'Growth', 'shallow', 'me', null, 'open', null),
  ('Events module needs testing', 'business', 'Growth', 'shallow', 'me', null, 'open', null),
  ('Set Paystack as the standard member payment gateway', 'business', 'Growth', 'shallow', 'me', null, 'open', null),
  ('Old BizUp description may still be live on the Growth pricing page', 'business', 'Growth', 'shallow', 'me', null, 'open', null),
  ('Growth members'' room, handoff written, real gate is ten founding members recruited personally', 'business', 'Growth', 'shallow', 'me', null, 'open', null),

  ('Position the KatisoBiz name as the toolset brand under DigitalFlyer SA', 'business', 'KatisoBiz', 'shallow', 'me', null, 'open', null),
  ('Backlog: client-side Approve / Change / Decline taps', 'business', 'KatisoBiz', 'shallow', 'me', null, 'open', null),
  ('Backlog: reminder ladder, days 3, 6, 7 for estimates and 3, 7, 14 for invoices', 'business', 'KatisoBiz', 'shallow', 'me', null, 'open', null),
  ('Backlog: five reports (monthly, date range, client, outstanding, VAT)', 'business', 'KatisoBiz', 'shallow', 'me', null, 'open', null),
  ('Backlog: status dashboard', 'business', 'KatisoBiz', 'shallow', 'me', null, 'open', null),
  ('KatisoBiz to Growth upgrade path, recommended for verification list, unconfirmed', 'business', 'KatisoBiz', 'shallow', 'me', null, 'open', null),

  ('Sit down and test The Board properly', 'business', 'Board', 'shallow', 'me', null, 'open', null),
  ('Data retention must be settled and audited before Phase 3, blocking', 'business', 'Board', 'shallow', 'me', null, 'open', null),

  ('Decide which number the switchboard runs on, blocking build', 'business', 'WhatsApp', 'shallow', 'me', null, 'open', null),
  ('Trade category list split into urgent and scheduled, blocking build', 'business', 'WhatsApp', 'shallow', 'me', null, 'open', null),
  ('Ten initial stored answers for the sales and support doors', 'business', 'WhatsApp', 'shallow', 'me', null, 'open', null),

  ('Paystack account collision, one test-mode account shared across four products, blocks payment work anywhere', 'business', 'Risk', 'shallow', 'me', null, 'open', null),
  ('Netcash legacy migration, confirm whether members with connected Netcash accounts were ever moved', 'business', 'Risk', 'shallow', 'me', null, 'open', null),
  ('Renewal webhook bug, verify resolved', 'business', 'Growth', 'shallow', 'me', null, 'open', null),
  ('Plaintext password collection in the old RE:Biz intake form, remediation status unknown', 'business', 'Risk', 'shallow', 'me', null, 'open', null),
  ('Competition law price signalling risk, not yet addressed, needs attorney', 'business', 'Risk', 'shallow', 'me', null, 'open', null),
  ('HelpLift real-data gate, still open while the platform is live and in testing', 'business', 'HelpLift', 'deep', 'me', null, 'open', null),
  ('Google Business Profile dispositions, awaiting Dewald''s confirmation', 'business', 'Risk', 'shallow', 'me', null, 'open', null),

  ('Fix the Moxie production pipeline so layout is print-ready and does not need hand repair in Adobe Express', 'business', 'Moxie', 'deep', 'me', null, 'open', null),
  ('Rebuild the SVC membership platform, onboarding is currently leaking users', 'business', 'SVC', 'deep', 'me', null, 'open', null),
  ('Moxie eMag, monthly, out on the 1st, recurring', 'business', 'Moxie', 'shallow', 'me', null, 'open', null),
  ('Brief Samantha on social media material and assets as a written handoff, not a conversation', 'business', 'SVC', 'shallow', 'me', null, 'open', null),

  ('Token disposition: revive, wind down publicly, or separate from the DigitalFlyer name', 'business', 'CBT', 'deep', 'date', null, 'open', null),
  ('Team page and CTO LinkedIn URL error on the whitepaper', 'business', 'CBT', 'shallow', 'me', null, 'open', null),

  ('Find where the Vowie domain is registered and who it is with', 'business', 'Vowie', 'shallow', 'me', null, 'open', null),
  ('Take down or repoint vowie.digitalflyer.biz, Facebook /vowieme and Instagram /vowie.us', 'business', 'Vowie', 'shallow', 'me', null, 'open', null),

  ('Write the three standing reply templates (I can, but X moves / I can, not before the 14th / I cannot)', 'business', 'Personal', 'shallow', 'me', null, 'open', null),
  ('Switch Jaco and Samantha from conversations to written handoffs', 'business', 'Personal', 'shallow', 'me', null, 'open', null),
  ('Go-away package, personal version: document, logins in a password manager with emergency contact set, one person told where it is', 'personal', 'Personal', 'shallow', 'me', null, 'open', null),
  ('Standing weekly grocery buy, no-cook items', 'personal', 'Personal', 'shallow', 'me', null, 'open', null),
  ('Stairs up as well as down', 'personal', 'Personal', 'shallow', 'me', null, 'open', null),

  ('Standing 365, published and selling in print and on Amazon, no marketing behind it', 'business', 'Standing 365', 'shallow', 'me', null, 'open', null),
  ('Standing 365 order management, decide how orders are taken and fulfilled', 'business', 'Standing 365', 'shallow', 'me', null, 'open', null),
  ('Sell Standing 365 through the Growth shop module, which also tests the shop with a real product', 'business', 'Standing 365', 'shallow', 'me', null, 'open', null),
  ('The novel, working titles Next 50 or Funeralable', 'personal', 'Personal', 'shallow', 'me', null, 'parked', 'Back in South Africa permanently'),

  ('KatisoBiz own chat and messenger layer as the WhatsApp alternative', 'business', 'KatisoBiz', 'shallow', 'me', null, 'parked', 'The Desk is public and members are asking for a mobile capture route'),

  ('FortisLex sprint approvals', 'business', 'FortisLex', 'shallow', 'FortisLex', current_date, 'open', null),
  ('SVC partnership negotiations', 'business', 'SVC', 'shallow', 'Jaco', current_date, 'open', null);

insert into public.desk_assets (name, type, provider, area, billing_cycle, status, where_login_lives, notes) values
  ('digitalflyer.com', 'domain', null, 'business', 'annual', 'unknown', 'unknown', 'Registrar and renewal date to confirm'),
  ('digitalflyer.biz', 'domain', null, 'business', 'annual', 'unknown', 'unknown', 'Registrar and renewal date to confirm'),
  ('vowie.digitalflyer.biz', 'domain', null, 'business', 'unknown', 'unknown', 'unknown', 'Provider unknown, this is the point'),
  ('Supabase', 'subscription', 'Supabase', 'business', 'monthly', 'active', 'unknown', null),
  ('Paystack', 'account', 'Paystack', 'business', 'once', 'active', 'unknown', 'Per-transaction fees, no monthly cost'),
  ('Anthropic', 'subscription', 'Anthropic', 'business', 'monthly', 'active', 'unknown', null),
  ('Meta Cloud API', 'account', 'Meta', 'business', 'once', 'active', 'unknown', 'Per-conversation charges'),
  ('Adobe Express', 'subscription', 'Adobe', 'business', 'monthly', 'active', 'unknown', null);
