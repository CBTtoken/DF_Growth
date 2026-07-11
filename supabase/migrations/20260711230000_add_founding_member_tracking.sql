-- Sprint 1, Build Item 1. Founding-member status is scoped to Growth ANNUAL
-- (R1,199/yr) signups only, capped at 10 - confirmed by Dewald 2026-07-11,
-- narrower than a first-read of the sprint doc which sounded tier-agnostic.
-- billing_cycle is still captured for every plan (useful data regardless of
-- founding eligibility), Foundation is always 'monthly' since it has no
-- annual option today.
alter table public.growth_clients add column is_founding_member boolean not null default false;

-- Unique (not just indexed) so Postgres itself enforces at most one row per
-- slot number - this is what makes the retry-on-conflict pattern in the
-- webhook safe against two genuinely concurrent Growth-annual signups both
-- computing the same "next" number at the same time. Null is allowed to
-- repeat under a standard unique constraint (every non-founding row stays
-- null), so this doesn't block anything else.
alter table public.growth_clients add column founding_signup_number integer unique;

alter table public.growth_clients add column billing_cycle text check (billing_cycle in ('monthly', 'annual'));
