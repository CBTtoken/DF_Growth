-- When an edition opens up, stored rather than derived.
--
-- The rule Dewald set is that an edition goes free 60 days after
-- publication, still behind a free reader login. Computing that as
-- published_at + 60 days everywhere it is needed looked right until the
-- first two editions were seeded: July went out on 1 July 2026 and is 31
-- days old, but Dewald wants June and July open now.
--
-- A derived rule has no way to express that without lying about the
-- publication date, which would then be wrong in the archive, in the
-- sitemap and in the structured data. So the date is a column, defaulted
-- from the rule and editable when there is a reason.
--
-- Null means the edition has not been given a free date and is governed by
-- entitlement alone.
alter table public.moxie_editions
  add column if not exists free_from timestamptz;

comment on column public.moxie_editions.free_from is
  'When this edition opens to any signed-in reader. Normally published_at plus 60 days, set explicitly so it can be brought forward.';
