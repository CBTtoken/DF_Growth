-- Quick Sprint: Payments/Geo, Sec 2. The "Left-Heavy Split" hero template
-- was calling Pexels live inside the render path for any client with no
-- uploaded hero photo, on every cache-miss regeneration — a real, external,
-- third-party API call sitting on the critical path of a page render.
-- Fetched once at onboarding (or whenever industry is saved) instead,
-- stored here, and render always reads this column, never calls Pexels
-- live. Null means "no stock photo fetched/available yet" — the section
-- simply renders without its showcase image, same graceful-degradation
-- behavior the live call always had on failure.
alter table public.growth_clients
  add column fallback_photo_url text;
