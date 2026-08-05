-- The whole class fixed at once rather than table by table as cleanup
-- trips over each one: every bizup_* table gets the full service_role
-- grant set the estate's own pattern demands.
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname='public' and tablename like 'bizup_%'
  loop
    execute format('grant select, insert, update, delete on public.%I to service_role', t.tablename);
  end loop;
end $$;
