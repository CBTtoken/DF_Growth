-- STANDING365_LANDING_BUILD_SPEC_CLAUDE.md follow-up: Standard Paperback
-- orders can now be more than one copy (Personalised stays 1-per-order —
-- each one is its own unique cover name + message, a bulk request there
-- goes through email instead, per Dewald's own call).
alter table public.book_orders add column quantity integer not null default 1 check (quantity >= 1);
