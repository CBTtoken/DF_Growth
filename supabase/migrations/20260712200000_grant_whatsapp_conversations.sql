-- Combined spec Sec 32: missed in the original whatsapp_conversations
-- migration — this project's own established pattern (see
-- 20260708130000_grant_api_roles.sql) is that RLS policies alone don't
-- grant table access; every table needs an explicit GRANT too, or even
-- service_role gets "permission denied for table" (confirmed live: this
-- exact error surfaced during local testing of the webhook handler).
-- service_role only, matching the table's own no-policies-defined
-- decision (this table is never touched by anon/authenticated).
grant select, insert, update, delete on public.whatsapp_conversations to service_role;
