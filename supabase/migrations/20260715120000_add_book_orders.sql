-- STANDING365_LANDING_BUILD_SPEC_CLAUDE.md Sec 2 and 6: order data for a
-- custom page's own purchase flow, kept in its own table rather than folded
-- into growth_clients' standard leads table. RLS enabled, no policies —
-- service-role only, same deliberate default-deny pattern already used for
-- leads/capi_events/growth_client_secrets (real personal data: a home
-- delivery address and a personal gift message).
create table public.book_orders (
  id uuid primary key default gen_random_uuid(),
  growth_client_id uuid not null references public.growth_clients (id) on delete cascade,
  created_at timestamptz not null default now(),
  edition text not null check (edition in ('standard', 'personalised')),
  buyer_name text not null,
  email text not null,
  phone text not null,
  delivery_address jsonb not null,
  recipient_name text,
  gift_message text,
  amount integer not null,
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed')),
  paystack_reference text unique,
  batch_number integer,
  fulfilment_status text not null default 'unfulfilled' check (fulfilment_status in ('unfulfilled', 'shipped')),
  marketing_consent boolean not null default false
);

alter table public.book_orders enable row level security;
