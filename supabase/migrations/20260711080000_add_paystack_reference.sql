-- Found via a real stress test: using slug (derived from business_name) as
-- the webhook's idempotency check meant any two businesses that ever picked
-- the same name -- not just concurrent signups, any two, ever -- would
-- silently strand the second one after Paystack had already charged them.
-- Idempotency now keys on the actual Paystack transaction reference instead;
-- slug collisions are handled separately by auto-disambiguating the slug.
alter table public.growth_clients add column paystack_reference text unique;
