-- Legacy Reactivation Sprint 2, Section 9 (unsubscribe link). Scope is
-- deliberately narrow: this only suppresses future marketing/campaign-style
-- sends (e.g. a resend of the reactivation invite), never transactional
-- email an account genuinely needs (password reset, trial reminders once
-- they're an active user) — those aren't gated on this column.
alter table public.growth_clients add column email_unsubscribed_at timestamptz;
