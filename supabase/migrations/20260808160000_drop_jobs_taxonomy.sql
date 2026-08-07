-- Drop the dead pre-OFO taxonomy (Dewald, 7 August 2026: "Nothing reads
-- it"). The OFO switch left jobs_taxonomy and its referencing columns
-- unread by any code path; this removes the table and every column that
-- pointed at it. The original seed cannot be deleted as a file because it
-- lives inside the applied foundation migrations that also created every
-- other jobs table -- history stays append-only, and this migration is the
-- append that undoes it.

alter table jobs_candidates
  drop column if exists primary_role_id,
  drop column if exists secondary_role_ids,
  drop column if exists other_role_text,
  drop column if exists alert_role_id;

alter table jobs_vacancies
  drop column if exists role_id,
  drop column if exists other_role_text;

drop table jobs_taxonomy;
