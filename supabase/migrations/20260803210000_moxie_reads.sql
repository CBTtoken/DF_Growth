-- Moxie owner analytics, 3 August 2026: who is actually reading.
--
-- One row per opening of an edition's reader, written server-side on
-- render. No cookies, no fingerprinting, no IP: a signed-in reader is
-- recorded by user id, an anonymous one (access code or a future public
-- window) as null. That is deliberately all it can say, which keeps it a
-- circulation count rather than surveillance.
--
-- History starts the day this table lands. The dashboard says so rather
-- than pretending the past was counted.
create table public.moxie_reads (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.moxie_editions (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  -- Why the door opened: free_window, membership, purchase, access_code.
  access_reason text not null,
  created_at timestamptz not null default now()
);

create index moxie_reads_edition_idx on public.moxie_reads (edition_id, created_at desc);
create index moxie_reads_user_idx on public.moxie_reads (user_id) where user_id is not null;

alter table public.moxie_reads enable row level security;

-- The same rule every table on this project has to state out loud: a new
-- table grants service_role nothing by default, and the failure is silent.
grant select, insert on public.moxie_reads to service_role;
