-- A shop with twenty-two products in one flat grid is a list, not a shop.
--
-- WeCare Products is the case that forced this: she sells a collagen shake,
-- a moringa range and fourteen Bella Vita fragrance and turmeric lines. Those
-- are three different shopping trips, and a buyer who came for moringa should
-- not have to scroll past nine perfumes to find it.
--
-- Null is the default and means "ungrouped", which is what every existing
-- product is and what a member with four products should stay. The storefront
-- only groups when a shop actually has more than one collection in use, so
-- nothing changes for any shop that never sets this.
--
-- Free text rather than an enum or a lookup table on purpose: the collections
-- that make sense are the member's own words about their own range, and no
-- fixed list we invent would survive the next trade to sign up.

alter table shop_products
  add column if not exists collection text;

-- Ordering collections needs to be the member's choice too, not alphabetical.
-- A shop whose best range sorts under "W" should not be punished for it.
alter table shop_products
  add column if not exists collection_position integer not null default 0;

comment on column shop_products.collection is
  'Optional group heading on the storefront, e.g. "Moringa range". Null means ungrouped.';

comment on column shop_products.collection_position is
  'Sort order of this product''s collection on the storefront. Lower first.';

create index if not exists shop_products_collection_idx
  on shop_products (growth_client_id, collection_position, collection);
