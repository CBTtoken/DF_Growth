-- How a picture's caption is set.
--
-- Dewald, 1 August 2026: "the image will always have the image description
-- or title, normally an italic font underneath it, to give context".
--
-- The reference's type table sets captions in Barlow Condensed Regular,
-- which is what June and July actually print, so this is a choice rather
-- than a change: both are offered and the publisher picks per picture.
alter table public.emag_assets
  add column if not exists caption_style text
  check (caption_style in ('regular', 'italic'));
