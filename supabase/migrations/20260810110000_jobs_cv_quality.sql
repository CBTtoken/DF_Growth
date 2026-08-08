-- KatisoBiz Jobs: CV quality, five templates, and AI credits.
-- Handoff scripts/handoff-jobs-cv-quality-templates-credits.md, 8 August 2026.
--
-- Everything here is additive except one CHECK constraint that has to be
-- widened for the new template list. No column is dropped and no row is
-- rewritten beyond the single 'bold' -> 'amber' rename, which is a
-- straight successor: both are the band-across-the-top look.

-- ---------------------------------------------------------------
-- 1. Education and certifications
-- ---------------------------------------------------------------
-- These did not exist anywhere in the product. The handoff assumes they
-- do: Job 2's checklist has "education present", Job 3 lists Education
-- and Certifications among the five standard headings, the Trades
-- template is built entirely around putting tickets and licences above
-- work experience, and acceptance criterion 14 tests a CV that has
-- neither. None of that is buildable against a schema with no such
-- fields, so they are added here.
--
-- Structured entries, never a free-text blob, same rule as work_history:
--   education:      {qualification, institution, year, completed}
--   certifications: {name, issuer, year}

alter table public.jobs_candidates
  add column if not exists education jsonb not null default '[]'::jsonb,
  add column if not exists certifications jsonb not null default '[]'::jsonb;

comment on column public.jobs_candidates.education is
  'Structured entries: {qualification, institution, year, completed}. Optional, skippable in one tap. Renders as the Education section; an empty array renders no heading at all.';

comment on column public.jobs_candidates.certifications is
  'Structured entries: {name, issuer, year}. Tickets, licences and short courses. On the Trades template these sit above work experience, because for an artisan the ticket is the qualifier.';

-- ---------------------------------------------------------------
-- 2. Impact facts on a work entry
-- ---------------------------------------------------------------
-- work_history is already jsonb, so the new `impacts` key needs no DDL.
-- The comment is updated so the shape stays documented where somebody
-- reading the schema will find it.

comment on column public.jobs_candidates.work_history is
  'Structured entries: {employer, role, start, end, current, description, impacts}. `impacts` is up to three short lines the person typed in answer to "What can you put a number to in this job?" -- their own words and their own numbers. No number may ever reach a generated bullet that does not appear here or in the description.';

-- ---------------------------------------------------------------
-- 3. The five templates
-- ---------------------------------------------------------------
-- Widening a CHECK, and renaming one value. 'bold' becomes 'amber': the
-- old Bold skin and the new Amber skin are the same idea (a filled band
-- across the top of page one), so every person who chose Bold keeps the
-- look they chose rather than being silently reset to the default.

alter table public.jobs_candidates
  drop constraint if exists jobs_candidates_cv_template_check;

update public.jobs_candidates set cv_template = 'amber' where cv_template = 'bold';

alter table public.jobs_candidates
  add constraint jobs_candidates_cv_template_check
  check (cv_template in ('plain', 'clean', 'amber', 'compact', 'trades'));

-- ---------------------------------------------------------------
-- 4. Where the CV is going, and the free AI allowance
-- ---------------------------------------------------------------
-- cv_purpose remembers the answer to "Where are you sending this CV?" so
-- a returning person is not asked the same question every download. It is
-- a nudge, never a lock: every template and both formats stay downloadable
-- whatever this says, so it carries no permission and needs no CHECK
-- beyond keeping the value recognisable.

alter table public.jobs_candidates
  add column if not exists cv_purpose text
  check (cv_purpose is null or cv_purpose in ('portal', 'email', 'print'));

comment on column public.jobs_candidates.cv_purpose is
  'Last answer to "Where are you sending this CV?": portal, email or print. Preselects a recommended format and template on the download step. A nudge only, never a lock.';

-- ---------------------------------------------------------------
-- 5. Credits
-- ---------------------------------------------------------------
-- R45 buys 5 rebuilds. One row per person, holding both the balance and
-- the free-allowance counter, because the handoff's free two turns are
-- per person (Dewald, 8 August 2026) rather than per CV: a per-CV counter
-- resets the moment somebody starts a second CV, so it caps nothing.
--
-- jobs_candidates.ai_write_count stays where it is and keeps counting for
-- anonymous drafts, which have no person to count against yet. It is
-- carried into this table when a draft is claimed by a new account.

