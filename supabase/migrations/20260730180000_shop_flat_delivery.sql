-- A delivery fee the member sets, until live courier rates exist.
--
-- Checkout has been charging R0 for delivery since the shop was built, with
-- a comment saying live Bob Go rates arrive in Sprint 5. No member shop has
-- gone live yet, so nobody has been burned, but the first member to switch
-- Shop on would have sold with free delivery and paid the courier out of
-- their own margin without ever being told.
--
-- Dewald, 2026-07-30, on the courier question: members will use their own
-- Bob Go accounts, so the parcel, the claim and the liability stay with the
-- person who packed the box. That is the right model and it is also more
-- work than an afternoon. This is the honest interim: the member names a
-- price they know covers their own courier, the buyer sees it before
-- paying, and nobody is quietly out of pocket.
--
-- Deliberately flat rather than clever. A member who does not know their
-- own average courier cost is not helped by a zone table, and a wrong
-- number in a zone table is harder to spot than a wrong single number.
alter table public.growth_clients
  add column if not exists shop_flat_delivery_cents integer not null default 0;

-- Optional, and null means no such thing rather than zero, which would mean
-- "everything ships free" and is the opposite of not having set one.
alter table public.growth_clients
  add column if not exists shop_free_delivery_over_cents integer;

alter table public.growth_clients
  drop constraint if exists growth_clients_shop_delivery_check;

-- Negative delivery would pay the buyer to order.
alter table public.growth_clients
  add constraint growth_clients_shop_delivery_check
  check (
    shop_flat_delivery_cents >= 0
    and (shop_free_delivery_over_cents is null or shop_free_delivery_over_cents > 0)
  );

comment on column public.growth_clients.shop_flat_delivery_cents is
  'Flat delivery charged per order on this member''s shop, in cents. Zero means they genuinely deliver free, which is a choice rather than a default once the dashboard asks them for a number. Replaced by live courier rates when Bob Go is wired up.';

comment on column public.growth_clients.shop_free_delivery_over_cents is
  'Order subtotal in cents above which delivery is free. Null means no such offer. Never zero: that would read as everything shipping free.';
