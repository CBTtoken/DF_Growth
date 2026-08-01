-- Moxie Magazine's public site: the catalogue readers browse, and the
-- commerce and entitlement layer behind it.
--
-- Additive only. Nothing existing is altered or dropped.
--
-- Why a separate catalogue rather than reading emag_editions directly.
-- emag_editions belongs to the Kwaai Press builder, which is deliberately
-- being generalised into a product for any publisher. The site needs two
-- things that builder does not model: editions that were never built in
-- Kwaai Press at all (June and July 2026 exist only as PDFs from the old
-- Adobe Express process), and a price. Coupling the shop to a schema that
-- is actively being reshaped for multi-tenancy would make both harder to
-- change. So the site owns its catalogue and points at a built edition when
-- there is one.

-- ---------------------------------------------------------------------------
-- The catalogue
-- ---------------------------------------------------------------------------

create table if not exists public.moxie_editions (
  id uuid primary key default gen_random_uuid(),

  -- The URL segment, and the reader-facing name. Month and year, never an
  -- issue number: the WooCommerce shop sold July as "Issue 8" while the
  -- cover artwork prints "Edition 02", and the archive would have carried
  -- whichever contradiction was seeded first, permanently. Dewald settled
  -- this on 1 August 2026. Set once and then left alone, because changing a
  -- slug breaks every link already sent to a reader.
  slug text not null unique,
  title text not null,

  -- The first of the publication month. Moxie publishes on the 1st.
  published_for date not null,

  description text,
  cover_path text,

  -- Where the reading experience comes from, and exactly one of these is
  -- expected to be set.
  --
  -- emag_edition_id: built in Kwaai Press, read as designed pages.
  -- pdf_path: the legacy editions, which exist only as a finished PDF.
  --
  -- Not a check constraint. August 2026 is seeded as a "coming soon" card
  -- with neither, and a constraint that forbids that would mean either no
  -- teaser or a fake row to satisfy it.
  emag_edition_id uuid references public.emag_editions (id) on delete set null,
  pdf_path text,

  -- Cents, matching Paystack's smallest-currency-unit convention so the
  -- value passes to the API unmodified. R49,00.
  price_cents int not null default 4900,

  status text not null default 'draft'
    check (status in ('draft', 'coming_soon', 'published')),

  -- Null until it actually goes out. The 60 day free window is measured
  -- from this and nothing else, so it must never be back-filled to a date
  -- the edition was not really available on.
  published_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists moxie_editions_published_idx
  on public.moxie_editions (published_at desc nulls last);

comment on table public.moxie_editions is
  'The catalogue moxiemag.co.za sells and lists. Points at an emag_editions row when the edition was built in Kwaai Press.';

-- ---------------------------------------------------------------------------
-- Subscriptions
-- ---------------------------------------------------------------------------

create table if not exists public.moxie_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,

  -- Paystack's own identifiers. subscription_code is what a cancellation
  -- and every renewal event is keyed on.
  paystack_customer_code text,
  paystack_subscription_code text unique,
  paystack_plan_code text,

  interval text not null default 'monthly'
    check (interval in ('monthly', 'annual')),

  status text not null default 'active'
    check (status in ('active', 'past_due', 'cancelled')),

  -- The whole entitlement rule turns on this date, so it is recorded once
  -- and never moved. A subscriber gets every edition published on or after
  -- the day they subscribed, which is what Dewald specified on 1 August
  -- 2026. Moving this date silently grants or removes back issues.
  started_at timestamptz not null default now(),
  current_period_end timestamptz,
  cancelled_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists moxie_subscriptions_user_idx
  on public.moxie_subscriptions (user_id, status);

-- ---------------------------------------------------------------------------
-- One-off purchases
-- ---------------------------------------------------------------------------

create table if not exists public.moxie_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  edition_id uuid not null references public.moxie_editions (id) on delete restrict,
  email text not null,
  amount_cents int not null,

  -- The idempotency key, and it is Paystack's transaction reference on
  -- purpose.
  --
  -- Paystack retries a webhook until it gets a 200, so charge.success
  -- arrives more than once as a matter of routine rather than as a fault.
  -- Deduplicating on anything derived from our own data, a user and edition
  -- pair for instance, would silently swallow a genuine second purchase and
  -- would also collide the moment somebody buys the same edition twice.
  -- The provider's reference is the only value that identifies one payment.
  paystack_reference text not null unique,

  status text not null default 'paid'
    check (status in ('paid', 'refunded')),

  created_at timestamptz not null default now()
);

create index if not exists moxie_purchases_user_idx
  on public.moxie_purchases (user_id, edition_id);

-- ---------------------------------------------------------------------------
-- Smart Value Club access codes
-- ---------------------------------------------------------------------------

-- Rotating per edition rather than one permanent code per member, because a
-- code that is shared, and it will be, then costs one edition instead of a
-- membership.
--
-- This is not protection and must never be described as protection anywhere
-- in the interface. Anything a browser displays can be captured. It limits
-- blast radius, nothing more.
create table if not exists public.moxie_access_codes (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.moxie_editions (id) on delete cascade,
  code text not null,

  -- What the batch was for, so an export can be traced back later.
  batch_label text,

  status text not null default 'unused'
    check (status in ('unused', 'used', 'revoked')),

  redeemed_by uuid references auth.users (id) on delete set null,
  redeemed_at timestamptz,

  created_at timestamptz not null default now(),

  unique (edition_id, code)
);

create index if not exists moxie_access_codes_edition_idx
  on public.moxie_access_codes (edition_id, status);

-- ---------------------------------------------------------------------------
-- Notify-me capture
-- ---------------------------------------------------------------------------

create table if not exists public.moxie_notify (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

-- Not optional and not tidiness. This project's default privileges give
-- service_role nothing on a new table, and the failure mode is not an error
-- a build would catch: the query returns an empty set and the page renders
-- as though the magazine has no editions. Learned the hard way on an
-- earlier table here.
grant select, insert, update, delete on public.moxie_editions to service_role;
grant select, insert, update, delete on public.moxie_subscriptions to service_role;
grant select, insert, update, delete on public.moxie_purchases to service_role;
grant select, insert, update, delete on public.moxie_access_codes to service_role;
grant select, insert, update, delete on public.moxie_notify to service_role;

-- Row level security on, with no policies for the anon and authenticated
-- roles. Every read and write goes through the service_role client in a
-- server action or route handler, where the entitlement check lives.
--
-- Deliberate: entitlement here is not "is this row yours", it is "was this
-- edition published more than 60 days ago, or does your subscription
-- predate it, or did you buy it, or did you redeem a code". That is a rule
-- about four tables and a clock, and expressing it as RLS policies would
-- scatter it across five files where a future change fixes three of them.
alter table public.moxie_editions enable row level security;
alter table public.moxie_subscriptions enable row level security;
alter table public.moxie_purchases enable row level security;
alter table public.moxie_access_codes enable row level security;
alter table public.moxie_notify enable row level security;
