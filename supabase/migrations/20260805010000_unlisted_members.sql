-- Unlisted members: reachable by URL, invisible to discovery. Built for the
-- Old Good demo (Jordan's surprise thrift shop) but general: an unlisted
-- member is excluded from the sitemap, the marketplace, the cross-member
-- shop, and carries noindex metadata. The URL still works for anyone who
-- has it, which is the point of a demo you hand to one person.
alter table growth_clients
  add column if not exists unlisted boolean not null default false;
