-- Needed to pick the "most recent" membership when a user belongs to more
-- than one growth_client (growth_members is a proper join table for exactly
-- this reason — a single .single() lookup elsewhere assumed one-to-one and
-- broke the moment a real user had two).
alter table public.growth_members add column created_at timestamptz not null default now();
