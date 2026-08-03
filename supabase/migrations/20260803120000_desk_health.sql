-- The Desk health check (TheDesk/Handoff_Desk_HealthCheck.md).
--
-- One operator runs six live systems across Vercel, Supabase, Cloudflare,
-- GitHub, Resend, Paystack and Meta. Checking all of them by hand means
-- logging into seven places, so it does not happen. This is the tripwire and
-- the status board that replaces that.
--
-- It is not breach detection and the interface must never imply it is. A
-- competent intruder does not trip a cron job written by the person they are
-- burgling. Section 2 of the handoff is explicit and the copy rules in
-- section 7 follow from it: report facts, never reassurance.

create table if not exists public.desk_health_runs (
  id uuid primary key default gen_random_uuid(),
  -- The check's stable identifier, for example "vercel_spend". Results are
  -- compared to the previous run of the same name, which is how change
  -- detection works at all.
  check_name text not null,
  category text not null check (category in ('usage', 'availability', 'change', 'backup')),
  status text not null check (status in ('ok', 'warn', 'fail', 'unknown')),
  -- One sentence a person can read. This is what the screen shows, so it
  -- carries the number rather than making somebody open the raw value.
  result text not null,
  -- Whatever the provider actually returned, kept so a later run can compare
  -- and so a surprising result can be argued with rather than trusted.
  raw jsonb,
  ran_at timestamptz not null default now()
);

-- Every read is either "the newest run of each check" or "this check over
-- time", and both want the same index.
create index if not exists desk_health_runs_check_time_idx
  on public.desk_health_runs (check_name, ran_at desc);

create index if not exists desk_health_runs_time_idx
  on public.desk_health_runs (ran_at desc);

comment on table public.desk_health_runs is
  'One row per check per run. History is kept on purpose: a number that moved is more useful than a number, and change detection has nothing to compare against without it.';

comment on column public.desk_health_runs.status is
  'unknown means the provider exposes no readable API, or the token for it is missing. It never means fine. The handoff is explicit that a guess is worse than an admission.';

-- Section 3: same Supabase project, same auth, same single user. RLS on to
-- match every other desk_ table, with no policies, because everything here
-- is read and written by the service role from server code that has already
-- checked the one permitted user.
alter table public.desk_health_runs enable row level security;

grant select, insert, update, delete on public.desk_health_runs to service_role;

-- Section 5.4: a backup that has never been restored is not a backup. This
-- records the restore attempts specifically, separately from the daily
-- checks, because it runs weekly and its history answers a different
-- question: when did a restore last actually work.
create table if not exists public.desk_backup_restores (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  -- 'full' restored data and counted rows. 'schema_only' did not, and must
  -- never be reported as a pass (section 5.4, criterion 9).
  kind text not null check (kind in ('full', 'schema_only')),
  succeeded boolean not null default false,
  -- {"growth_clients": 41, "shop_orders": 3, ...} at the time of the restore,
  -- against live, so a restore that completes but produces an empty database
  -- is caught rather than celebrated.
  row_counts jsonb,
  notes text
);

create index if not exists desk_backup_restores_time_idx
  on public.desk_backup_restores (started_at desc);

comment on table public.desk_backup_restores is
  'Restore attempts, not backups. Age of the most recent success is what the health check reports, and older than eight days is a fail.';

alter table public.desk_backup_restores enable row level security;

grant select, insert, update, delete on public.desk_backup_restores to service_role;
