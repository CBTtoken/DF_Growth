-- Page poster, scheduling redesign per Dewald's own spec (chat, 5 August
-- 2026): three fixed daily anchors rather than a dynamic jittered count.
-- 08:15 our own feature CTA (required), 13:30 a second feature CTA (only
-- when one is queued), 20:15 one member post (new member, a fresh Board
-- offer, or spotlight rotation, in that priority). page_poster_settings
-- (posts_per_day/week) is now vestigial, left in place rather than
-- dropped, since nothing reads it going forward and dropping a column
-- carries more risk than leaving an unused one.

alter table public.page_poster_queue
  drop constraint page_poster_queue_slot_check;
alter table public.page_poster_queue
  add constraint page_poster_queue_slot_check
  check (slot in ('morning_feature', 'midday_feature', 'evening_member'));

-- Evergreen becomes the feature-CTA content pool. feature_key ties a post
-- to one of the fixed features (see lib/meta/page-poster-features.ts);
-- null stays valid for a genuinely generic post with no specific feature.
-- photo_url is resolved from page_poster_feature_images at generation
-- time (below), not stored per-row, so uploading one image per feature
-- covers every post about it rather than needing an image per line in a
-- batch add. slot no longer means anything under the fixed-anchor
-- schedule (a feature post can land in either the 08:15 or 13:30 slot,
-- whichever needs filling), so it stops being required.
alter table public.page_poster_evergreen
  add column feature_key text;
alter table public.page_poster_evergreen
  alter column slot drop not null;

-- One reusable image per feature, uploaded once from the admin screen and
-- picked up automatically by every feature-CTA post about it. Same
-- client-photos bucket the rest of this build already uses, under a
-- page-poster-features/ prefix, rather than a new bucket for one small
-- image set.
create table public.page_poster_feature_images (
  feature_key text primary key,
  photo_url text not null,
  updated_at timestamptz not null default now()
);

alter table public.page_poster_feature_images enable row level security;

grant select, insert, update, delete on public.page_poster_feature_images to service_role;
