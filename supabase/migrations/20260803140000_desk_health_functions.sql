-- The three things the health check needs from Postgres itself.
--
-- All read-only, all SECURITY DEFINER because they read catalogue and auth
-- tables the service role cannot reach directly, and all granted to
-- service_role only. Nothing here changes anything: the health check reports
-- and never remediates, per section 8 of the handoff.

-- Database size, in bytes.
--
-- Read from pg_database_size rather than the billing API, because this is the
-- number that actually decides whether writes start failing, and it needs no
-- extra token.
create or replace function public.desk_database_size_bytes()
returns bigint
language sql
security definer
set search_path = ''
as $$
  select pg_database_size(current_database());
$$;

comment on function public.desk_database_size_bytes is
  'Current database size in bytes, for the Desk health check. Read-only.';

-- Public tables with row level security switched off.
--
-- Reported, never fixed. Turning RLS on under a table deliberately left open
-- would break whatever depends on it at a moment nobody is watching.
create or replace function public.desk_tables_without_rls()
returns table (table_name text)
language sql
security definer
set search_path = ''
as $$
  select c.relname::text
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relrowsecurity = false
    -- Tables owned by an installed extension are excluded. spatial_ref_sys
    -- belongs to PostGIS, ships with RLS off, is not ours to change, and a
    -- check that warns about it on every run forever trains the reader to
    -- skip the line it sits on.
    and not exists (
      select 1 from pg_depend d
      where d.objid = c.oid and d.deptype = 'e'
    )
  order by c.relname;
$$;

comment on function public.desk_tables_without_rls is
  'Public tables with RLS disabled, for the Desk health check. Reports only, never changes anything.';

-- How many accounts can sign in.
--
-- Dewald, 3 August 2026: there should be no other logins on any platform, so
-- the useful signal is not the number itself but the number changing. The
-- check compares it to the previous run and flags any movement.
--
-- Returns a count and never the addresses. A health screen has no business
-- listing every customer's email, and this table is auth.users.
create or replace function public.desk_auth_user_count()
returns bigint
language sql
security definer
set search_path = ''
as $$
  select count(*) from auth.users;
$$;

comment on function public.desk_auth_user_count is
  'Number of auth accounts, for change detection in the Desk health check. Deliberately a count and never the addresses.';

revoke all on function public.desk_database_size_bytes() from public, anon, authenticated;
revoke all on function public.desk_tables_without_rls() from public, anon, authenticated;
revoke all on function public.desk_auth_user_count() from public, anon, authenticated;

grant execute on function public.desk_database_size_bytes() to service_role;
grant execute on function public.desk_tables_without_rls() to service_role;
grant execute on function public.desk_auth_user_count() to service_role;
