-- Applications, saved candidates, and the structured vacancy fields the
-- pre-launch handoff requires (Jobs 5, 6, 7).
--
-- jobs_applications survives the vacancy's own lifecycle: vacancies are
-- purged after expiry (the cron's stripped-outcome rule), so the
-- application snapshots the title and employer name at apply time and the
-- vacancy FK nulls on delete -- the seeker's "jobs applied for" history
-- must not evaporate because a post ran its 30 days. The candidate FK
-- cascades the other way: deleting a CV deletes its applications, because
-- "something never held cannot leak" applies to everywhere the identity
-- travelled.

create table jobs_applications (
  id uuid primary key default gen_random_uuid(),
  vacancy_id uuid references jobs_vacancies(id) on delete set null,
  candidate_id uuid not null references jobs_candidates(id) on delete cascade,
  employer_id uuid not null references jobs_employers(id) on delete cascade,
  status text not null default 'new'
    check (status in ('new', 'reviewing', 'shortlisted', 'declined')),
  vacancy_title text not null,
  employer_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vacancy_id, candidate_id)
);

create index jobs_applications_candidate on jobs_applications (candidate_id, created_at desc);
create index jobs_applications_employer on jobs_applications (employer_id, status);
create index jobs_applications_vacancy on jobs_applications (vacancy_id);

create table jobs_saved_candidates (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references jobs_employers(id) on delete cascade,
  candidate_id uuid not null references jobs_candidates(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (employer_id, candidate_id)
);

create index jobs_saved_candidates_employer on jobs_saved_candidates (employer_id);

-- Same zero-policy posture as jobs_vacancies: all reads and writes go
-- through Server Actions with the service role; RLS enabled with no
-- policies means anon/authenticated can do nothing directly.
alter table jobs_applications enable row level security;
alter table jobs_saved_candidates enable row level security;

grant select, insert, update, delete on jobs_applications to service_role;
grant select, insert, update, delete on jobs_saved_candidates to service_role;

-- The structured vacancy detail (handoff Job 6). Existing rows predate the
-- structure, so the new required-ness is enforced by the composer's
-- validation, not by not-null constraints on columns old rows lack.
alter table jobs_vacancies
  add column starts_text text,
  add column closing_date date,
  add column duties text,
  add column must_have text,
  add column nice_to_have text,
  add column qualifications text,
  add column selection_process text,
  add column salary_public boolean not null default true;

-- Vacancy lifecycle grows draft (preview-before-publish) and closed
-- (employer closed it early, distinct from removed-by-moderation).
alter table jobs_vacancies drop constraint jobs_vacancies_status_check;
alter table jobs_vacancies add constraint jobs_vacancies_status_check
  check (status in ('draft', 'published', 'held', 'removed', 'expired', 'closed'));
