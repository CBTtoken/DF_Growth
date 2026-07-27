-- KatisoBiz billing: paid upgrades and document topups.
--
-- The landing page sells both ("You choose a paid plan later, from inside
-- KatisoBiz" and "Top up for another 75 documents for R49") and neither
-- existed. A member on the free tier had no way to pay at all.
--
-- This table exists for one reason: idempotency. Paystack redelivers
-- webhook events, and a redelivered topup would hand out another 75
-- documents every time it arrived. The existing webhook already keys its
-- idempotency on growth_clients.paystack_reference, which cannot cover
-- KatisoBiz: a member can top up many times, so there is no single column
-- on the account to hold "the" reference.
--
-- Keyed on Paystack's own transaction reference, never on anything derived
-- from member data. That distinction has already caused one real bug in
-- this codebase, where dedup keyed on a slug built from the business name
-- meant any two businesses that ever chose the same name collided.

create table public.bizup_billing_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.bizup_accounts (id) on delete restrict,

  -- The unique constraint IS the idempotency mechanism. A redelivered event
  -- fails the insert on conflict and the handler stops, rather than the
  -- handler having to remember to check first.
  paystack_reference text not null unique,

  kind text not null check (kind in ('subscription', 'topup')),
  -- The plan bought, for a subscription. Null for a topup, which does not
  -- change the plan.
  plan text check (plan is null or plan in ('paid', 'unlimited')),
  amount_cents integer not null check (amount_cents >= 0),
  created_at timestamptz not null default now()
);

create index bizup_billing_events_account_idx
  on public.bizup_billing_events (account_id, created_at desc);

alter table public.bizup_billing_events enable row level security;

-- A member can see what they have paid for. They can never write a row:
-- the only thing that may create one is the webhook, running as the
-- service role after Paystack's signature has been verified. An insert
-- policy here would let a member grant themselves an unlimited plan.
create policy "members read own bizup billing events"
  on public.bizup_billing_events for select
  using (
    exists (
      select 1 from public.bizup_accounts a
      where a.id = bizup_billing_events.account_id
        and a.owner_user_id = auth.uid()
    )
  );

-- No delete grant, matching bizup_audit_log. A payment record is not
-- something the application should ever be able to erase.
grant select, insert on public.bizup_billing_events to service_role;
