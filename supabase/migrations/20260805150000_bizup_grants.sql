-- The pattern this project has now hit four times: a table created without
-- the full service_role grant set, discovered only when cleanup tries to
-- delete. Granted wholesale here for the two BizUp tables that were short.
grant select, insert, update, delete on bizup_audit_log to service_role;
grant select, insert, update, delete on bizup_accounts to service_role;
