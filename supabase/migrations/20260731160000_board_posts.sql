-- The Board, Phase 1 (docs handoff "THE BOARD (V1)", section 4).
--
-- One table. A member publishes an offer, a listing, an update or a job he
-- has finished, and every one of them is the same shape: a title, some
-- words, an optional photo, an optional price. `kind` is a label and a
-- browse filter, not a different form, which is the decision Dewald took
-- on 30 July when the alternative was four separate composers.
--
-- Deliberately absent: any engagement column. No like count, no view
-- count, no score. Section 7 of the handoff puts engagement ranking out of
-- scope, and a column that exists gets sorted on eventually. Ordering is
-- published_at, area and kind, and nothing else.
--
-- Area and category are NOT stored here. They live on growth_clients
-- (city and industry) and the board joins to them, so a member who moves
-- town or corrects his trade does not leave a trail of posts filed under
-- the old one. This is why every board query joins growth_clients rather
-- than denormalising for speed at 34 members.
create table public.board_posts (
  id uuid primary key default gen_random_uuid(),
  growth_client_id uuid not null references public.growth_clients(id) on delete cascade,

  kind text not null check (kind in ('offer', 'for_sale', 'update', 'job_done')),
  title text not null,
  body text,

  -- Cents, like every other money column in this database (bizup_documents,
  -- shop_products), so nothing has to remember which unit this one uses.
  -- Null means the post carries no price, which is normal for an update or
  -- a finished job.
  price_cents integer check (price_cents is null or price_cents >= 0),

  -- A path inside the existing public `client-photos` bucket, under a
  -- board/ prefix. No new bucket and no new storage policy: the gallery
  -- upload in dashboard/actions.ts already writes there and the marketplace
  -- already serves public URLs from it.
  photo_path text,

  -- 'published' is the only state the public sees. 'hidden' is the member
  -- taking his own post down, 'removed' is platform moderation. Phase 2
  -- needs both and it costs nothing to leave room for them now, but no
  -- Phase 2 moderation logic is written yet.
  status text not null default 'published' check (status in ('published', 'hidden', 'removed')),

  -- The public URL is /board/post/<slug>. Unique across the whole table
  -- rather than per member, because the slug is the entire path segment.
  -- Generated from the title with a short random suffix on collision, in
  -- src/lib/board/slug.ts.
  slug text not null unique,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz not null default now()
);

-- The board index and every area and category page read the same way:
-- published posts, newest first.
create index board_posts_public_idx on public.board_posts (status, published_at desc);

-- The member's own list in the dashboard, and the cascade on delete.
create index board_posts_client_idx on public.board_posts (growth_client_id, published_at desc);

-- Same posture as the twelve other tables in this project that carry
-- member data: row level security on, no policies at all, so the anon and
-- authenticated roles can reach nothing directly. Every read and write
-- goes through the service role in a server component or a server action,
-- which is also where the account scoping lives. A public SELECT policy
-- would be the obvious alternative and is deliberately not used: the board
-- must only ever show posts belonging to an active client with a published
-- page, and that gate is a join the policy cannot express cheaply.
alter table public.board_posts enable row level security;

-- Not optional, and easy to leave out. This project's default privileges
-- hand a new table nothing usable to any of the API roles, so without this
-- grant every board query returns "permission denied for table board_posts",
-- and the pages render as though nobody has posted anything rather than as
-- an error. Found exactly that way, on the first run of /board.
--
-- service_role only, matching the bizup_* tables (see
-- 20260727210000_bizup_documents.sql). anon and authenticated are granted
-- nothing at all, so the table cannot be read from a browser even if a
-- policy were added by accident later.
grant select, insert, update, delete on public.board_posts to service_role;
