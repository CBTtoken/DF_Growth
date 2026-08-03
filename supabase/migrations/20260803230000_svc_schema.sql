-- Smart Value Club: the whole Sprint 1 schema, in its own namespace.
--
-- SVC is a separate company being built inside this stack so it can be
-- lifted out later (SVC/SVC_Platform_Rebuild_Handoff.md section 3.2). Two
-- rules make that lift-out a schema dump instead of a rewrite, and both are
-- enforced here rather than remembered:
--
--   1. Every SVC table lives in the svc schema, never in public.
--   2. No foreign key crosses between svc and any Growth public table, in
--      either direction. auth.users is Supabase's own schema, not a Growth
--      table, so svc.member may reference it; identity lifts out with the
--      members by filtering the auth pool to ids present in svc.member.
--
-- Where SVC needs a Growth product (Moxie access, a KatisoBiz account), it
-- stores an opaque identifier and goes through an interface in code.
--
-- Access model, same as the Moxie site tables: row level security is ON for
-- every table with no anon/authenticated policies, and every read and write
-- goes through the service_role client in a server action or route handler,
-- where the entitlement check lives. Entitlement here is rules about money
-- and time ("is this subscription paid for this period"), not "is this row
-- yours", and RLS cannot express that without scattering it.
--
-- NOTE for the operator: after running this, the svc schema must be added
-- to the API's exposed schemas (Supabase dashboard, Settings > API >
-- "Exposed schemas") or every query against it returns a schema-not-found
-- error. The Sprint 1 report has the click-by-click.

create schema if not exists svc;

-- ---------------------------------------------------------------------------
-- Members
-- ---------------------------------------------------------------------------

