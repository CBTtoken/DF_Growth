-- Letting Dewald put a member on a paid plan without them paying.
--
-- His words: "be able to extend a members date range and efforts like
-- that". The real uses are a comp for an early tester, a goodwill month
-- after something went wrong, and a trial for someone being sold to.
--
-- Deliberately an expiring grant rather than just editing the plan column,
-- because a plan set by hand with no end date is a plan nobody remembers
-- to take away. The daily cron reverts it, so the free tier reasserts
-- itself without anyone having to diarise anything.

alter table public.bizup_accounts
  add column if not exists plan_granted_until date;

alter table public.bizup_accounts
  add column if not exists plan_granted_reason text;

comment on column public.bizup_accounts.plan_granted_until is
  'Set when an admin grants a paid plan for free. The daily cron moves the account back to free the day after this date. Null means the plan is however it was arrived at normally, whether self-paid or bundled with Growth.';

-- Reverting is a scan over a handful of rows once a day, but the index
-- costs nothing and keeps it honest as the member count grows.
create index if not exists bizup_accounts_plan_grant_idx
  on public.bizup_accounts (plan_granted_until)
  where plan_granted_until is not null;
