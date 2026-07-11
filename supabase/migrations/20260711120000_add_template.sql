-- Which of the 10 landing-page layouts (see src/lib/templates/registry.ts)
-- a client has chosen. Null means the original hand-built "conversion"
-- layout — every existing client stays exactly as-is with no backfill
-- needed, since /g/[clientSlug]/page.tsx treats null the same as
-- 'conversion'.
alter table public.growth_clients add column template text;
