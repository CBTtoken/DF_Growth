-- A coupon's uses_count has never once been incremented.
--
-- Found while rewriting checkout for the storefront sprint. The column has
-- existed since the shop was first built, checkout reads it to enforce
-- max_uses, and the dashboard prints "used N times" next to every code. It
-- has been zero on every row since the day it was created, because nothing
-- ever wrote to it. So max_uses has never actually limited anything: a code
-- capped at ten uses would have been redeemed forever, and the seller's own
-- screen would have kept telling them it had never been used at all.
--
-- Not fixed in application code for the same reason the stock decrement is
-- not: supabase-js's .update() cannot reference a column's own current
-- value, and a read-then-write pair loses the race that a shared discount
-- code is most likely to lose, which is two people redeeming the last use
-- at the same moment.
create or replace function public.increment_coupon_use(p_coupon_id uuid)
returns void
language sql
as $$
  update public.shop_coupons
  set uses_count = uses_count + 1
  where shop_coupons.id = p_coupon_id;
$$;

grant execute on function public.increment_coupon_use(uuid) to service_role;
