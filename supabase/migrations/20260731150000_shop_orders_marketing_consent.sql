-- Marketing opt-in, carried across from book_orders.
--
-- Comparing the two tables column by column before moving the book over,
-- this was the one field with nowhere to land. book_orders.marketing_consent
-- records whether a buyer ticked the optional opt-in box at checkout, which
-- is separate from the required legal consent and unchecked by default.
--
-- It is not a field worth losing in a migration. It is the difference
-- between a buyer we may email again and one we may not, and if it went
-- missing the safe reading of a missing value is "no", which would quietly
-- discard permission someone actually gave. It also is not book-specific:
-- any seller taking orders can ask the same question.
alter table public.shop_orders
  add column if not exists marketing_consent boolean not null default false;

comment on column public.shop_orders.marketing_consent is
  'Buyer ticked the optional marketing opt-in at checkout. Separate from the required legal consent, and unchecked by default, so false means no permission was given rather than no answer.';
