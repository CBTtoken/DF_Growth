-- DigitalFlyer SA Master Technical Build Scope, Section 2: every deployment's
-- identity table gets this column now, nullable, unused until Phase 2
-- consolidation. Growth stays on its own separate Supabase project (Phase 1
-- federation) — this is not a foreign key, just a placeholder for a shared
-- identifier once cross-product identity is actually unified.
alter table public.growth_clients add column digitalflyer_member_ref text;
