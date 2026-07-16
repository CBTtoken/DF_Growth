-- Legacy Reactivation Sprint 2, Section 9: address verification and
-- bounce/complaint tracking. Platform-wide fields (any future campaign
-- reuses this), not scoped to signup_channel = 'legacy_reactivation'.
alter table public.growth_clients
  add column email_verification_status text not null default 'unchecked'
    check (email_verification_status in ('unchecked', 'valid', 'invalid')),
  add column email_verification_checked_at timestamptz,
  add column email_bounced_at timestamptz,
  add column email_complained_at timestamptz;
