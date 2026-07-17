-- Agent Referral Programme Sprint 2, Sec 4: a genuinely free, permanent
-- comped Growth page for an approved agent to promote their own business —
-- reuses Foundation's existing no-payment signup path entirely (same
-- onboarding wizard, same lack of a Paystack step) rather than a separate
-- flow, since Foundation already has zero payment involvement at signup.
-- The one thing that needed guarding: Foundation is actually a 7-day
-- trial that nudges toward payment afterward (trial_ends_at + the daily
-- reminder cron) — is_agent_comped is what tells onboard/actions.ts to
-- leave trial_ends_at null for this account, which the cron's own query
-- (.not("trial_ends_at", "is", null)) already excludes with no cron
-- changes needed at all.
alter table public.growth_clients add column is_agent_comped boolean not null default false;

-- One comped page per agent — set once they've completed the flow, both a
-- simple usage gate (can't run it twice) and a way for the agent's own
-- record to link back to their page.
alter table public.agents add column comped_client_id uuid references public.growth_clients (id);
