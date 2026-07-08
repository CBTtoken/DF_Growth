-- CLAUDE.md Section 6 step 1 collects a contactEmail distinct from the
-- auth login email (e.g. a different day-to-day contact person), but the
-- original schema never gave it a column. Adding one rather than silently
-- dropping the field the spec's own wizard asks for.
alter table public.growth_clients add column contact_email text;
