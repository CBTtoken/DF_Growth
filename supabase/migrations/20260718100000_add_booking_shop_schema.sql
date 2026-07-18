-- Booking & Shop Modules Sprint 1 (docs/GROWTH_BOOKING_SHOP_MODULES_CLAUDE.md).
--
-- Both modules are single-tenant, everything scoped to one growth_client's
-- own page (Sec 1) — no cross-client search or shared directory anywhere in
-- this schema. Follows this repo's established migration conventions
-- exactly: no DB-level updated_at trigger (set manually in application
-- code, matching every other table in this project), RLS enabled on every
-- table with per-operation policies, explicit service_role grants at the
-- end of each table's section.

-- ============================================================
-- Shared: Paystack Subaccount payment routing (Sec 2)
-- ============================================================

-- One row per client that has connected a Subaccount. A client with no row
-- here falls back to the platform Paystack account for Booking/Shop
-- payments — the *absence* of a row is the fallback, not a status flag.
create table public.client_subaccounts (
  id uuid primary key default gen_random_uuid(),
  growth_client_id uuid not null unique references public.growth_clients (id) on delete cascade,
  paystack_subaccount_code text not null unique,
  business_name text not null, -- mirrors what was submitted to Paystack, for display without a round trip
  bank_name text not null,
  account_number_last4 text not null, -- never store the full account number — Paystack holds that
  settlement_bank_code text not null,
  percentage_charge numeric not null, -- platform's cut %, echoed back by Paystack at creation
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Booking module (Sec 3)
-- ============================================================

create table public.bookable_units (
  id uuid primary key default gen_random_uuid(),
  growth_client_id uuid not null references public.growth_clients (id) on delete cascade,
  name text not null,
  unit_type text not null check (unit_type in ('time_slot', 'day_night', 'capacity')),
  description text,
  base_price_cents integer not null,
  capacity integer, -- only meaningful for unit_type = 'capacity'
  duration_minutes integer, -- only meaningful for unit_type = 'time_slot'
  is_active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per client. Date-range price overrides live as a jsonb array
-- inside this table rather than a separate one — Sec 5 names exactly three
-- booking tables, and a fourth would deviate from that list without need.
create table public.booking_operational_rules (
  growth_client_id uuid primary key references public.growth_clients (id) on delete cascade,
  operating_hours jsonb not null default '{}'::jsonb, -- {mon:[{open:"09:00",close:"17:00"}], ...}; a missing/empty day means closed
  buffer_minutes integer not null default 0,
  min_advance_hours integer not null default 0,
  price_overrides jsonb not null default '[]'::jsonb, -- [{bookable_unit_id: uuid|null, start_date, end_date, price_cents, label}]
  cancellation_policy_text text,
  reminder_offsets_hours jsonb not null default '[24]'::jsonb, -- e.g. [2] for an appointment, [24] for a rental check-in
  timezone text not null default 'Africa/Johannesburg', -- Sec 3.6: all timestamps stored consistently in SAST
  updated_at timestamptz not null default now()
);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  growth_client_id uuid not null references public.growth_clients (id) on delete cascade,
  bookable_unit_id uuid not null references public.bookable_units (id) on delete cascade,
  -- Denormalized from bookable_units at hold time. Needed by the exclusion
  -- constraint below, which cannot subquery another table.
  unit_type text not null,
  status text not null default 'held' check (status in ('held', 'confirmed', 'cancelled', 'expired')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  quantity integer not null default 1, -- capacity units only; always 1 for time_slot/day_night
  customer_name text,
  customer_phone text,
  customer_email text,
  price_cents integer not null, -- snapshotted at hold time, immune to later price_override edits
  hold_expires_at timestamptz, -- set to now() + 10 minutes at creation (Sec 3.2); cleared once status leaves 'held'
  reminder_sent_at timestamptz,
  paystack_reference text unique,
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid', 'refunded')),
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reservations_unit_range_idx on public.reservations (bookable_unit_id, starts_at, ends_at);

-- Hard DB-level guard against double-booking a mutually-exclusive resource
-- (a salon chair, a rental room) — deliberately excludes unit_type =
-- 'capacity', which is allowed to overlap up to bookable_units.capacity,
-- checked in application code instead. A hold's expiry is enforced by
-- application code actively expiring stale rows before every read/write
-- against a unit (src/lib/booking/expire-stale-holds.ts), not by this
-- constraint's predicate, since exclusion-constraint predicates must be
-- immutable and can't reference now().
create extension if not exists btree_gist;

alter table public.reservations add constraint reservations_no_overlap
  exclude using gist (
    bookable_unit_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('held', 'confirmed') and unit_type <> 'capacity');

-- ============================================================
-- Shop module (Sec 4)
-- ============================================================

create table public.shop_products (
  id uuid primary key default gen_random_uuid(),
  growth_client_id uuid not null references public.growth_clients (id) on delete cascade,
  title text not null,
  description text,
  sku text not null, -- unique per client, not globally
  base_price_cents integer not null,
  image_paths jsonb not null default '[]'::jsonb,
  weight_kg numeric not null, -- required per Sec 4.2, needed for Bob Go courier rates
  length_cm numeric not null,
  width_cm numeric not null,
  height_cm numeric not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  view_count integer not null default 0,
  sale_count integer not null default 0, -- Sec 4.3: best-seller ranking source
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (growth_client_id, sku)
);

create table public.shop_product_variants (
  id uuid primary key default gen_random_uuid(),
  -- Denormalized from shop_products, matching how every other RLS policy in
  -- this codebase joins growth_members on a direct column, never a
  -- two-level join.
  growth_client_id uuid not null references public.growth_clients (id) on delete cascade,
  shop_product_id uuid not null references public.shop_products (id) on delete cascade,
  sku text not null,
  descriptor jsonb not null default '{}'::jsonb, -- {size:"M", colour:"Blue"} — free-form, no fixed schema
  price_cents integer, -- null = inherit shop_products.base_price_cents
  stock_quantity integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shop_product_id, sku)
);

create table public.shop_coupons (
  id uuid primary key default gen_random_uuid(),
  growth_client_id uuid not null references public.growth_clients (id) on delete cascade,
  code text not null,
  discount_type text not null check (discount_type in ('percentage', 'fixed_amount')),
  discount_value integer not null,
  max_uses integer,
  uses_count integer not null default 0,
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (growth_client_id, code)
);

create table public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  growth_client_id uuid not null references public.growth_clients (id) on delete cascade,
  line_items jsonb not null, -- [{product_id, variant_id, sku, title, descriptor, quantity, unit_price_cents}] — snapshotted, immune to later catalog edits
  coupon_code text,
  discount_cents integer not null default 0,
  subtotal_cents integer not null,
  shipping_cents integer not null default 0,
  total_cents integer not null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  delivery_address jsonb not null, -- {line1, line2, suburb, city, province, postal_code}
  shipping_method text, -- 'economy' | 'express' | 'pargo_point' | 'bobbox_locker' — populated once Sprint 5 (Bob Go) lands
  bobgo_shipment_id text, -- Sprint 5
  tracking_number text, -- Sprint 5
  fulfilment_status text not null default 'unfulfilled'
    check (fulfilment_status in ('unfulfilled', 'processing', 'shipped', 'delivered', 'cancelled')),
  -- 'oversold': payment succeeded but the atomic stock decrement (Sec 4.7)
  -- lost the race — flagged in the dashboard for manual refund, since no
  -- programmatic partial-refund helper exists in this codebase.
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid', 'refunded', 'oversold')),
  paystack_reference text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.client_subaccounts enable row level security;
alter table public.bookable_units enable row level security;
alter table public.booking_operational_rules enable row level security;
alter table public.reservations enable row level security;
alter table public.shop_products enable row level security;
alter table public.shop_product_variants enable row level security;
alter table public.shop_coupons enable row level security;
alter table public.shop_orders enable row level security;

-- client_subaccounts: financial data, members read own only. No public
-- policy — connection/verification always goes through the Paystack API
-- server-side via the service role client.
create policy "members read own client subaccount"
on public.client_subaccounts for select
using (
  exists (
    select 1 from public.growth_members
    where growth_members.growth_client_id = client_subaccounts.growth_client_id
    and growth_members.user_id = auth.uid()
  )
);

-- bookable_units: members manage their own; public visitors need to see
-- active units to build the booking calendar, no PII on this table.
create policy "members read own client bookable units"
on public.bookable_units for select
using (
  exists (
    select 1 from public.growth_members
    where growth_members.growth_client_id = bookable_units.growth_client_id
    and growth_members.user_id = auth.uid()
  )
);

create policy "anyone reads active bookable units"
on public.bookable_units for select
using (is_active = true);

-- booking_operational_rules: members manage their own; public visitors need
-- operating hours/buffer/price overrides to render availability and price,
-- no PII on this table.
create policy "members read own client booking rules"
on public.booking_operational_rules for select
using (
  exists (
    select 1 from public.growth_members
    where growth_members.growth_client_id = booking_operational_rules.growth_client_id
    and growth_members.user_id = auth.uid()
  )
);

create policy "anyone reads booking rules"
on public.booking_operational_rules for select
using (true);

-- reservations: carries customer PII (name/phone/email). Members read their
-- own client's bookings only. No public select policy at all — matching
-- leads' precedent (init_schema.sql): public availability reads go through
-- a server Route Handler using the service role client, explicitly
-- selecting only bookable_unit_id/starts_at/ends_at/status, never the
-- customer columns. No public insert policy either — holds are always
-- created server-side via a Server Action.
create policy "members read own client reservations"
on public.reservations for select
using (
  exists (
    select 1 from public.growth_members
    where growth_members.growth_client_id = reservations.growth_client_id
    and growth_members.user_id = auth.uid()
  )
);

-- shop_products / shop_product_variants: members manage their own; public
-- visitors browse the active catalog, no PII on either table.
create policy "members read own client shop products"
on public.shop_products for select
using (
  exists (
    select 1 from public.growth_members
    where growth_members.growth_client_id = shop_products.growth_client_id
    and growth_members.user_id = auth.uid()
  )
);

create policy "anyone reads active shop products"
on public.shop_products for select
using (status = 'active');

create policy "members read own client shop variants"
on public.shop_product_variants for select
using (
  exists (
    select 1 from public.growth_members
    where growth_members.growth_client_id = shop_product_variants.growth_client_id
    and growth_members.user_id = auth.uid()
  )
);

create policy "anyone reads active shop variants"
on public.shop_product_variants for select
using (is_active = true);

-- shop_coupons: no public policy — a coupon code is validated server-side
-- at redemption via the service role client, never listed to the browser
-- (listing every code publicly would defeat the point of a coupon).
create policy "members read own client shop coupons"
on public.shop_coupons for select
using (
  exists (
    select 1 from public.growth_members
    where growth_members.growth_client_id = shop_coupons.growth_client_id
    and growth_members.user_id = auth.uid()
  )
);

-- shop_orders: carries customer PII and financial data. No public policy —
-- orders are always written server-side (Paystack webhook) and read back
-- only via a dedicated /verify route for display, matching reservations'
-- reasoning above.
create policy "members read own client shop orders"
on public.shop_orders for select
using (
  exists (
    select 1 from public.growth_members
    where growth_members.growth_client_id = shop_orders.growth_client_id
    and growth_members.user_id = auth.uid()
  )
);

grant select, insert, update, delete on public.client_subaccounts to service_role;
grant select, insert, update, delete on public.bookable_units to service_role;
grant select, insert, update, delete on public.booking_operational_rules to service_role;
grant select, insert, update, delete on public.reservations to service_role;
grant select, insert, update, delete on public.shop_products to service_role;
grant select, insert, update, delete on public.shop_product_variants to service_role;
grant select, insert, update, delete on public.shop_coupons to service_role;
grant select, insert, update, delete on public.shop_orders to service_role;
