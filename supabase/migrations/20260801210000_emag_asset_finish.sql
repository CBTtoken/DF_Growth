-- How a picture meets the page.
--
-- Dewald, 1 August 2026: "can the editor give it a bit of shape, a shadow or
-- box effect, instead of just this image dump". A photograph dropped flat
-- onto cream has no edge, so it reads as an accident rather than a
-- placement.
--
-- Held per picture rather than as a publication setting, because a full
-- bleed hero wants nothing and an inset photograph usually wants something,
-- and that is a decision per picture.
alter table public.emag_assets
  add column if not exists finish text
  check (finish in ('none', 'rule', 'shadow', 'framed'));
