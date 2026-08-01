-- Every Moxie payment, recorded once.
--
-- This exists because the same gap has now been found twice in this
-- application, on the Growth side on 17 July 2026 and on the KatisoBiz side
-- after that. Paystack sends a renewal as an ordinary charge.success whose
-- metadata is a bare 0 rather than the bag set at checkout, so a branch that
-- keys on metadata alone never sees a renewal. Nothing visibly breaks, since
-- the member's access is already set and nothing downgrades them. What is
-- lost is the record of the money, which makes every paying member look like
-- they churned after one month.
--
-- So Moxie resolves renewals by plan code, and writes them here.
--
-- paystack_reference is unique and that uniqueness IS the idempotency check.
-- Paystack retries a webhook until it gets a 200, so a redelivered event is
-- routine rather than exceptional: the second insert loses the race, returns
-- 23505, and the handler stops. Keyed on the provider's reference and never
-- on anything derived from our own data, because a user and interval pair
-- would collide the moment somebody resubscribes.
create table if not exists public.moxie_billing_events (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references public.moxie_subscriptions (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  email text,

  paystack_reference text not null unique,
  paystack_plan_code text,

  kind text not null check (kind in ('signup', 'renewal')),
  interval text check (interval in ('monthly', 'annual')),
  amount_cents int not null default 0,

  created_at timestamptz not null default now()
);

create index if not exists moxie_billing_events_user_idx
  on public.moxie_billing_events (user_id, created_at desc);

grant select, insert, update, delete on public.moxie_billing_events to service_role;
alter table public.moxie_billing_events enable row level security;
