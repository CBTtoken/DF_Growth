-- Handoff: scripts/handoff-unified-account-and-reviews.md, Job 4.
--
-- Mirrors 20260729140000_bizup_reminders.sql exactly, one invoice-lifecycle
-- event later: a reminder chases money before it's paid, a review request
-- follows up once it is. Same rule either way — KatisoBiz never messages a
-- customer itself, it opens WhatsApp with the message written and the
-- member presses send.

alter table public.bizup_documents
  add column if not exists review_requested_at timestamptz;

comment on column public.bizup_documents.review_requested_at is
  'When the member last prepared a review request for this invoice. Not proof it was sent: the member presses send in WhatsApp themselves. Used to offer the button once by default, with a deliberate resend still available.';
