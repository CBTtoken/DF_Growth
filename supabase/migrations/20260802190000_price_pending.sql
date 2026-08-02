-- A product that is listed but cannot be bought yet, because nobody has
-- said what it costs.
--
-- Dewald, 2026-08-02, on the first done-for-you client build: "for the
-- products with no pricing, build them with a zero price but block orders
-- till we have her prices."
--
-- Zero on its own cannot carry that meaning. Zero is a real price: it is
-- what a free sample costs, and it is already what the delivery columns use
-- to mean "I do not charge for this". Overloading it here would make every
-- unpriced product silently orderable for nothing, which is the exact
-- failure this flag exists to prevent, and the first person to find it
-- would be a stranger buying a bottle of concentrate for R0.
--
-- So the price stays zero as instructed and this says why it is zero. The
-- moment a real price is entered the flag comes off and the product becomes
-- buyable, with no migration and nothing to remember.
alter table public.shop_products
  add column if not exists price_pending boolean not null default false;

comment on column public.shop_products.price_pending is
  'The product is listed and described but has no price yet, so it cannot be ordered. Shown to buyers as "Price on request". Set false the moment a real price is entered. Distinct from a base_price_cents of zero, which is a genuine free item.';

-- Nothing existing changes: every product that already has a price keeps
-- the default of false and stays buyable exactly as before.
