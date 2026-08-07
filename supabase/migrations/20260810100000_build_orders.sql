-- Sprint "Onboarding two doors" item 1: the R450 done-for-you build becomes
-- a real product with its own checkout, rather than a tick in the wizard
-- that emails Dewald to arrange payment by hand.
--
-- growth_clients.setup_service_requested_at already exists and stays exactly
-- as it is: it records intent, which is still worth capturing from a member
-- who ticks the box mid-wizard without paying. These columns record an order
-- that has actually been paid for, which is a different thing and needs a
-- queue and a clock.

alter table growth_clients
  add column if not exists build_order_status text,
  add column if not exists build_order_paid_at timestamptz,
  add column if not exists build_order_due_at timestamptz,
  add column if not exists build_order_brief text,
  add column if not exists build_order_amount_cents integer;

-- null means "not a build order at all", which is the overwhelming majority
-- of rows and the reason this is a nullable text column rather than an enum
-- with a default.
alter table growth_clients
  drop constraint if exists growth_clients_build_order_status_check;

alter table growth_clients
  add constraint growth_clients_build_order_status_check
  check (build_order_status is null or build_order_status in (
    'awaiting_payment',
    'paid',
    'in_progress',
    'delivered',
    'cancelled'
  ));

-- The admin queue reads "everything open, oldest promise first", so the
-- index matches that access pattern rather than the column order above.
create index if not exists growth_clients_build_order_open_idx
  on growth_clients (build_order_due_at)
  where build_order_status in ('paid', 'in_progress');

comment on column growth_clients.build_order_status is
  'Done-for-you build order state. null = ordinary self-serve signup.';
comment on column growth_clients.build_order_due_at is
  'Three working days from payment, the promise made at checkout.';
comment on column growth_clients.build_order_brief is
  'The member''s own words about their business, captured at the build door.';
