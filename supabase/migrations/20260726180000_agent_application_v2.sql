-- Agent Programme Phase 3 (docs/agent-recruitment-page-copy.md Sec 9).
--
-- The application form changes shape. Out: the Facebook page link, the two
-- yes/no Facebook questions, and the promotion method dropdown. The copy
-- document's reasoning, kept here because it is the whole point of the
-- change: those fields "point applicants at Facebook group posting, which
-- converts badly and risks their Meta account and your brand."
--
-- In: their town, and one open question that does more filtering than every
-- tick box it replaces.
alter table public.agents
  add column town_or_area text,
  add column first_three_businesses text;

-- The four retired columns are all NOT NULL, set when they were required
-- questions, so a new application through the rebuilt form cannot insert at
-- all until this drops. Dropped rather than deleted: three real agents'
-- answers are stored in them, and throwing away part of an existing
-- application record to tidy up a form change is not a trade worth making.
-- The admin queue now only renders them when they hold something.
alter table public.agents
  alter column facebook_page_url drop not null,
  alter column understands_facebook_rules drop not null,
  alter column can_generate_content drop not null,
  alter column promotion_method drop not null;

-- Same reason, found live while seeding Natasha: whatsapp_number is NOT
-- NULL from the original form, where it was required. It now doubles as the
-- public contact number on an agent's own page, and clearing it is a
-- legitimate thing for an agent to do. The application form still requires
-- it; this only stops a 23502 when someone empties the box afterward.
alter table public.agents alter column whatsapp_number drop not null;
