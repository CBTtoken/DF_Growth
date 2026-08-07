-- The permission-based marketing database.
--
-- Replaces "a spreadsheet we send from". The difference that matters is
-- provenance: every contact records where it came from and on what basis, so
-- a POPIA section 18 request ("where did you get my details") has a real
-- answer, and ECTA section 45 ("disclose the source on request") is a lookup
-- rather than a guess.
--
-- Rules Dewald set, 31 July 2026:
--   any bounce means gone, permanently
--   one-click unsubscribe in every email, honoured forever
--   nothing may send to an address on the suppression list, ever

create table public.marketing_contacts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,

  contact_name text,
  business_name text,
  mobile text,
  industry text,
  city text,

  -- Where this came from, in words a person would accept as an answer.
  -- Not an enum: the honest answer varies and a free text field that is
  -- always filled beats a category that is usually "other".
  source text not null,
  -- When we obtained it, which is what a complaint will ask about.
  sourced_at timestamptz,

  -- 'cold' has never been contacted or consented.
  -- 'contacted' has had the one consent-request email POPIA allows.
  -- 'consented' has actively opted in and may be marketed to.
  -- 'declined' said no. Kept so we never ask twice.
  status text not null default 'cold'
    check (status in ('cold', 'contacted', 'consented', 'declined')),

  consented_at timestamptz,
  consent_source text,
  contacted_at timestamptz,

  -- Deliverability, from the DNS check at import time.
  domain_status text check (domain_status in ('mx', 'a-only', 'dead', 'unknown')),

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index marketing_contacts_status_idx on public.marketing_contacts (status);

create index marketing_contacts_industry_idx on public.marketing_contacts (industry);

create index marketing_contacts_city_idx on public.marketing_contacts (city);

-- The suppression list is deliberately a separate table, not a column.
--
-- A flag on the contact row can be lost when a row is deleted, re-imported or
-- merged, and the whole point of a suppression is that it must survive all
-- three. This table is the one thing every send checks, and nothing ever
-- deletes from it.
create table public.marketing_suppressions (
  email text primary key,
  reason text not null check (reason in ('unsubscribed', 'bounced', 'complained', 'manual', 'invalid')),
  detail text,
  suppressed_at timestamptz not null default now()
);

comment on table public.marketing_suppressions is
  'Permanent. Never delete from this table. Every marketing send must check it first.';

-- Anything already suppressed anywhere else on the platform starts suppressed
-- here too. A member who unsubscribed from Growth has said no to us, and that
-- answer does not reset because the address arrived in a different list.
insert into public.marketing_suppressions (email, reason, detail)
select lower(contact_email), 'unsubscribed', 'Unsubscribed as a Growth member'
from public.growth_clients
where email_unsubscribed_at is not null and contact_email is not null
on conflict (email) do nothing;

insert into public.marketing_suppressions (email, reason, detail)
select lower(contact_email), 'bounced', 'Bounced as a Growth member'
from public.growth_clients
where email_bounced_at is not null and contact_email is not null
on conflict (email) do nothing;

alter table public.marketing_contacts enable row level security;

alter table public.marketing_suppressions enable row level security;

-- Read and written only through the admin client, same as page_views and
-- lead_events. The grant is not optional and not implied: a new table gets
-- service_role nothing by default on this project, and the failure mode is a
-- silently empty list rather than an error.
grant select, insert, update on public.marketing_contacts to service_role;

grant select, insert on public.marketing_suppressions to service_role;
