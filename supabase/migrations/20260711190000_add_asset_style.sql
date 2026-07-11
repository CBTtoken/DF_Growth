-- Which of the social-asset visual styles (src/lib/assets/styles.tsx) a
-- client has chosen for auto-generated testimonial images. Null means the
-- original single design ("clean") — same null-is-the-default pattern as
-- growth_clients.template, so nothing changes for a client who never picks
-- one.
alter table public.growth_clients add column asset_style text;
