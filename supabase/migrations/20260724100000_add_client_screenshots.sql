-- Automated real-screenshot pipeline: Dewald flagged that a member's raw
-- uploaded gallery photo doesn't show what their actual page looks like,
-- and manual screenshotting doesn't scale. This adds storage for a real,
-- automatically-captured screenshot of each client's live page, used by
-- the homepage's "See It In Action" section ahead of the existing
-- hero_photo_id/gallery-photo fallback.
alter table growth_clients
  add column screenshot_path text,
  add column screenshot_captured_at timestamptz;

-- Public bucket, same reasoning as client-photos/event-photos: these serve
-- unauthenticated public marketing pages, so they need a plain URL with no
-- signed-URL round trip. Created via migration (not the manual dashboard
-- step client-photos originally used) so it's reproducible, matching the
-- pattern event-photos already established.
insert into storage.buckets (id, name, public)
values ('client-screenshots', 'client-screenshots', true)
on conflict (id) do nothing;
