-- Sprint 1, Build Item 9 (legal/compliance): records when a client actively
-- consented to the Privacy Policy and Terms & Conditions at registration,
-- as evidence of consent if it's ever needed. Null for any client created
-- before this feature existed - never backfilled with a fake timestamp,
-- since they never actually saw this exact checkbox.
alter table public.growth_clients add column consented_at timestamptz;
