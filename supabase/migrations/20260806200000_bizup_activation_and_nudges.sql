-- Handoff: scripts/handoff-activation-nudges-and-emails.md.
--
-- One migration for every new bizup_accounts column this handoff needs —
-- all plain, optional, additive columns on the same table, none of them
-- worth a separate file.

-- Job 1: activation is now an explicit button, not something a Growth
-- signup does silently. Recorded so it can be counted in admin, and so the
-- activation control (src/app/dashboard/bizup-actions.ts) knows never to
-- offer itself twice.
alter table public.bizup_accounts
  add column if not exists activated_at timestamptz;

comment on column public.bizup_accounts.activated_at is
  'When this account was created via the Growth dashboard activation button. Null for an account created directly through KatisoBiz signup instead.';

-- Job 4: the one-question, one-time website check. No follow-up flow, so a
-- single nullable text column plus a dismissal timestamp is the whole
-- feature end to end.
alter table public.bizup_accounts
  add column if not exists website_status text
    check (website_status in ('has_website', 'social_only', 'none'));

alter table public.bizup_accounts
  add column if not exists website_status_dismissed_at timestamptz;

-- Job 5 and 6: each nudge dismisses independently and stays dismissed for
-- 30 days (checked in application code against these timestamps, not
-- enforced here) — two columns, not a shared one, because dismissing the
-- review wedge should never silently also dismiss the quote nudge.
alter table public.bizup_accounts
  add column if not exists review_wedge_dismissed_at timestamptz;

alter table public.bizup_accounts
  add column if not exists quote_nudge_dismissed_at timestamptz;
