-- Combined spec Sec 27: replaces the "Request your listing" mailto flow
-- with a plain Website URL field the client can set themselves, shown on
-- their public page as their website link. Real Marketplace
-- auto-provisioning is Core/Stoep-side work outside this repo (see the
-- migration and commit message for the rest of this section) — this is
-- just the one piece that's actually in Growth's scope today.
alter table public.growth_clients add column website_url text;
