-- The Desk v3, written from Dewald's own feedback note of 2 August: one item
-- can carry several steps, so a single CC task with five questions stays one
-- task instead of five stickies.
--
-- Nothing here touches a table outside the desk_ prefix.

-- A checklist is part of the item, not a table of its own: steps have no
-- status lifecycle, no dates and no owner, they are lines under one thought.
-- jsonb array of { "text": string, "done": boolean }.
alter table public.desk_items
  add column checklist jsonb not null default '[]'::jsonb;
