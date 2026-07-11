-- Foundation's free trial has no card captured at signup (2026-07-11
-- decision) — trial_ends_at starts the 7-day clock once a client's page
-- actually goes live (set in saveStep6, the Foundation finish line), not
-- at signup. trial_reminder_sent_at tracks the day-5 heads-up email so the
-- daily reminder cron (src/app/api/cron/trial-reminders) doesn't send it
-- twice regardless of exact run timing.
alter table public.growth_clients add column trial_ends_at timestamptz;
alter table public.growth_clients add column trial_reminder_sent_at timestamptz;
