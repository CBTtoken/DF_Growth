-- One board, not two. Dewald's correction, and the right one.
--
-- "The public board is nothing other than the same as the member board, no
-- difference, it is a free board. The only real difference is the public
-- member not signed in only sees Looking for or For sale, where a logged in
-- member sees all. Remember a member is also a public person who might be
-- looking for something or have something private for sale."
--
-- So there is one board, one composer and one set of rules. Who you are
-- decides which tags you are offered, and nothing else.

-- A business post takes its area from the business. A person has no
-- business to take it from, so the post carries its own.
alter table public.board_posts
  add column if not exists city text;

comment on column public.board_posts.city is
  'Area for a post by a member of the public. A business post leaves this null and takes its area from growth_clients.city, so a business that moves town does not leave a trail of posts filed under the old one.';

-- A member posting as himself rather than as his business. His private
-- fridge is not his company's fridge, and the board should not pretend
-- otherwise.
comment on column public.board_posts.author_kind is
  'member = posted as the business. public = posted as a person, which includes a signed-in member choosing to post as himself.';
