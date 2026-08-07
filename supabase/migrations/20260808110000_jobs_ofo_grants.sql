-- Follow-up to 20260808100000_jobs_ofo.sql: same lesson as
-- 20260806260000_jobs_foundation_grants.sql. This project does not rely on
-- Postgres default privileges, and the OFO migration granted select to
-- anon/authenticated but not to service_role -- so the ofo-search route's
-- admin client got 42501 "permission denied" on jobs_ofo_occupations while
-- the RLS policies sat unused. Base grants are checked before RLS.

grant select, insert, update, delete on public.jobs_ofo_major_groups to service_role;
grant select, insert, update, delete on public.jobs_ofo_sub_major_groups to service_role;
grant select, insert, update, delete on public.jobs_ofo_minor_groups to service_role;
grant select, insert, update, delete on public.jobs_ofo_unit_groups to service_role;
grant select, insert, update, delete on public.jobs_ofo_occupations to service_role;
grant select, insert, update, delete on public.jobs_ofo_specialisations to service_role;
grant select, insert, update, delete on public.jobs_ofo_skills to service_role;
