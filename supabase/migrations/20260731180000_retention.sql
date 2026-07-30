-- Data retention, settled by Dewald on 30 July 2026 and the last thing
-- standing between Phase 2 and Phase 3 of The Board.
--
-- The three contradictory positions in the record are now one:
--
--   Growth        12 months after an account ends, which is exactly what
--                 the published privacy policy already says, so the code
--                 and the policy agree without republishing anything.
--   KatisoBiz     5 years, protected. Financial records, SARS. Nothing in
--                 this system ever deletes a bizup_ row automatically, and
--                 the published policy's "except where we are required by
--                 law to keep it longer" already covers it.
--   The public    12 months after their last activity, for people who only
--                 ever verified an email to leave a comment.
--
-- What was actually there before today: nothing. Two columns from 25 July
-- for a 60-day warning email flow that was never written, and no deletion
-- code of any kind. The policy promised 12 months and nothing enforced it.
-- That is what the handoff meant by "the code has never been audited
-- against any of them".

-- When an account stopped being an account. Retention counts from here,
-- not from created_at, so a member of four years who cancels today is kept
-- for twelve months from today.
--
-- Null for every existing row on purpose. Backfilling it from created_at
-- would make old cancelled accounts instantly overdue, and deleting real
-- member data on the strength of a guessed date is not a thing to do
-- quietly. Those are listed separately in the admin screen as "date
-- unknown" and need a human to decide.
alter table public.growth_clients
  add column if not exists ended_at timestamptz;

comment on column public.growth_clients.ended_at is
  'When this account stopped being active. The 12 month Growth retention clock runs from here. Null means either still active, or ended before this column existed.';

-- Set going forward by the cancellation paths in the app. Backfilled here
-- only for rows that already carry a definite end date of their own,
-- which is none today, but the statement is idempotent and documents the
-- intent for anyone replaying these migrations.
update public.growth_clients
set ended_at = now()
where status = 'cancelled'
  and ended_at is null
  and false;

-- Every run, what it looked at and what it removed. POPIA compliance is
-- not a policy document, it is being able to show that the policy actually
-- runs, so this is the evidence.
create table public.retention_runs (
  id uuid primary key default gen_random_uuid(),
  ran_at timestamptz not null default now(),
  -- 'report' is a dry run that changed nothing. 'delete' actually removed.
  mode text not null check (mode in ('report', 'delete')),
  actor text not null,
  -- What was due, by category, and what was done about it.
  summary jsonb not null,
  created_at timestamptz not null default now()
);

create index retention_runs_recent_idx on public.retention_runs (ran_at desc);

alter table public.retention_runs enable row level security;
grant select, insert on public.retention_runs to service_role;
