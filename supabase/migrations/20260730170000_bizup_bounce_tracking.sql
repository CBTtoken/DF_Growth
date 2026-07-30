-- Bounce and complaint tracking for KatisoBiz members.
--
-- The Resend webhook has recorded hard bounces and spam complaints since
-- the reactivation work, but only against growth_clients. KatisoBiz members
-- live in bizup_accounts, so for all nineteen of them the webhook has been
-- arriving, finding no matching row, and silently doing nothing.
--
-- That matters more than it sounds. Both products send through the same
-- domain, so a KatisoBiz address that hard-bounces on every check-in email
-- damages the reputation that also carries Growth's password resets and
-- lead notifications. This project has already had one bounce-rate warning.
--
-- Unsubscribes are not included here because KatisoBiz already has one:
-- notify_by_email, the same switch the member has in their own settings,
-- which the unsubscribe link sets. One switch, two ways to reach it, is
-- correct. A bounce is a different fact: the member never chose it and may
-- not know, so it is recorded separately rather than silently flipping the
-- preference they set themselves.
alter table public.bizup_accounts
  add column if not exists email_bounced_at timestamptz;

alter table public.bizup_accounts
  add column if not exists email_complained_at timestamptz;

comment on column public.bizup_accounts.email_bounced_at is
  'Set by the Resend webhook when mail to this address hard-bounced. Suppresses further sending. Distinct from notify_by_email, which is the member''s own choice.';

comment on column public.bizup_accounts.email_complained_at is
  'Set by the Resend webhook when this address marked us as spam. Suppresses further sending permanently.';

-- The webhook looks accounts up by address, and every send path now filters
-- on these two columns.
create index if not exists bizup_accounts_email_idx
  on public.bizup_accounts (email);
