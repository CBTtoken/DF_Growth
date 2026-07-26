-- Member lead management: leads had no status field at all, so a business
-- owner had no way to mark which enquiries they'd already dealt with. A
-- nullable timestamp (null = new/unhandled, set = handled, and records when)
-- is enough for the "Mark as handled" toggle + "X new" unread count.
alter table public.leads add column if not exists handled_at timestamptz;
