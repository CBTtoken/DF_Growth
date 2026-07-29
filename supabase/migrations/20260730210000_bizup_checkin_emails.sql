-- Three check-in emails, sent once each and never repeated.
--
-- Dewald, 29 July 2026, after seeing that half his members had started a
-- quote and none had finished one. The three groups need genuinely
-- different messages, which is why this is three columns rather than one
-- "nudged_at":
--
--   started   they built a draft and stopped. The job is still warm and
--             the customer is still waiting, so this goes at 24 hours and
--             asks what got in the way.
--   idle      they registered and created nothing at all. 48 hours, so a
--             working day has passed, and phrased as an offer of help
--             rather than "have you tried it yet".
--   feedback  they issued something, so the product worked. 72 hours, and
--             asks what would make it better.
--
-- A member moves between groups as they use the product, and these columns
-- are what stops someone receiving the wrong one afterwards: once a member
-- has been sent the started nudge, they never get it again even if they
-- create a second draft months later.
--
-- Timestamps rather than booleans so it is always possible to answer "when
-- did we last email this person", which is the question that matters when
-- somebody complains about being emailed too much.

alter table public.bizup_accounts
  add column if not exists checkin_started_at timestamptz;

comment on column public.bizup_accounts.checkin_started_at is
  'When we emailed this member about a draft they started and did not issue. Sent once, about 24 hours after signup.';

alter table public.bizup_accounts
  add column if not exists checkin_idle_at timestamptz;

comment on column public.bizup_accounts.checkin_idle_at is
  'When we emailed this member because they had created nothing at all. Sent once, about 48 hours after signup.';

alter table public.bizup_accounts
  add column if not exists checkin_feedback_at timestamptz;

comment on column public.bizup_accounts.checkin_feedback_at is
  'When we asked this member for suggestions, having seen them successfully issue a document. Sent once, about 72 hours after signup.';

-- The daily job scans by signup age, so this keeps it from reading every
-- account once there are more than a handful.
create index if not exists bizup_accounts_checkin_idx
  on public.bizup_accounts (created_at)
  where notify_by_email = true;
