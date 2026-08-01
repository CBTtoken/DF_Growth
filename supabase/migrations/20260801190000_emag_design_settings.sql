-- The publication's own design values.
--
-- Dewald, 1 August 2026: "even though we are building this for me to do
-- Moxie, the aim is to turn this into a product for any magazine editor and
-- publisher, so let's not make things the only option, let's build with
-- multiplying in mind".
--
-- So the type scale, the page geometry and the house rules stop being
-- constants in a stylesheet and become settings on the publication. Moxie's
-- values, from its Editorial and Design Reference, are the defaults rather
-- than the law. A second publication is then a second row, not a fork of
-- the renderer.
--
-- One object rather than forty columns. These are read together, written
-- together on one settings screen, and never queried individually, and a
-- new control would otherwise mean a migration every time.
alter table public.emag_publications
  add column if not exists design jsonb not null default '{}'::jsonb;

-- The rules a publication enforces on its own copy.
--
-- "No em dashes" is Moxie's house rule, not a fact about magazines. Holding
-- it here means the next publication can have its own rules, or none, and
-- the check reads them rather than knowing them.
alter table public.emag_publications
  add column if not exists house_rules jsonb not null default '{}'::jsonb;

update public.emag_publications
set house_rules = '{"noEmDashes": true, "noExclamationMarks": true}'::jsonb
where slug = 'moxie' and house_rules = '{}'::jsonb;
