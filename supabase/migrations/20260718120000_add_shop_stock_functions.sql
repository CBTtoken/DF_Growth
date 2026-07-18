-- Booking & Shop Modules Sprint 3 (docs/GROWTH_BOOKING_SHOP_MODULES_CLAUDE.md
-- Sec 4.7: "Stock quantity updates run as atomic transactions during
-- checkout to prevent overselling during concurrent purchases.")
--
-- supabase-js's `.update()` takes a plain column->value object — it cannot
-- reference a column's own current value in the SET clause (no
-- `stock_quantity = stock_quantity - $1` via the fluent API), so a truly
-- atomic conditional decrement needs a real Postgres function, not a
-- read-then-write pair from the app (which is exactly the race this
-- requirement exists to prevent). First RPC function in this codebase —
-- every other atomic-ish operation so far has used unique-constraint-plus-
-- retry instead, but that pattern doesn't fit "decrement only if enough
-- stock remains."
create or replace function public.decrement_variant_stock(p_variant_id uuid, p_quantity integer)
returns table (id uuid, stock_quantity integer)
language sql
as $$
  update public.shop_product_variants
  set stock_quantity = stock_quantity - p_quantity, updated_at = now()
  where shop_product_variants.id = p_variant_id and shop_product_variants.stock_quantity >= p_quantity
  returning shop_product_variants.id, shop_product_variants.stock_quantity;
$$;

-- Sec 4.3: "the top 3 best-performing items surface automatically" — needs
-- an atomic increment for the same reason as the decrement above, just
-- without the conditional guard (a sale_count over-count from a rare
-- concurrent double-call is cosmetic, unlike overselling real stock).
create or replace function public.increment_product_sale_count(p_product_id uuid, p_quantity integer)
returns void
language sql
as $$
  update public.shop_products
  set sale_count = sale_count + p_quantity
  where shop_products.id = p_product_id;
$$;

grant execute on function public.decrement_variant_stock(uuid, integer) to service_role;
grant execute on function public.increment_product_sale_count(uuid, integer) to service_role;
