-- The media library: a curated, tagged set of ambient images per trade,
-- replacing the raw Pexels-by-keyword fallback (which once gave a butler
-- service a photo of a child). Platform queue item 1, 4 August 2026.
--
-- Service-role only: selection happens at assignment time (onboarding, a
-- done-for-you build, an admin action), which writes a plain public URL to
-- growth_clients.fallback_photo_url — the public page render never queries
-- this table. No client-facing RLS policies on purpose.
create table if not exists media_library_images (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  -- Plain lowercase tags ('plumbing', 'handyman', 'cleaning'), matched
  -- against the industry string at assignment time.
  trade_tags text[] not null default '{}',
  -- What the image actually shows, in plain words. This is what gets
  -- checked against a member's business description before the image is
  -- allowed to land on their page.
  description text not null,
  alt_text text not null,
  -- 'flux-dev' for generated ambient imagery, 'stock-curated' for a real
  -- photo brought in by hand. Generated images are ambient/decorative only
  -- and must never pose as a member's own work (house rule).
  source text not null default 'flux-dev',
  orientation text not null default 'landscape', -- 'landscape' | 'portrait'
  created_at timestamptz not null default now()
);

create index if not exists media_library_images_trade_tags_idx
  on media_library_images using gin (trade_tags);

alter table media_library_images enable row level security;

-- Confirmed pattern in this project: always grant full CRUD to service_role
-- in the same migration that creates the table.
grant select, insert, update, delete on media_library_images to service_role;
