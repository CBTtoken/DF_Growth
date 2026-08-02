-- The Desk v2. Streams, ventures with end states, recurrence, and the
-- go-away section. Written from a day of real use, not from planning.
--
-- Nothing here touches a table outside the desk_ prefix.

-- Stream sits above venture and answers one question the operator asked for
-- directly: how much of his capacity goes into other people's businesses
-- versus his own.
alter table public.desk_items
  add column stream text not null default 'own' check (stream in ('own', 'client', 'life'));

-- Recurrence exists for one concrete need: a monthly platform check that
-- must come back on its own or it will not happen.
alter table public.desk_items
  add column recurrence text not null default 'none'
    check (recurrence in ('none', 'weekly', 'monthly', 'quarterly', 'annually'));

create index desk_items_stream_idx on public.desk_items (stream, venture);

-- A venture is a thing being built, and the only field that matters on it is
-- what "done" looks like. Deliberately no priority and no urgency: everything
-- becomes urgent within a fortnight and the field stops meaning anything.
create table public.desk_ventures (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  stream text not null default 'own' check (stream in ('own', 'client', 'life')),
  end_state text,
  status text not null default 'active' check (status in ('active', 'parked', 'killed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The go-away section. Free text under headings he names himself, personal
-- only, nothing structured and nothing clever.
--
-- No credential ever goes in here. That is enforced by there being no field
-- for one, by the app never asking for one, and by this comment surviving
-- longer than the conversation that produced it.
create table public.desk_notes (
  id uuid primary key default gen_random_uuid(),
  heading text not null,
  body text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.desk_notes is
  'Go-away section. Plain words for the operator''s family. Never credentials.';

alter table public.desk_ventures enable row level security;
alter table public.desk_notes enable row level security;

grant select, insert, update, delete on public.desk_ventures to service_role;
grant select, insert, update, delete on public.desk_notes to service_role;

-- ---------------------------------------------------------------------------
-- Data, part one: retire the Risk tag.
--
-- "Risk" was mine, not his. I invented it when seeding v1 to hold the
-- cross-cutting items, and under v2 every venture needs an end state, which a
-- bucket called Risk cannot have. Company-wide items move to a real venture,
-- DigitalFlyer SA, and the rest go to the product they actually belong to.
-- ---------------------------------------------------------------------------

update public.desk_items set venture = 'DigitalFlyer SA' where id::text like '4dbda038%'; -- competition law
update public.desk_items set venture = 'DigitalFlyer SA' where id::text like '47d57b2a%'; -- Google Business Profile
update public.desk_items set venture = 'DigitalFlyer SA' where id::text like 'fad7c791%'; -- Paystack collision
update public.desk_items set venture = 'DigitalFlyer SA' where id::text like 'e58bcf4b%'; -- RE:Biz plaintext passwords
update public.desk_items set venture = 'Growth'          where id::text like '94b60683%'; -- Netcash migration

-- ---------------------------------------------------------------------------
-- Data, part two: give yesterday's 28 captures a venture.
--
-- Every one of these is his own text, untouched. Only the venture is set.
-- ---------------------------------------------------------------------------

update public.desk_items set venture = 'Growth' where id::text like any (array[
  '5c1d3acb%', -- CIPC verification at signup
  '3f04f115%', -- cold list marketing engine
  '17df8e97%', -- dual name display
  '3c77ea57%', -- blogging option
  '5163ae36%', -- auto emailer rewrite
  '68e11bf9%', -- booking options description
  '61c14d89%', -- product dimensions not compulsory
  'f2ab1823%', -- home page shop and booking
  '3873a616%', -- booking time slots
  '5b4f5783%', -- product pages
  'e5308e10%', -- product images
  'af801698%', -- shop setup page
  'a927e092%', -- emailer to old members
  '7bab8f03%'  -- early warning on scalability
]);

update public.desk_items set venture = 'KatisoBiz' where id::text like any (array[
  'df2ccc00%', -- own messenger layer
  '9623bda6%'  -- registration number on the invoice template
]);

update public.desk_items set venture = 'DigitalFlyer SA' where id::text like any (array[
  '814c4639%', -- company registration as a service
  'bf64e71f%', -- who registered digitalflyer.biz
  '6951f160%', -- unblock the compiler binary
  'e099a20f%', -- personal profile doc out of date
  'cd80a0d1%', -- 2FA and access audit
  '4e41d843%'  -- our own security
]);

update public.desk_items set venture = 'Desk'     where id::text like any (array['36018a7b%', 'e3b2a878%']);
update public.desk_items set venture = 'WhatsApp' where id::text like '215ba4ef%';
update public.desk_items set venture = 'Moxie'    where id::text like 'f38acb1d%';
update public.desk_items set venture = 'Personal' where id::text like any (array['98b8aa6d%', 'a99c8f0a%']);

-- ---------------------------------------------------------------------------
-- Data, part three: the stream, derived from the venture.
-- ---------------------------------------------------------------------------

update public.desk_items set stream = 'client'
  where venture in ('SVC', 'Moxie', 'FortisLex', 'Alite');

update public.desk_items set stream = 'life'
  where venture = 'Personal' or area = 'personal';

update public.desk_items set stream = 'own'
  where stream not in ('client', 'life')
    and (venture is null or venture not in ('SVC', 'Moxie', 'FortisLex', 'Alite', 'Personal'));

-- ---------------------------------------------------------------------------
-- Data, part four: statuses he wrote inside his own captures.
--
-- v1 had no way to park or kill something at the moment of capture, so he
-- typed it into the title instead. The words in the triggers below are lifted
-- from his own text, not written by me. Titles stay exactly as typed.
-- ---------------------------------------------------------------------------

update public.desk_items
  set status = 'parked', park_trigger = 'The Desk is public'
  where id::text like 'df2ccc00%';

update public.desk_items
  set status = 'parked', park_trigger = 'Switchboard live with real traffic'
  where id::text like '215ba4ef%';

update public.desk_items
  set status = 'killed', killed_at = now(), notes = 'POPIA section 69 and the Google Places terms'
  where id::text like '3f04f115%';

-- The duplicate. His own capture says the same thing as the row I seeded from
-- his written record, so the seeded one goes and his words stay.
delete from public.desk_items where id::text like 'c74bc1ca%';

-- ---------------------------------------------------------------------------
-- Data, part five: the seed additions from section 10 that are genuinely new.
--
-- Sections 10.1 and 10.2 (2FA, access audit) are already in his own words at
-- cd80a0d1, and 10.9 (Desk v3, MCP) at e3b2a878, so those are not duplicated
-- here. The park trigger for v3 is applied to his row instead.
-- ---------------------------------------------------------------------------

update public.desk_items
  set status = 'parked', park_trigger = 'Seven consecutive days of opening The Desk'
  where id::text like 'e3b2a878%';

insert into public.desk_items (title, area, stream, venture, effort, status, park_trigger, recurrence) values
  ('Confirm a Supabase database dump restores cleanly, then keep it', 'business', 'own', 'DigitalFlyer SA', 'deep', 'open', null, 'none'),
  ('Do not run long jobs inside a Vercel function, Kwaai Press PDF rendering is the first case', 'business', 'own', 'Kwaai Press', 'deep', 'open', null, 'none'),
  ('Check domain availability for Kwaai Press', 'business', 'own', 'Kwaai Press', 'shallow', 'open', null, 'none'),
  ('Check CIPC and the trade marks register for anything similar', 'business', 'own', 'Kwaai Press', 'shallow', 'open', null, 'none'),
  ('Record Kwaai Press as the canonical name in the master reference before anything else picks it up', 'business', 'own', 'Kwaai Press', 'shallow', 'open', null, 'none'),
  ('Kwaai Press as a rentable product for other publications', 'business', 'own', 'Kwaai Press', 'deep', 'parked', 'Three Moxie issues shipped through it', 'none'),
  ('Go-away package, product version for others', 'personal', 'life', 'Personal', 'deep', 'parked', 'Attorney input on custodian and access process', 'none'),
  ('Platform check: Vercel spend, Supabase database size and usage, confirm a database dump restores', 'business', 'own', 'DigitalFlyer SA', 'shallow', 'open', null, 'monthly');

-- The platform check is the one item that has to come back on its own. First
-- run in the first week of next month.
update public.desk_items
  set due_date = date_trunc('month', current_date + interval '1 month')::date + 2
  where recurrence = 'monthly' and title like 'Platform check:%';

-- ---------------------------------------------------------------------------
-- Data, part six: the ventures themselves.
--
-- The end states are drafts, written from his own items so the field is not
-- staring at him empty. Every one is editable and meant to be rewritten in
-- his words.
-- ---------------------------------------------------------------------------

insert into public.desk_ventures (name, stream, end_state, status) values
  ('DigitalFlyer SA', 'own', 'The company itself is tidy: one payment account per product, 2FA everywhere, no legacy system holding data nobody owns.', 'active'),
  ('Growth', 'own', 'A member can sign up, build a page, take a booking and sell a product without me touching anything.', 'active'),
  ('KatisoBiz', 'own', 'A member quotes, invoices and gets paid, and the client can approve or decline without phoning anyone.', 'active'),
  ('Board', 'own', 'Local people post and answer each other without me seeding it, and retention is settled and audited.', 'active'),
  ('WhatsApp', 'own', 'One number answers sales and support, routes a trade job to a provider, and nobody waits on me to reply.', 'active'),
  ('HelpLift', 'own', 'Live with real users on real data, and the data gate closed behind it.', 'active'),
  ('CBT', 'own', 'The token is either revived on purpose or wound down publicly, with the DigitalFlyer name clear of it either way.', 'active'),
  ('Vowie', 'own', 'Every Vowie property is found, taken down or repointed, and nothing of it is still live under my name.', 'active'),
  ('Desk', 'own', 'I open it every day without deciding to, and nothing important lives only in my head.', 'active'),
  ('Kwaai Press', 'own', 'A publication goes from manuscript to printed and digital issue through the press, with no hand repair in between.', 'active'),
  ('Standing 365', 'own', 'The book sells through my own shop, orders fulfil without me, and there is marketing behind it.', 'active'),
  ('SVC', 'client', 'Their platform is rebuilt, onboarding stops leaking, and the work between us is written down rather than talked through.', 'active'),
  ('Moxie', 'client', 'An issue ships on the first of the month, print-ready, without me rebuilding the layout by hand.', 'active'),
  ('FortisLex', 'client', 'The sprints are approved and delivered, and approvals stop being the thing that blocks the work.', 'active'),
  ('Alite', 'client', 'Not started. Write what done looks like before any work goes into it.', 'active'),
  ('Personal', 'life', 'The go-away package exists, the recurring things are on rails, and my body and family are not what gets cut first.', 'active');

-- Two headings to start the go-away section, so the screen is not empty. The
-- content is his to write.
insert into public.desk_notes (heading, body, position) values
  ('Where the important documents are', '', 0),
  ('Who to contact first', '', 1),
  ('What happens to each business', '', 2);
