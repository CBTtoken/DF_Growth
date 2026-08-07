-- KatisoBiz Jobs, Sprint 1 (scripts/spec-katisobiz-jobs.md; sprint plan
-- agreed 2026-08-06). Job seekers only this sprint: the CV builder,
-- candidate accounts, the anonymous browse layer, and retention. No
-- employer accounts, no vacancies, no billing -- those are Sprint 2.
--
-- Follows this repo's established migration conventions (see
-- 20260727100000_bizup_accounts.sql): no DB-level updated_at trigger, RLS
-- enabled on every table with per-operation policies, explicit
-- service_role grants at the end of each section.

-- ============================================================
-- Taxonomy (spec: "Which industry and skill taxonomy the database is
-- organised by... hard to change later." Agreed 2026-08-06: a curated flat
-- list built for the real South African job market, not an imported
-- ISCO/O*NET standard full of categories that don't apply here.)
-- ============================================================

create table public.jobs_taxonomy (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  category text not null
    check (category in (
      'trade', 'domestic', 'driving_logistics', 'security',
      'hospitality', 'retail', 'admin_office', 'general_labour', 'care'
    )),
  sort_order integer not null default 0
);

alter table public.jobs_taxonomy enable row level security;

-- A reference list, not personal data. Readable by anyone, including an
-- anonymous visitor filling in the CV builder before an account exists.
create policy "anyone reads jobs taxonomy"
  on public.jobs_taxonomy for select
  to anon, authenticated
  using (true);

-- No write policy. Changing the list is a deliberate act done in the SQL
-- editor, same posture as bizup_settings.
grant select, insert, update, delete on public.jobs_taxonomy to service_role;

insert into public.jobs_taxonomy (slug, label, category, sort_order) values
  ('electrician', 'Electrician', 'trade', 10),
  ('plumber', 'Plumber', 'trade', 20),
  ('painter', 'Painter', 'trade', 30),
  ('carpenter', 'Carpenter', 'trade', 40),
  ('bricklayer', 'Bricklayer', 'trade', 50),
  ('welder', 'Welder', 'trade', 60),
  ('mechanic', 'Mechanic', 'trade', 70),
  ('appliance_repair', 'Appliance repair', 'trade', 80),
  ('handyman', 'Handyman', 'trade', 90),
  ('domestic_worker', 'Domestic worker', 'domestic', 100),
  ('gardener', 'Gardener', 'domestic', 110),
  ('nanny_childminder', 'Nanny / childminder', 'care', 120),
  ('caregiver', 'Caregiver', 'care', 130),
  ('driver_code_8', 'Driver, code 8', 'driving_logistics', 140),
  ('driver_code_10_14', 'Driver, code 10/14', 'driving_logistics', 150),
  ('delivery_rider', 'Delivery rider', 'driving_logistics', 160),
  ('warehouse_general', 'Warehouse worker', 'driving_logistics', 170),
  ('security_guard', 'Security guard', 'security', 180),
  ('chef_cook', 'Chef / cook', 'hospitality', 190),
  ('waiter_waitress', 'Waiter / waitress', 'hospitality', 200),
  ('bartender', 'Bartender', 'hospitality', 210),
  ('hotel_housekeeping', 'Hotel housekeeping', 'hospitality', 220),
  ('cashier', 'Cashier', 'retail', 230),
  ('sales_assistant', 'Sales assistant', 'retail', 240),
  ('merchandiser', 'Merchandiser', 'retail', 250),
  ('receptionist', 'Receptionist', 'admin_office', 260),
  ('office_admin', 'Office admin', 'admin_office', 270),
  ('bookkeeper', 'Bookkeeper', 'admin_office', 280),
  ('call_centre_agent', 'Call centre agent', 'admin_office', 290),
  ('general_labourer', 'General labourer', 'general_labour', 300),
  ('construction_labourer', 'Construction labourer', 'general_labour', 310),
  ('cleaner', 'Cleaner', 'general_labour', 320);

-- ============================================================
-- Candidates (the CV, Sec "The CV builder is the product")
-- ============================================================

create table public.jobs_candidates (
  id uuid primary key default gen_random_uuid(),

  -- Nullable: building and downloading a CV needs no account at all (spec:
  -- "frictionless"). A draft row is created and edited via a signed cookie
  -- (see src/lib/jobs/draft-session.ts) until the person chooses to save
  -- progress or list themselves, at which point signup attaches this.
  owner_user_id uuid unique references auth.users (id) on delete cascade,

  full_name text,
  phone text,
  email text,
  -- Downscaled copy only; the spec requires the original discarded
  -- immediately on upload. No original-photo column exists anywhere.
  photo_path text,

  primary_role_id uuid references public.jobs_taxonomy (id) on delete set null,
  years_experience integer check (years_experience is null or years_experience between 0 and 60),
  suburb text,
  province text,

  availability text
    check (availability is null or availability in ('immediately', 'within_2_weeks', 'flexible')),

  -- Tags from jobs_taxonomy, stored as an array of slugs rather than a join
  -- table: a CV's skill list is read far more often than it is queried
  -- against, and it is edited as a whole unit by the conversation flow, not
  -- row by row.
  skills jsonb not null default '[]'::jsonb,
  -- Structured entries only: {employer, role, start, end, description}.
  -- Never a single free-text blob -- the CV builder asks one question per
  -- field, it does not hand someone a box.
  work_history jsonb not null default '[]'::jsonb,
  summary text,

  -- Alerts preference for a future sprint (spec: "A job seeker who ticked
  -- electrician and Boksburg is told when an electrician job appears in
  -- Boksburg"). Captured now, acted on once vacancies exist in Sprint 2.
  alert_role_id uuid references public.jobs_taxonomy (id) on delete set null,
  alert_area text,

  -- Whether this CV appears in the anonymous browse layer. Building a CV
  -- never auto-lists someone; this is a separate, explicit choice.
  listed boolean not null default false,

  -- Where the conversation is up to, so closing the tab and coming back
  -- resumes exactly where they left off.
  cv_step text not null default 'name',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index jobs_candidates_listed_idx on public.jobs_candidates (primary_role_id, suburb)
  where listed = true and deleted_at is null;

alter table public.jobs_candidates enable row level security;

-- Self-service only, matching bizup_accounts's policy shape exactly. No
-- anonymous select policy exists on this table under any circumstance --
-- the anonymous browse layer reads through the service-role admin client
-- from a Server Component and selects only the non-identifying columns by
-- name, never through a client-facing query against this table.
create policy "candidates read own cv"
  on public.jobs_candidates for select
  to authenticated
  using (owner_user_id = auth.uid());

create policy "candidates create own cv"
  on public.jobs_candidates for insert
  to authenticated
  with check (owner_user_id = auth.uid());

create policy "candidates update own cv"
  on public.jobs_candidates for update
  to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

-- No delete policy. Deletion goes through a Server Action using the
-- service role, because it must also write the stripped survivor row to
-- jobs_candidate_deletion_log in the same operation -- a bare client-side
-- DELETE could remove the CV without ever recording the demand data.

grant select, insert, update, delete on public.jobs_candidates to service_role;

-- ============================================================
-- Deletion log (spec: "Split the record the same way as the WhatsApp
-- inbox: the listing is on a clock, and a stripped line with role, area,
-- date and outcome survives indefinitely as demand data with nothing
-- identifying on it.")
-- ============================================================

create table public.jobs_candidate_deletion_log (
  id uuid primary key default gen_random_uuid(),
  role_label text,
  area text,
  deleted_at timestamptz not null default now(),
  outcome text
);

alter table public.jobs_candidate_deletion_log enable row level security;

-- No policies for authenticated or anon. Nothing identifying lives here,
-- but there is still no reason for a member's own session to read it.
grant select, insert on public.jobs_candidate_deletion_log to service_role;

-- ============================================================
-- Reports (spec: "Report button on every listing, feeding the same
-- moderation queue as the Board.")
-- ============================================================

create table public.jobs_reports (
  id uuid primary key default gen_random_uuid(),
  -- Room to grow (a future 'vacancy' target in Sprint 2); only 'candidate'
  -- exists this sprint.
  target_type text not null check (target_type in ('candidate')),
  -- No FK, deliberately, mirroring board_reports: a report must outlive
  -- whatever it describes, including a CV deleted after being reported.
  target_id uuid not null,
  reason text,
  status text not null default 'open' check (status in ('open', 'dismissed')),
  created_at timestamptz not null default now()
);

create index jobs_reports_open_idx on public.jobs_reports (status, created_at desc)
  where status = 'open';

alter table public.jobs_reports enable row level security;

-- No policies at all. A report is only ever written by a Server Action
-- through the service role, after a Turnstile check -- never a direct
-- client insert, so there is nothing for an RLS policy to authorise.
grant select, insert, update on public.jobs_reports to service_role;

-- ============================================================
-- Moderation log (same shape as board_moderation_log, append-only)
-- ============================================================

create table public.jobs_moderation_log (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id uuid not null,
  action text not null,
  rule text not null,
  actor text not null,
  note text,
  created_at timestamptz not null default now()
);

create index jobs_moderation_log_target_idx on public.jobs_moderation_log (target_type, target_id, created_at desc);

alter table public.jobs_moderation_log enable row level security;

grant select, insert on public.jobs_moderation_log to service_role;
