-- Real bug found live: the original book_orders migration enabled RLS but
-- never granted service_role access to the table at all, matching the
-- established RLS-is-not-a-grant lesson already learned once this session
-- for beta_events -- missed it again here. Confirmed live: the webhook's
-- own service-role client got "permission denied for table book_orders"
-- on every insert attempt, meaning no order could ever be written even
-- after the separate Paystack webhook URL bug was fixed.
grant select, insert, update on public.book_orders to service_role;
