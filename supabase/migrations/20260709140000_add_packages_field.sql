-- Lets a client show their own service packages / pricing tiers on their
-- landing page (e.g. a gym's Basic/Standard/Premium memberships). Nullable
-- and optional throughout — most small businesses won't have named
-- packages, and the wizard step that captures this is explicitly skippable.
-- Stored as jsonb (array of {name, price, description}) rather than flat
-- columns since it's structured, variable-length data, same precedent as
-- growth_clients.ai_landing_draft.
alter table public.growth_clients add column packages jsonb;
