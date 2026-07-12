-- Combined spec Sec 7: a gallery photo must never become the page's hero
-- image just by being the first one uploaded (client_photos.position 0) --
-- that was happening silently, with no client control over it. This makes
-- "which photo is the hero" its own explicit, nullable choice, separate
-- from upload order. Null means no explicit choice made yet, and the
-- landing page falls back to the existing Pexels stock photo, exactly as
-- it already does with zero gallery photos.
alter table public.growth_clients
  add column hero_photo_id uuid references public.client_photos (id) on delete set null;
