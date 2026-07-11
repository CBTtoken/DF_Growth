-- Sprint 1, Build Item 7 (connection pooling / RLS index audit). RLS
-- policies re-evaluate their filter/join columns on every query, and
-- Postgres does not automatically index the referencing side of a foreign
-- key (only the referenced/primary-key side) - none of these
-- growth_client_id columns had an index, meaning every RLS check on these
-- tables was an unindexed scan under the hood. landing_pages and
-- growth_members are already covered by their existing unique constraints
-- (a unique constraint creates an implicit index starting with its first
-- listed column), so they're excluded here - everything below was
-- genuinely unindexed. client_photos already has its own index from an
-- earlier migration.
create index testimonials_growth_client_id_idx on public.testimonials (growth_client_id);
create index generated_assets_growth_client_id_idx on public.generated_assets (growth_client_id);
create index generated_assets_testimonial_id_idx on public.generated_assets (testimonial_id);
create index capi_events_growth_client_id_idx on public.capi_events (growth_client_id);
create index leads_growth_client_id_idx on public.leads (growth_client_id);
create index leads_landing_page_id_idx on public.leads (landing_page_id);
