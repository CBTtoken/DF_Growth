-- Two bounces and the account is put up for closure. Dewald's rule, 31 July
-- 2026, after cuddlesandcustody.co.za bounced on the closure campaign and
-- would otherwise have been closed without ever being told.
--
-- A count, not a boolean, because one bounce is a full mailbox or a bad day
-- and two is an address that no longer works. `email_bounced_at` already
-- records the most recent one and stays as it is; this counts them.
--
-- Nothing here deletes anything. On the second bounce the account is flagged
-- and appears in the admin closure list for approval, which is Dewald's own
-- standing rule that deletion is a button and never a timer. The flag is a
-- timestamp rather than a boolean so we know when it was raised.
alter table public.growth_clients
  add column if not exists email_bounce_count integer not null default 0,
  add column if not exists closure_flagged_at timestamptz,
  add column if not exists closure_flagged_reason text;

comment on column public.growth_clients.email_bounce_count is
  'Number of hard bounces recorded for contact_email. Two flags the account for closure.';
comment on column public.growth_clients.closure_flagged_at is
  'Set when the account was put up for closure. Closure itself is always a human decision.';

-- Backfill: an account already carrying a bounce has had exactly one.
update public.growth_clients
  set email_bounce_count = 1
  where email_bounced_at is not null and email_bounce_count = 0;

create index if not exists growth_clients_closure_flagged_idx
  on public.growth_clients (closure_flagged_at)
  where closure_flagged_at is not null;
