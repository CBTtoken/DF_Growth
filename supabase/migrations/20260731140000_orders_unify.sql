-- Bringing the book into the shop, so there is one orders system.
--
-- Dewald, 31 July: "can you bring the book in as if it is one of our own
-- members without breaking our current page?"
--
-- Two order systems already existed. book_orders, built for Standing 365,
-- carrying one book and its personalisation. shop_orders, built for
-- members, carrying multiple line items, coupons, separate shipping and
-- courier tracking, and never used once: zero rows.
--
-- shop_orders is the better model and the one a member would get, so the
-- book moves into it rather than a third system being invented. What
-- shop_orders lacked was batching, which is genuinely useful beyond books:
-- anything made to order in runs wants it.
--
-- book_orders is deliberately left in place and untouched by this
-- migration. It holds a real paid order from a real customer, and it stays
-- readable until the new path has proven itself on live traffic.

-- Batching, generalised. A print run today, but the same idea covers any
-- product made in batches rather than held in stock.
alter table public.shop_orders
  add column if not exists batch_number integer;

comment on column public.shop_orders.batch_number is
  'Groups orders that are produced together, such as a print run. Null until the seller assigns one. The dates buyers are told about live on order_batches, not here, so one update covers the whole run.';

create index if not exists shop_orders_batch_idx
  on public.shop_orders (growth_client_id, batch_number)
  where batch_number is not null;

-- book_batches was created yesterday and is one day old with nothing
-- outside this codebase depending on it. Renamed now, while that is still
-- free, because it is no longer about books.
alter table if exists public.book_batches rename to order_batches;

comment on table public.order_batches is
  'A production run. Orders point at one by number. Holds the dates a buyer is told about, so one update covers everyone in the run rather than fifty rows that can drift apart.';

-- Personalisation has no column of its own on purpose. shop_orders carries
-- line_items as jsonb, and a personalised copy is a property of the line,
-- not of the order: somebody could reasonably buy one plain copy and one
-- inscribed to their mother in a single checkout, which book_orders could
-- never express.
--
-- The shape each line uses:
--   { product, variant, quantity, unit_price_cents,
--     personalisation: { recipient_name, gift_message } | null }
