-- Booking & Shop Modules Sprint 1 (docs/GROWTH_BOOKING_SHOP_MODULES_CLAUDE.md
-- Sec 1: "a Growth client can optionally switch on Booking... or Shop").
--
-- Not explicitly named in Sec 5's data model, but needed so "enabled" is a
-- real flag rather than inferred from row existence in bookable_units/
-- shop_products (a client could have draft setup rows without being ready
-- to go live). shop_collection_address is Sec 4.1's required physical
-- pickup address for courier collection.
alter table public.growth_clients
  add column booking_enabled boolean not null default false,
  add column shop_enabled boolean not null default false,
  add column shop_collection_address jsonb;