-- The cell number is the canonical identifier (handoff section 6): it is
-- also the login the coupon provider keys on, confirmed by the MiFuel API
-- doc where MobileNumber is mandatory and "used as a unique identifier".
-- Stored normalised as digits only, no spaces, leading 0 national format.
create table if not exists svc.member (
  id uuid primary key default gen_random_uuid(),

  -- Supabase auth identity. One auth user can be a Moxie reader and an SVC
  -- member at once; this is the "logins converge, not merge" plan from the
  -- Moxie audit report section 4.
  auth_user_id uuid unique references auth.users (id) on delete restrict,

  cell_number text not null unique
    check (cell_number ~ '^0[0-9]{9}$'),
  -- Set when the OTP round-trip completes. A member row can exist briefly
  -- before verification finishes; nothing downstream (referrals, issuing)
  -- may trust an unverified number.
  cell_verified_at timestamptz,

  email text not null,
  first_name text not null,
  surname text not null,

  status text not null default 'pending'
    check (status in ('pending', 'active', 'suspended', 'cancelled')),

  -- POPIA consent is a fact with a timestamp, not a boolean that drifts.
  -- Marketing opt-in is a separate flag on purpose (handoff section 6):
  -- consent to be a member is not consent to be marketed to.
  popia_consent_at timestamptz not null,
  marketing_opt_in boolean not null default false,
  marketing_opt_in_at timestamptz,

  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists svc_member_auth_user_idx on svc.member (auth_user_id);

-- One-time codes for cell verification and cell login. Only a hash is
-- stored; the plaintext code exists in memory and in the delivery channel,
-- nowhere else. Rows are consumed on use and swept by expiry.
create table if not exists svc.otp_code (
  id uuid primary key default gen_random_uuid(),
  cell_number text not null,
  code_hash text not null,
  purpose text not null check (purpose in ('signup', 'login')),
  expires_at timestamptz not null,
  attempts int not null default 0,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists svc_otp_cell_idx on svc.otp_code (cell_number, purpose, created_at desc);

-- ---------------------------------------------------------------------------
-- Partners and benefits
-- ---------------------------------------------------------------------------

create table if not exists svc.partner (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_person text,
  contact_email text,
  contact_phone text,
  agreement_reference text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists svc.benefit (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references svc.partner (id) on delete restrict,
  name text not null,
  description text,
  benefit_type text not null check (benefit_type in
    ('coupon_pack', 'digital_download', 'magazine_access', 'service_access', 'voucher_batch')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Effective-dated rates, so a renegotiated rate does not rewrite history
-- (handoff section 6). The payout run applies the rate in effect for the
-- period being run, never the latest rate.
create table if not exists svc.benefit_rate (
  id uuid primary key default gen_random_uuid(),
  benefit_id uuid not null references svc.benefit (id) on delete cascade,
  cost_model text not null check (cost_model in
    ('per_active_member_per_month', 'per_redemption', 'revenue_share_percent', 'zero_cost')),
  -- Cents for the two Rand models; null for revenue share and zero cost.
  rate_cents int,
  -- Only for revenue_share_percent.
  revenue_share_percent numeric(5, 2),
  effective_from date not null,
  effective_to date,
  created_at timestamptz not null default now()
);

create index if not exists svc_benefit_rate_idx on svc.benefit_rate (benefit_id, effective_from);

-- ---------------------------------------------------------------------------
-- Packages
-- ---------------------------------------------------------------------------

-- A saleable tier. Versioned: the package builder's save creates a new row
-- sharing the same lineage_id, and existing members stay on their version
-- until moved (handoff 7.2). The public site renders the current active
-- version per lineage.
create table if not exists svc.package (
  id uuid primary key default gen_random_uuid(),
  lineage_id uuid not null default gen_random_uuid(),
  version int not null default 1,

  -- Which brand sells it: a Moxie-only subscription is a package in the
  -- same system (handoff section 6).
  brand text not null check (brand in ('svc', 'moxie')),

  name text not null,
  slug text not null,
  public_description text,

  monthly_price_cents int not null,
  annual_price_cents int,

  active boolean not null default true,
  is_current boolean not null default true,
  display_order int not null default 0,

  -- Free draw entries per active member per month, configurable per
  -- package so higher tiers can carry more (handoff 10.1).
  free_draw_entries int not null default 5,

  created_at timestamptz not null default now(),

  unique (lineage_id, version)
);

create index if not exists svc_package_current_idx on svc.package (brand, active, is_current, display_order);

create table if not exists svc.package_benefit (
  package_id uuid not null references svc.package (id) on delete cascade,
  benefit_id uuid not null references svc.benefit (id) on delete restrict,
  display_order int not null default 0,
  -- The stated face value this package advertises for this benefit. The
  -- public page's headline value claim is the sum of these and nothing
  -- else (handoff section 12: one claim, derived, rendered).
  face_value_cents int not null default 0,
  primary key (package_id, benefit_id)
);

-- Referral rates are configurable per package, depth fixed at three
-- (handoff section 8).
create table if not exists svc.referral_rate (
  package_id uuid not null references svc.package (id) on delete cascade,
  level int not null check (level in (1, 2, 3)),
  monthly_amount_cents int not null,
  primary key (package_id, level)
);

-- ---------------------------------------------------------------------------
-- Subscriptions and payments
-- ---------------------------------------------------------------------------

create table if not exists svc.subscription (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references svc.member (id) on delete restrict,
  package_id uuid not null references svc.package (id) on delete restrict,

  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'active', 'past_due', 'cancelled')),

  billing_interval text not null default 'monthly'
    check (billing_interval in ('monthly', 'annual')),

  -- Provider-opaque columns, so the payment provider drops in through
  -- configuration (handoff 3.1). Paystack in test mode today.
  provider text not null default 'paystack',
  provider_customer_code text,
  provider_subscription_code text unique,
  provider_plan_code text,

  started_at timestamptz,
  current_period_end timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists svc_subscription_member_idx on svc.subscription (member_id, status);

-- Webhook dedup and audit. The unique key is the provider's transaction
-- reference on purpose: Paystack retries a webhook until it gets a 200, so
-- the same event arrives more than once as routine. Deduplicating on
-- anything derived from our own data would swallow a genuine second
-- payment.
create table if not exists svc.payment_event (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'paystack',
  provider_reference text not null unique,
  event_type text not null,
  member_id uuid references svc.member (id) on delete set null,
  subscription_id uuid references svc.subscription (id) on delete set null,
  amount_cents int,
  payload jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- The benefit ledger: the spine of the platform
-- ---------------------------------------------------------------------------

-- One row per member per benefit per period, each state with its own
-- timestamp (handoff section 6). Everything else in the build sits on this
-- table: the savings counter reads redeemed realised value from it, the
-- draw earns entries from it, and the partner report is a group-by over it.
create table if not exists svc.benefit_issue (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references svc.member (id) on delete restrict,
  benefit_id uuid not null references svc.benefit (id) on delete restrict,
  package_id uuid references svc.package (id) on delete set null,

  -- The first of the issue month.
  period date not null,

  status text not null default 'issued'
    check (status in ('issued', 'opened', 'claimed', 'redeemed', 'expired')),

  issued_at timestamptz not null default now(),
  opened_at timestamptz,
  claimed_at timestamptz,
  redeemed_at timestamptz,
  expired_at timestamptz,

  face_value_cents int not null default 0,
  -- Only ever set on redemption, and the savings counter reads this column
  -- alone. Never show a member a total of what they were promised
  -- (handoff 7.1).
  realised_value_cents int,

  -- Where the redemption record came from, in descending order of
  -- strength (handoff 10.2). Null until a redemption is recorded.
  verification_source text
    check (verification_source in ('provider_redeemed', 'provider_checkout', 'self_reported')),

  -- A unique coupon/voucher code where one exists.
  unique_code text,
  voucher_batch_id uuid,

  created_at timestamptz not null default now(),

  unique (member_id, benefit_id, period)
);

create index if not exists svc_benefit_issue_member_idx on svc.benefit_issue (member_id, period);
create index if not exists svc_benefit_issue_benefit_idx on svc.benefit_issue (benefit_id, period, status);

-- Batch stock control: issuing blocks once the supplied quantity is
-- exhausted, which is what stops five thousand vouchers going out when a
-- chain supplied five hundred (handoff section 6).
create table if not exists svc.voucher_batch (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references svc.partner (id) on delete restrict,
  benefit_id uuid not null references svc.benefit (id) on delete restrict,
  quantity_supplied int not null check (quantity_supplied > 0),
  quantity_issued int not null default 0 check (quantity_issued >= 0),
  quantity_redeemed int not null default 0 check (quantity_redeemed >= 0),
  expiry date,
  code_source text,
  created_at timestamptz not null default now(),
  check (quantity_issued <= quantity_supplied)
);

alter table svc.benefit_issue
  add constraint svc_benefit_issue_batch_fk
  foreign key (voucher_batch_id) references svc.voucher_batch (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Referrals
-- ---------------------------------------------------------------------------

-- Set at signup, never edited afterwards except by admin action with a
-- reason and an audit row (handoff section 8). A referred member appears
-- once per level per ancestor: signing up under someone creates up to
-- three rows, one at each level of the chain above them, and never a
-- fourth.
create table if not exists svc.referral (
  id uuid primary key default gen_random_uuid(),
  referrer_member_id uuid not null references svc.member (id) on delete restrict,
  referred_member_id uuid not null references svc.member (id) on delete restrict,
  level int not null check (level in (1, 2, 3)),
  status text not null default 'active' check (status in ('active', 'ended')),
  created_at timestamptz not null default now(),

  unique (referred_member_id, level),
  check (referrer_member_id <> referred_member_id)
);

create index if not exists svc_referral_referrer_idx on svc.referral (referrer_member_id, status);

create table if not exists svc.referral_audit (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references svc.referral (id) on delete cascade,
  changed_by uuid references auth.users (id) on delete set null,
  reason text not null,
  old_referrer_member_id uuid,
  new_referrer_member_id uuid,
  created_at timestamptz not null default now()
);

-- One row per referral per month in which the referred member's
-- subscription was paid and active. A lapsed member earns nobody anything
-- for that month (handoff section 8).
create table if not exists svc.referral_earning (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references svc.referral (id) on delete restrict,
  period date not null,
  amount_cents int not null,
  created_at timestamptz not null default now(),
  unique (referral_id, period)
);

-- ---------------------------------------------------------------------------
-- The draw
-- ---------------------------------------------------------------------------

create table if not exists svc.draw (
  id uuid primary key default gen_random_uuid(),
  period date not null unique,
  prize_description text not null,
  prize_value_cents int,

  -- Published cutoff; after freezing nothing can be added, altered or
  -- deleted, including by admin (handoff 10.3).
  cutoff_at timestamptz not null,
  frozen_at timestamptz,

  -- Configurable per draw (handoff 10.3).
  free_entries_per_member int not null default 5,
  earn_threshold_cents int not null default 5000,
  ticket_price_cents int,

  -- Purchased entries are gated behind this flag, defaulted off, and it
  -- switches on only when Dewald confirms his legal team has cleared the
  -- structure in writing (handoff 10.1).
  purchase_enabled boolean not null default false,

  -- Seeded random selection; seed and total entry count recorded and
  -- published after the draw (handoff 10.3).
  seed text,
  total_entries int,
  winner_member_id uuid references svc.member (id) on delete set null,

  status text not null default 'open'
    check (status in ('open', 'frozen', 'drawn', 'published')),

  created_at timestamptz not null default now()
);

create table if not exists svc.draw_entry (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references svc.draw (id) on delete cascade,
  member_id uuid not null references svc.member (id) on delete restrict,
  source text not null check (source in ('free', 'earned', 'purchased')),
  entry_count int not null check (entry_count > 0),
  entry_purchase_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists svc_draw_entry_draw_idx on svc.draw_entry (draw_id, member_id);

create table if not exists svc.entry_purchase (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references svc.draw (id) on delete restrict,
  member_id uuid not null references svc.member (id) on delete restrict,
  amount_cents int not null,
  entry_count int not null check (entry_count > 0),
  provider_reference text not null unique,
  status text not null default 'paid' check (status in ('paid', 'refunded')),
  created_at timestamptz not null default now()
);

alter table svc.draw_entry
  add constraint svc_draw_entry_purchase_fk
  foreign key (entry_purchase_id) references svc.entry_purchase (id) on delete restrict;

-- ---------------------------------------------------------------------------
-- Payouts and demand capture
-- ---------------------------------------------------------------------------

-- Generated, never entered, and moves no money (handoff section 6).
create table if not exists svc.payout_line (
  id uuid primary key default gen_random_uuid(),
  payee_type text not null check (payee_type in ('partner', 'member')),
  partner_id uuid references svc.partner (id) on delete restrict,
  member_id uuid references svc.member (id) on delete restrict,
  period date not null,
  source text not null,
  item_count int not null default 0,
  rate_cents int,
  amount_cents int not null,
  paid_at timestamptz,
  paid_reference text,
  created_at timestamptz not null default now(),
  check (
    (payee_type = 'partner' and partner_id is not null and member_id is null) or
    (payee_type = 'member' and member_id is not null and partner_id is null)
  )
);

create index if not exists svc_payout_line_period_idx on svc.payout_line (period, payee_type);

-- "Which shop or product should we get coupons for next?" Free text plus a
-- category; admin sees an aggregated view ordered by count (handoff 7.4).
create table if not exists svc.demand_signal (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references svc.member (id) on delete cascade,
  category text not null,
  message text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Admin settings
-- ---------------------------------------------------------------------------

-- Weights, caps and switches are admin settings, not constants in code
-- (handoff 10.2). Seeded with the defaults the handoff names, all
-- conservative: testimonials and member counts ship OFF.
create table if not exists svc.setting (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into svc.setting (key, value) values
  ('checkout_weight', '0.5'),
  ('self_report_entry_cap', '10'),
  ('testimonials_enabled', 'false'),
  ('member_count_enabled', 'false')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Grants and row level security
-- ---------------------------------------------------------------------------

-- Not optional. This project's default privileges give service_role nothing
-- on a new table, and the failure mode is a silently empty page, not an
-- error. For a brand new schema the same applies to the schema itself.
grant usage on schema svc to service_role;
grant select, insert, update, delete on all tables in schema svc to service_role;
alter default privileges in schema svc
  grant select, insert, update, delete on tables to service_role;

-- RLS on everywhere, with no anon/authenticated policies: every access is
-- server-side through service_role, same pattern as the Moxie site tables.
alter table svc.member enable row level security;
alter table svc.otp_code enable row level security;
alter table svc.partner enable row level security;
alter table svc.benefit enable row level security;
alter table svc.benefit_rate enable row level security;
alter table svc.package enable row level security;
alter table svc.package_benefit enable row level security;
alter table svc.referral_rate enable row level security;
alter table svc.subscription enable row level security;
alter table svc.payment_event enable row level security;
alter table svc.benefit_issue enable row level security;
alter table svc.voucher_batch enable row level security;
alter table svc.referral enable row level security;
alter table svc.referral_audit enable row level security;
alter table svc.referral_earning enable row level security;
alter table svc.draw enable row level security;
alter table svc.draw_entry enable row level security;
alter table svc.entry_purchase enable row level security;
alter table svc.payout_line enable row level security;
alter table svc.demand_signal enable row level security;
alter table svc.setting enable row level security;

-- ---------------------------------------------------------------------------
-- Seed data
-- ---------------------------------------------------------------------------

-- The package list and prices are OPEN ITEM 4 in the handoff: the site
-- shows one tier at R49, the March minutes show R59 bundled and R65
-- magazine only, and the brand brief lists Silver/Gold/Platinum as coming.
-- Dewald decides; this seeds the current site's single R49 tier plus the
-- existing Moxie plans so the public pages render from the database from
-- day one. Changing a price is an update to svc.package, not a deploy.
--
-- Face values seed at R750 per retailer group (the only per-retailer figure
-- the current site states), so the derived headline renders R2,250. The
-- three circulating claims (R2,000+ / R2,250 / R3,049+) are Dewald's to
-- settle; the page renders whatever these rows sum to.

do $$
declare
  v_coupon_partner uuid;
  v_moxie_partner uuid;
  v_t4w_partner uuid;
  v_venora_partner uuid;
  v_dischem uuid;
  v_checkers uuid;
  v_pnp uuid;
  v_moxie_benefit uuid;
  v_ecourse uuid;
  v_ebook uuid;
  v_svc_package uuid;
  v_moxie_package uuid;
begin
  -- Partners. The coupon provider's commercial identity is Herminix (Pty)
  -- Ltd, trading platform MiFuel, per the API implementation guide in
  -- SVC/MiFuel API - V1.4.pdf.
  insert into svc.partner (name, notes)
  values ('Herminix (MiFuel)', 'Coupon provider. Server-to-server member API documented; catalogue and redemption docs outstanding.')
  returning id into v_coupon_partner;

  insert into svc.partner (name, notes)
  values ('Moxie Magazine', 'SVC''s own magazine, delivered from the Growth-hosted Moxie build through an identifier, never a join.')
  returning id into v_moxie_partner;

  -- Benefits.
  insert into svc.benefit (partner_id, name, description, benefit_type)
  values (v_coupon_partner, 'Dis-Chem coupon pack',
          'Monthly grocery and pharmacy coupons for Dis-Chem.', 'coupon_pack')
  returning id into v_dischem;

  insert into svc.benefit (partner_id, name, description, benefit_type)
  values (v_coupon_partner, 'Checkers / Shoprite coupon pack',
          'Monthly grocery coupons for Checkers and Shoprite.', 'coupon_pack')
  returning id into v_checkers;

  insert into svc.benefit (partner_id, name, description, benefit_type)
  values (v_coupon_partner, 'Pick n Pay coupon pack',
          'Monthly grocery coupons for Pick n Pay.', 'coupon_pack')
  returning id into v_pnp;

  insert into svc.benefit (partner_id, name, description, benefit_type)
  values (v_moxie_partner, 'Moxie Magazine',
          'South Africa''s family discovery magazine, every edition the day it comes out.', 'magazine_access')
  returning id into v_moxie_benefit;

  -- The digital education benefits from the Monthly Saver product document
  -- (SVC/The Monthly Saver - Product Page content.docx): one Train 4
  -- Wealth online course and one Venora e-book per member per month.
  insert into svc.partner (name, notes)
  values ('Train 4 Wealth', 'Online financial and skills education, train4wealth.com. Delivered by voucher code per the Monthly Saver document; delivery mechanics to confirm with Dewald.')
  returning id into v_t4w_partner;

  insert into svc.partner (name, notes)
  values ('Venora', 'Digital e-book library, venora.co.za. Delivery mechanics to confirm with Dewald.')
  returning id into v_venora_partner;

  insert into svc.benefit (partner_id, name, description, benefit_type)
  values (v_t4w_partner, 'Online e-course',
          'One full online course from Train 4 Wealth each month, yours to keep.', 'digital_download')
  returning id into v_ecourse;

  insert into svc.benefit (partner_id, name, description, benefit_type)
  values (v_venora_partner, 'E-book of your choice',
          'Any e-book from the Venora digital library, included every month.', 'digital_download')
  returning id into v_ebook;

  -- Rates: unknown until the MiFuel commercials arrive (Appendix A Q11),
  -- so the coupon packs carry no rate row yet and the package builder will
  -- show that plainly in Sprint 3. Moxie access is internal.

  -- Packages.
  insert into svc.package (brand, name, slug, public_description,
                           monthly_price_cents, annual_price_cents, display_order)
  values ('svc', 'SVC Membership', 'svc-membership',
          'Monthly grocery and pharmacy coupons for the stores you already shop at, the Moxie digital magazine, and five free draw entries every month.',
          4900, null, 1)
  returning id into v_svc_package;

  insert into svc.package (brand, name, slug, public_description,
                           monthly_price_cents, annual_price_cents, display_order)
  values ('moxie', 'Moxie Magazine', 'moxie-magazine',
          'Every new edition of Moxie the day it comes out.',
          4900, 49000, 1)
  returning id into v_moxie_package;

  insert into svc.package_benefit (package_id, benefit_id, display_order, face_value_cents) values
    (v_svc_package, v_dischem, 1, 75000),
    (v_svc_package, v_checkers, 2, 75000),
    (v_svc_package, v_pnp, 3, 75000),
    (v_svc_package, v_ecourse, 4, 100000),
    (v_svc_package, v_ebook, 5, 4900),
    (v_svc_package, v_moxie_benefit, 6, 4900),
    (v_moxie_package, v_moxie_benefit, 1, 4900);

  -- Referral rates: the approved three-level structure (handoff section 8)
  -- on the SVC package. Moxie-only subscriptions carry no referral
  -- programme until Dewald says otherwise.
  insert into svc.referral_rate (package_id, level, monthly_amount_cents) values
    (v_svc_package, 1, 500),
    (v_svc_package, 2, 250),
    (v_svc_package, 3, 150);
end $$;
