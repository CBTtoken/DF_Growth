-- STANDING365_LANDING_BUILD_SPEC_CLAUDE.md Sec 2 and 4: introduces a
-- reusable "custom" page type alongside the existing self-serve template
-- system, rather than a one-off hack for Standing 365 specifically. A
-- landing_pages row is either rendered by the standard template renderer
-- (the existing behaviour, default) or by its own hand-coded component
-- tree, looked up by custom_page_key against a small registry in code
-- (src/lib/custom-pages/registry.tsx) — the same shape as the existing
-- `template` column on growth_clients selecting among template renderers,
-- just for hand-built pages instead of templated ones.
alter table public.landing_pages
  add column page_type text not null default 'template' check (page_type in ('template', 'custom')),
  add column custom_page_key text;

-- Only a custom page ever needs a key to look itself up in the registry;
-- a template page's rendering is already fully determined by
-- growth_clients.template.
alter table public.landing_pages
  add constraint landing_pages_custom_page_key_check
  check (
    (page_type = 'custom' and custom_page_key is not null)
    or (page_type = 'template' and custom_page_key is null)
  );
