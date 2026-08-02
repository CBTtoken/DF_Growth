-- Sprint 1 of docs/Handoff_Growth_Shop_and_Payments.md: the shop becomes a
-- storefront, and every product gets a page of its own.
--
-- What was wrong with the old one is not that it was ugly. It was that a
-- product had no URL. There was nothing to put in a WhatsApp message,
-- nothing for Google to index, and nothing a buyer could look at for longer
-- than the two lines that fitted on a card. The handoff calls the product
-- page the most valuable part of this sprint and that is right.
--
-- Everything here is additive apart from one constraint that is relaxed
-- (customer_email stops being required, see below). Two shops exist today,
-- one of them a test page and the other Standing 365, which renders its own
-- custom page and never touches ShopSection. So this lands with nothing
-- live to break, which is the moment to do it.

-- ============================================================
-- Products: a URL, a choice about featuring, a choice about stock
-- ============================================================

-- The address of the product page. Per client rather than globally unique,
-- because two members are both allowed to sell a "beaded-bracelet" and
-- neither should have to find out the other got there first.
alter table public.shop_products
  add column if not exists slug text;

comment on column public.shop_products.slug is
  'The product page URL segment, unique within one member. Generated from the title when a product is saved, and kept stable afterwards so a link already sitting in somebody''s WhatsApp thread does not die when the member edits the title.';

-- The member decides what is featured on their landing page.
--
-- What this replaces is a row headed "Most popular", ranked by sale_count,
-- on a shop that has never sold anything. On day one that heading is a
-- claim about three products that nobody has ever bought, presented to the
-- buyer as social proof. The handoff is explicit: no sales data means no
-- popularity claim. The member chooses, and if they have not chosen, the
-- fallback is the most recently added, which claims nothing.
alter table public.shop_products
  add column if not exists is_featured boolean not null default false;

comment on column public.shop_products.is_featured is
  'Member picked this to show on their landing page. No product is featured by default, and the landing page falls back to most recently added rather than inventing a popularity ranking out of no sales.';

-- Whether a stock number means anything for this product.
--
-- Off by default and that is the deliberate choice. The target member makes
-- things by hand or buys in small lots, and a shop that says "Out of stock"
-- because they never updated a number they did not know they had is a shop
-- that turns away real money. A member who does count stock switches this
-- on per product and then the number is shown and enforced.
alter table public.shop_products
  add column if not exists track_stock boolean not null default false;

comment on column public.shop_products.track_stock is
  'Show and enforce the stock number for this product. Off by default: an untracked product never says out of stock, because a wrong zero costs a sale and an unknown number is the normal case for a solo seller.';

-- Backfill a slug for every product that already exists, from its title.
--
-- Done in SQL rather than in application code so that the not-null
-- constraint below can be added in the same breath. The row_number suffix
-- only appears where two titles in one shop would collide.
with slugged as (
  select
    id,
    growth_client_id,
    coalesce(
      nullif(regexp_replace(lower(trim(title)), '[^a-z0-9]+', '-', 'g'), '-'),
      'product'
    ) as base
  from public.shop_products
  where slug is null
),
trimmed as (
  select id, growth_client_id, trim(both '-' from base) as base from slugged
),
numbered as (
  select
    id,
    case
      when base = '' then 'product'
      else base
    end as base,
    row_number() over (partition by growth_client_id, base order by id) as n
  from trimmed
)
update public.shop_products p
set slug = case when numbered.n = 1 then numbered.base else numbered.base || '-' || numbered.n end
from numbered
where p.id = numbered.id;

alter table public.shop_products
  alter column slug set not null;

-- Two products in one shop cannot share an address. Across shops they can,
-- because the member's own slug is the segment above it in the path.
create unique index if not exists shop_products_client_slug_idx
  on public.shop_products (growth_client_id, slug);

-- The storefront and the featured row both read in this order.
create index if not exists shop_products_client_active_idx
  on public.shop_products (growth_client_id, status, position, created_at desc);

-- ============================================================
-- Delivery: what this member actually offers
-- ============================================================

-- Collection only, a flat rate, or quote on request.
--
-- The flat rate and the free-over threshold already existed and are kept
-- exactly as they are, so a member who has set them keeps the behaviour
-- they have. What was missing is the other two answers. A member who only
-- does collection had to pretend to charge zero for delivery, which reads
-- to a buyer as free nationwide shipping, and a member who works out
-- courier cost per order by hand had no way to say so at all.
alter table public.growth_clients
  add column if not exists shop_delivery_mode text not null default 'flat';

alter table public.growth_clients
  drop constraint if exists growth_clients_shop_delivery_mode_check;

