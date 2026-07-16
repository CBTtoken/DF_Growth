-- List Your Event Sec 3: "a few images, reusing Growth's existing photo
-- upload and Pexels-fallback pattern." client-photos (the existing
-- pattern) was created manually in the Supabase dashboard with no
-- migration record of it — inserting directly into storage.buckets works
-- identically and keeps this one reproducible/reviewable like every other
-- schema change in this project, rather than requiring yet another
-- undocumented manual dashboard step.
--
-- Public bucket, same as client-photos: event pages are public, unauthenticated
-- pages, so their images need to load via a plain URL with no signed-URL
-- round trip.
insert into storage.buckets (id, name, public)
values ('event-photos', 'event-photos', true)
on conflict (id) do nothing;
