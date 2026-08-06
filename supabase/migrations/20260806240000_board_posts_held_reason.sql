-- Job 3/4: a held post needs to say why, the same as a held comment already
-- does (board_comments.held_reason), so admin's new "posts out of public
-- view" section can show the reason without guessing from the log alone.

alter table public.board_posts
  add column if not exists held_reason text;
