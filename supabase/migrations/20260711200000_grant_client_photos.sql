-- Missed when client_photos was created: every table needs an explicit
-- grant to the API roles (see 20260708130000_grant_api_roles.sql's own
-- comment) — RLS policies alone don't grant table access, and
-- service_role doesn't bypass this the way it bypasses RLS.
grant select, insert, update, delete on public.client_photos to anon, authenticated, service_role;
