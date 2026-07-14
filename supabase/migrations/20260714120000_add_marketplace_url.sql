-- Public Beta Polish Sprint Sec 11: splits the Marketplace listing link
-- from the client's own Website URL, which was previously doing double
-- duty (see EcosystemAccess.tsx's own prior comment on this). Admin-only —
-- never exposed to the client during onboarding or in their dashboard,
-- set by Dewald once a client's real Marketplace listing exists. Never
-- auto-generated from a subdomain guess.
alter table public.growth_clients add column marketplace_url text;
