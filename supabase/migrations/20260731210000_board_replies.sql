-- Replies, and a business answering in public on its own post.
--
-- Dewald posted a comment and found there was no way for anybody to answer
-- it. He was right, and the gap was worse than he could see from outside:
-- a business could take a comment down or turn it into a quote, but it
-- could not reply to it at all. So a customer asking "what would this cost
-- for a double garage" in public got silence in public, which is the one
-- thing a board like this cannot do.
--
-- One level of replies, the way Facebook does it. Not a tree: nested
-- threads three deep are a reading problem nobody asked for.

alter table public.board_comments
  add column if not exists parent_comment_id uuid references public.board_comments(id) on delete cascade;

-- Who wrote it. A comment now comes from a member of the public or from the
-- business whose post it is, and the difference is visible on the page,
-- because "the owner answered" carries weight that an anonymous reply does
-- not.
alter table public.board_comments
  add column if not exists growth_client_id uuid references public.growth_clients(id) on delete cascade;

-- identity_id was required when every comment came from the public.
alter table public.board_comments
  alter column identity_id drop not null;

alter table public.board_comments
  add constraint board_comments_one_author check (
    (identity_id is not null and growth_client_id is null)
    or (growth_client_id is not null and identity_id is null)
  );

create index if not exists board_comments_replies_idx on public.board_comments (parent_comment_id, created_at);
