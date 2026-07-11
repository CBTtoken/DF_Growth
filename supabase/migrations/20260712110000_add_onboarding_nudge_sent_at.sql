-- Sprint 1, Build Item 5: tracks whether the Day 3-4 incomplete-onboarding
-- nudge has already been sent, so the cron job never sends more than one
-- per account, matching trial_reminder_sent_at's existing pattern.
alter table public.growth_clients add column onboarding_nudge_sent_at timestamptz;
