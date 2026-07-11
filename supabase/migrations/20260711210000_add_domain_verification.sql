-- Verification codes for Google Search Console and Meta Business domain
-- verification, both of which work the same way: a single meta tag with a
-- client-provided content string, injected into the public page's <head>.
alter table public.growth_clients add column google_site_verification text;
alter table public.growth_clients add column facebook_domain_verification text;
