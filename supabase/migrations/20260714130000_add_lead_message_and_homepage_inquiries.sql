-- Public Beta Polish Sprint Sec 5: "Get in Touch" gets a message field.
-- Client-page submissions extend the existing leads table (they're already
-- tied to a growth_client_id). Homepage submissions are about DigitalFlyer
-- itself, not any specific client, so they get their own table rather than
-- awkwardly forcing a nullable growth_client_id onto leads.
alter table public.leads add column message text;

create table public.homepage_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  message text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.homepage_inquiries enable row level security;

-- Public form submits via the service-role client (same pattern as leads),
-- and only the admin panel (also service-role) ever reads these back — no
-- authenticated end-user role ever needs direct table access, so no policy
-- is defined here beyond enabling RLS (default-deny for anon/authenticated).
grant select, insert, update on public.homepage_inquiries to service_role;
