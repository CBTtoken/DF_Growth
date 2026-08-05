-- Follow-up to 20260805200000_page_poster.sql: missed the table-level
-- grant every other migration in this project includes (this project
-- doesn't rely on Postgres default privileges, see
-- 20260708130000_grant_api_roles.sql). Found live: the tables existed but
-- service_role got "permission denied" on every query. All four are
-- accessed exclusively through the admin/service-role client in code
-- (cron jobs, the approval screen, the dashboard banner query), never
-- through the anon/authenticated client, so service_role is the only
-- grant needed, same as bizup_expense_slips.

grant select, insert, update, delete on
  public.page_poster_client_state,
  public.page_poster_evergreen,
  public.page_poster_settings,
  public.page_poster_queue
to service_role;
