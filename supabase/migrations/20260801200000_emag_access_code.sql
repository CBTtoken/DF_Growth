-- The reader's access code, and a place for the cover image.
--
-- Dewald, 1 August 2026: subscribers are managed on another platform, so a
-- real subscription check is not available yet. One shared code, handed out
-- with the link, is enough to stop an edition being forwarded casually and
-- buys time to do the real thing properly.
--
-- Deliberately not called a password and deliberately not hashed. It is one
-- shared word that every reader is given, so treating it as a secret would
-- be theatre. What it is, is a latch: it stops a link that leaks from being
-- readable by whoever finds it. Say what it is and it stays honest.
alter table public.emag_editions
  add column if not exists access_code text,
  add column if not exists cover_path text;

comment on column public.emag_editions.access_code is
  'A shared latch, not a password. Null means anyone with the link can read.';