alter table public.growth_clients
  add constraint growth_clients_shop_delivery_mode_check
  check (shop_delivery_mode in ('collection_only', 'flat', 'quote_on_request'));

comment on column public.growth_clients.shop_delivery_mode is
  'What this member offers at checkout. "flat" uses shop_flat_delivery_cents and is the default so that every existing shop behaves exactly as it did before this column existed. "collection_only" asks for no address at all. "quote_on_request" takes the order with an address and no delivery charge, and tells the buyer the seller will confirm the cost.';

-- ============================================================
-- Orders: how it is being handed over, and what the seller wrote down
-- ============================================================

alter table public.shop_orders
  add column if not exists delivery_method text not null default 'delivery';

alter table public.shop_orders
  drop constraint if exists shop_orders_delivery_method_check;

alter table public.shop_orders
  add constraint shop_orders_delivery_method_check
  check (delivery_method in ('delivery', 'collection'));

comment on column public.shop_orders.delivery_method is
  'Whether the buyer chose delivery or collection. Every order before this column existed was a delivery, which is what the default records.';

-- The seller's own note against an order.
--
-- Asked for in the handoff and genuinely needed on the no-gateway path,
-- which is the common one: the whole flow depends on the member phoning the
-- buyer to arrange payment, and without somewhere to write "paying Friday,
-- EFT" that conversation only exists in their head.
alter table public.shop_orders
  add column if not exists member_note text;

comment on column public.shop_orders.member_note is
  'The seller''s own note against an order, for their eyes only. Never shown to the buyer and never included in the buyer''s confirmation.';

-- Email stops being required.
--
-- The handoff asks for name, contact number, and "email if they want a
-- receipt". That is the right way round for this market: a buyer on a phone
-- has a number they know by heart and may well not have an email address
-- they can type accurately, and a required field they cannot fill is a
-- field they abandon the cart on.
--
-- Nothing in the codebase writes a null here today, and the book flow keeps
-- asking for it, so this only widens what is allowed.
alter table public.shop_orders
  alter column customer_email drop not null;

-- A phone number is now how a seller reaches a buyer who has not paid, so
-- the two contact columns swap importance. Not made not-null, because the
-- one real order already in this table predates the field.
comment on column public.shop_orders.customer_phone is
  'How the seller reaches the buyer. On the no-gateway path this is the whole mechanism: the seller phones or messages to arrange payment, so checkout requires it even though the column allows null for the orders taken before it did.';

comment on column public.shop_orders.customer_email is
  'Optional. Only collected when the buyer wants a receipt or an update by email. Null means they did not give one, not that it went missing.';

-- ============================================================
-- The member's own payment gateway
-- ============================================================

-- Sprint 2 builds the screen a member uses to connect a gateway, and adds
-- Bob Pay alongside this. What Sprint 1 needs is only the reading half: a
-- checkout that takes real money when a key is present and records an
-- unpaid order when it is not.
--
-- Stored encrypted next to the Meta CAPI token and the Bob Go token, using
-- the same AES-256-GCM helper. Never read back into a browser, never
-- logged, never exported.
--
-- This is the member's own Paystack account. Their buyer's money goes to
-- them directly. There is no split, no subaccount and no DigitalFlyer
-- account anywhere on this path, which is the one rule in the handoff that
-- is stated three times.
alter table public.growth_client_secrets
  add column if not exists paystack_secret_encrypted text;

comment on column public.growth_client_secrets.paystack_secret_encrypted is
  'The member''s own Paystack secret key, encrypted at rest. Their buyers pay them directly. Never returned to the browser, never written to a log, never included in an export.';

-- Paystack hands back a reference we have to match to an order, and
-- matching it to anything derived from user input would be a bug waiting
-- for two buyers with the same name.
create index if not exists shop_orders_paystack_ref_idx
  on public.shop_orders (paystack_reference)
  where paystack_reference is not null;

-- ============================================================
-- Product images
-- ============================================================

-- shop_products.image_paths has existed since the shop was first built and
-- has been an empty array on every row ever created, because nothing ever
-- uploaded to it. This is the bucket those paths point into.
--
-- Public, for the same reason the member logo bucket is: a product photo is
-- the single most important thing on a page whose entire job is to be
-- opened by a stranger from a link. Signing a URL for it would buy nothing
-- and cost the link preview, which needs a plain fetchable image.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'shop-products',
  'shop-products',
  true,
  5242880, -- 5MB, enforced by the storage layer as well as in the action
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "shop product images are publicly readable" on storage.objects;
create policy "shop product images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'shop-products');

-- No insert, update or delete policy for anon or authenticated, matching
-- every other bucket here. Uploads go through a Server Action running as
-- the service role, which checks the member owns the product first.
-- Without that, any signed-in member could write into another member's
-- folder.
