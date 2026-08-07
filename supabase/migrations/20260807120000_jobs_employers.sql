-- KatisoBiz Jobs, Sprint 2: the employer side (scripts/spec-katisobiz-jobs.md;
-- pricing settled with Dewald 2026-08-07: paying Growth/KatisoBiz members
-- post free and unlimited, non-members get one free post ever, then R45/mo
-- for 5 posts a month or R69/mo unlimited, with a 2-week grace after a
-- subscription lapses).
--
-- House conventions per 20260727100000_bizup_accounts.sql: no DB-level
-- updated_at trigger, RLS on every table with per-operation policies,
-- explicit grants per table (this project does not rely on Postgres
-- default privileges, see 20260708130000_grant_api_roles.sql).

-- ============================================================
-- Employers (spec: "Registration is one step. Cell number and business
-- name. Free forever, no verification wall before they can look.")
-- ============================================================

create table public.jobs_employers (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique references auth.users (id) on delete restrict,
  business_name text not null,
  phone text,
  email text not null,

  -- The paid tier only. Member entitlement (paying Growth/KatisoBiz) is
  -- DERIVED at read time via owner_user_id, never stored here: storing it
  -- would freeze a snapshot that goes stale the day their other
  -- subscription lapses (the plan/plan_source lesson from
  -- lib/bizup/entitlements.ts).
  plan text not null default 'free'
    check (plan in ('free', 'starter', 'unlimited')),

  -- Set by the webhook on subscription.disable. The 2-week grace clock:
  -- while set, no new posts; 14 days later the cron removes their live
  -- vacancies and reverts plan to free. Cleared by a successful charge.
  plan_lapsed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.jobs_employers enable row level security;

create policy "employers read own account"
  on public.jobs_employers for select
  to authenticated
  using (owner_user_id = auth.uid());

create policy "employers create own account"
  on public.jobs_employers for insert
  to authenticated
  with check (owner_user_id = auth.uid());

create policy "employers update own account"
  on public.jobs_employers for update
  to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

-- No delete policy: an employer account holds billing history context and
-- moderation history; removal is a deliberate act, not a self-service tap.

grant select, insert, update on public.jobs_employers to authenticated;
grant select, insert, update, delete on public.jobs_employers to service_role;

-- ============================================================
-- Vacancies (spec: structural moderation, 30-day clock, one-tap renew,
-- auto-hold on any post asking a candidate for money)
-- ============================================================

create table public.jobs_vacancies (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.jobs_employers (id) on delete cascade,

  role_id uuid references public.jobs_taxonomy (id) on delete set null,
  other_role_text text,
  title text not null,
  description text not null,
  suburb text not null,
  province text not null,
  employment_type text not null
    check (employment_type in ('full_time', 'part_time', 'contract', 'temp')),
  -- Short free text ("R8000 a month", "Negotiable"), sanitized app-side.
  pay_text text,

  -- 'held' is the auto-hold outcome: out of public view, waiting for a
  -- person, never auto-removed (the Board's judgement rule).
  status text not null default 'published'
    check (status in ('published', 'held', 'removed', 'expired')),
  held_reason text,

  expires_at timestamptz not null,
  last_renewed_at timestamptz,
  expiry_reminder_sent_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Browse and cron are the two hot paths.
create index jobs_vacancies_browse_idx on public.jobs_vacancies (status, expires_at);
create index jobs_vacancies_role_idx on public.jobs_vacancies (role_id, province) where status = 'published';
create index jobs_vacancies_employer_idx on public.jobs_vacancies (employer_id, created_at desc);

alter table public.jobs_vacancies enable row level security;

-- Zero policies, deliberately (board_posts posture): public pages render
-- server-side through the service role selecting named columns, and every
-- employer write goes through a Server Action that checks ownership and
-- entitlement before touching the row.

grant select, insert, update, delete on public.jobs_vacancies to service_role;

-- ============================================================
-- Billing events (idempotency by unique paystack_reference, exactly
-- bizup_billing_events' role in the shared webhook)
-- ============================================================

create table public.jobs_billing_events (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.jobs_employers (id) on delete restrict,
  paystack_reference text not null unique,
  kind text not null check (kind in ('subscription', 'renewal')),
  plan text check (plan in ('starter', 'unlimited')),
  amount_cents integer not null default 0,
  created_at timestamptz not null default now()
);

create index jobs_billing_events_employer_idx on public.jobs_billing_events (employer_id, created_at desc);

alter table public.jobs_billing_events enable row level security;

-- Money records: written by the webhook through the service role only.
grant select, insert on public.jobs_billing_events to service_role;

-- ============================================================
-- Full-record views (spec: "Every full-record view logged against the
-- employer account that made it... You will see the account that pulled
-- 400 records in an hour and kill it.")
-- ============================================================

create table public.jobs_record_views (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.jobs_employers (id) on delete restrict,
  -- Plain uuid, no FK: the log must outlive the CV it describes, same
  -- reasoning as board_reports' loose target_id.
  candidate_id uuid not null,
  created_at timestamptz not null default now()
);

create index jobs_record_views_employer_idx on public.jobs_record_views (employer_id, created_at desc);

alter table public.jobs_record_views enable row level security;

-- Append-only, service-role only. Do not widen this grant: if the same
-- role that writes the log can edit it, it proves nothing
-- (bizup_audit_log's own rule).
grant select, insert on public.jobs_record_views to service_role;

-- ============================================================
-- Vacancy outcomes (the stripped demand line that survives purge:
-- role, area, dates, outcome, nothing identifying)
-- ============================================================

create table public.jobs_vacancy_outcomes (
  id uuid primary key default gen_random_uuid(),
  role_label text,
  area text,
  posted_at timestamptz,
  removed_at timestamptz not null default now(),
  outcome text
);

alter table public.jobs_vacancy_outcomes enable row level security;

grant select, insert on public.jobs_vacancy_outcomes to service_role;

-- ============================================================
-- Reports now cover vacancies too
-- ============================================================

alter table public.jobs_reports drop constraint if exists jobs_reports_target_type_check;
alter table public.jobs_reports
  add constraint jobs_reports_target_type_check
  check (target_type in ('candidate', 'vacancy'));