create table if not exists public.jobs_ai_credits (
  owner_user_id uuid primary key references auth.users (id) on delete cascade,
  -- Never negative: every spend path checks first, and this is the
  -- backstop that turns a race into a failed write rather than a debt.
  balance integer not null default 0 check (balance >= 0),
  free_writes_used integer not null default 0 check (free_writes_used >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.jobs_ai_credits is
  'Rebuild credits per job seeker. R45 buys 5, they never expire, and building, downloading, editing, importing and applying never touch this table. free_writes_used counts the two free Write with AI turns, which are per person rather than per CV.';

-- The ledger: credits purchased, credits spent, what each was spent on.
-- Deliberately append-only in practice (nothing in the app updates or
-- deletes a row) so the balance above can always be re-derived and
-- checked against it.
create table if not exists public.jobs_ai_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  -- Positive on purchase, negative on spend. Never zero.
  delta integer not null check (delta <> 0),
  -- 'purchase' | 'tailor' | 'rebuild' | 'refund_failed_generation'
  reason text not null,
  -- What it was spent on, in plain words, for the person's own ledger view.
  detail text,
  candidate_id uuid references public.jobs_candidates (id) on delete set null,
  -- The Paystack reference on a purchase. Unique so a webhook replay can
  -- never credit the same payment twice: keyed on the provider's own
  -- transaction reference, never on anything derived from user input.
  paystack_reference text unique,
  created_at timestamptz not null default now()
);

create index if not exists jobs_ai_credit_ledger_owner_idx
  on public.jobs_ai_credit_ledger (owner_user_id, created_at desc);

comment on table public.jobs_ai_credit_ledger is
  'Append-only record of every credit bought and every credit spent, with what it was spent on. paystack_reference is unique so a replayed webhook cannot credit the same payment twice.';

-- ---------------------------------------------------------------
-- 6. Tailored CVs
-- ---------------------------------------------------------------
-- "Tailored versions save as named copies, so someone can hold five aimed
-- CVs and know which went where."
--
-- These cannot be extra jobs_candidates rows: owner_user_id on that table
-- is UNIQUE, deliberately, because a person has one CV and one profile
-- employers can find. So a tailored version is an OVERLAY on the base CV
-- -- a rewritten summary, rewritten work descriptions and a reordered
-- skill list -- rendered through the same assembly as everything else.
-- Nothing here is ever searchable and nothing here is ever shown to an
-- employer except as a CV the person themselves sent.

create table if not exists public.jobs_cv_tailored (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.jobs_candidates (id) on delete cascade,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  -- What the person calls it: "Shoprite cashier", "Bidvest driver".
  name text not null,
  summary text,
  -- One rewritten description per work entry, same order as work_history.
  work_descriptions jsonb not null default '[]'::jsonb,
  -- The person's own skills, reordered to lead with what the advert asked
  -- for. Never a skill they do not already have: the tailor path filters
  -- the output against the stored list rather than trusting the model.
  skills_order jsonb not null default '[]'::jsonb,
  -- Set when they picked a live vacancy from our own board rather than
  -- pasting an advert from anywhere.
  source_vacancy_id uuid references public.jobs_vacancies (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists jobs_cv_tailored_candidate_idx
  on public.jobs_cv_tailored (candidate_id, created_at desc);

comment on table public.jobs_cv_tailored is
  'A named, aimed version of a CV: rewritten summary and work descriptions plus a reordered skill list, overlaid on the base jobs_candidates row at render time. Costs one rebuild credit to create. Never searchable, never shown to an employer except as a CV the person sent themselves.';

-- ---------------------------------------------------------------
-- 7. RLS
-- ---------------------------------------------------------------
-- Same posture as the rest of Jobs: the app reads and writes these through
-- the service-role admin client from Server Actions, which re-check
-- ownership themselves. RLS is on with self-service read policies so that
-- nothing is readable by anyone else even if a client-side query is ever
-- pointed at these tables by mistake. No client-facing insert or update
-- policy exists on any of the three: a person must never be able to write
-- their own credit balance.

alter table public.jobs_ai_credits enable row level security;
alter table public.jobs_ai_credit_ledger enable row level security;
alter table public.jobs_cv_tailored enable row level security;

drop policy if exists "seekers read own credits" on public.jobs_ai_credits;
create policy "seekers read own credits"
  on public.jobs_ai_credits for select
  to authenticated
  using (owner_user_id = (select auth.uid()));

drop policy if exists "seekers read own ledger" on public.jobs_ai_credit_ledger;
create policy "seekers read own ledger"
  on public.jobs_ai_credit_ledger for select
  to authenticated
  using (owner_user_id = (select auth.uid()));

drop policy if exists "seekers read own tailored cvs" on public.jobs_cv_tailored;
create policy "seekers read own tailored cvs"
  on public.jobs_cv_tailored for select
  to authenticated
  using (owner_user_id = (select auth.uid()));

-- ---------------------------------------------------------------
-- 8. Grants
-- ---------------------------------------------------------------
-- This project does not rely on Postgres default privileges: a base grant
-- is checked before RLS is ever evaluated, so a new table with perfect
-- policies and no grant returns "permission denied" on every query. That
-- was found live once already (see 20260806260000_jobs_foundation_grants.sql)
-- and is the reason these three lines sit in the same migration as the
-- tables rather than in a follow-up.
--
-- authenticated gets SELECT only. Every write to all three goes through a
-- Server Action on the service-role client, because a person who can
-- UPDATE jobs_ai_credits can give themselves credits.

grant select on public.jobs_ai_credits to authenticated;
grant select on public.jobs_ai_credit_ledger to authenticated;
grant select on public.jobs_cv_tailored to authenticated;

grant select, insert, update, delete on public.jobs_ai_credits to service_role;
grant select, insert, update, delete on public.jobs_ai_credit_ledger to service_role;
grant select, insert, update, delete on public.jobs_cv_tailored to service_role;
