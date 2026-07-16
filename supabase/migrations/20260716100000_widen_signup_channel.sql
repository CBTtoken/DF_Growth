-- Legacy Reactivation Sprint 1: signup_channel needs a third value so this
-- batch can be cleanly distinguished from real web/WhatsApp signups —
-- powers the admin Reactivation Batch view (Section 6) and excludes this
-- batch from the onboarding-nudge cron, which would otherwise email these
-- businesses again before the real, approved invitation goes out.
alter table public.growth_clients drop constraint growth_clients_signup_channel_check;
alter table public.growth_clients
  add constraint growth_clients_signup_channel_check
  check (signup_channel in ('web', 'whatsapp', 'legacy_reactivation'));
