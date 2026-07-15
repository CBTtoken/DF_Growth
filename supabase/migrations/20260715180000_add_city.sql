-- Marketplace directory (backlog item, now in progress): a City filter needs
-- a real, consistent field to filter on — business_address today is one
-- free-text string ("77 Commissioner Street, Johannesburg" or "Online"),
-- which can't be reliably filtered or grouped. city is a separate, optional
-- column, same pattern as province — a fixed list in the app layer
-- (src/lib/cities.ts), stored as plain text here rather than a DB enum so
-- adding a town later is a code change, not a migration.
alter table public.growth_clients add column city text;
