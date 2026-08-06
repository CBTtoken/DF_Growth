-- Follow-up to 20260806250000_jobs_foundation.sql: missed the table-level
-- grants every other migration in this project includes (this project
-- doesn't rely on Postgres default privileges, see
-- 20260708130000_grant_api_roles.sql). Found live: both tables existed but
-- anon/authenticated got "permission denied" on every query, RLS policies
-- notwithstanding -- a base grant is checked before RLS is ever evaluated.
--
-- jobs_candidate_deletion_log, jobs_reports and jobs_moderation_log need no
-- equivalent fix: all three are deliberately service-role-only (no RLS
-- policy exists for anon/authenticated on any of them), and already got
-- their correct service_role grant in the original migration.

grant select on public.jobs_taxonomy to anon, authenticated;

grant select, insert, update on public.jobs_candidates to authenticated;
