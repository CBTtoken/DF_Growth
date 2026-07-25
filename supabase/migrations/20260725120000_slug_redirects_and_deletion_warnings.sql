-- Two small, unrelated column adds bundled into one migration so it can be
-- run in a single pass.

-- 1. Slug redirects. The auto-provisioned slugs carry a random 4-char suffix
-- (e.g. "simply-water-boksburg-q3kf"); Dewald asked to shorten them to the
-- clean base. Keeping every former slug here lets the [clientSlug] route 301
-- old links (including the reactivation emails already sent) to the new one,
-- so nothing breaks and SEO is preserved.
alter table public.growth_clients
  add column if not exists previous_slugs text[] not null default '{}';

-- 2. Pre-deletion warning emails (retention policy: non-renewed/unsubscribed
-- members are deleted after 60 days). A daily job sends a "2 weeks left" and
-- a "5 days, last call" email before that point; these track that each was
-- sent once so it never repeats.
alter table public.growth_clients
  add column if not exists deletion_warning_14d_sent_at timestamptz,
  add column if not exists deletion_warning_5d_sent_at timestamptz;
