-- The Board, simplified. Dewald's review on 30 July, after using it.
--
-- The verdict was that it is too complicated, and he was right twice over.
--
-- 1. Verification threw people off the screen. Type a comment, leave for
--    your inbox, find a code, come back, retype it. Evidence that this
--    fails is already on this platform: the review system has been live
--    since mid-July, asks for a password before you may praise a plumber,
--    and has exactly zero reviews.
--
-- 2. Four post kinds, each needing a decision before a member could type a
--    word. "Job done" and "Update" are gone, and what is left is an
--    optional tag rather than a question.
--
-- So the public side stops using Supabase Auth entirely. An identity is a
-- name, optionally an email, and a signed cookie. The email is verified by
-- being used: a business replies, the reply reaches the inbox with a link
-- back into the conversation, and a made-up address simply never hears
-- anything. Nobody is stopped at a door.

-- user_id was the link to an auth user, which no longer exists for the
-- public. Kept nullable rather than dropped: the handful of identities
-- created under the old flow stay valid, and nothing has to be migrated.
alter table public.board_identities
  alter column user_id drop not null;

-- Email is now optional. A comment or a like needs no address at all, and
-- only somebody who wants a reply gives one.
alter table public.board_identities
  alter column email drop not null;

-- Blocking, which is what the address is actually for. Dewald's own point:
-- when the scams and schemes arrive, the address is how you stop that
-- person rather than that message.
alter table public.board_identities
  add column if not exists blocked_at timestamptz,
  add column if not exists blocked_reason text;

comment on column public.board_identities.email is
  'Optional and unverified by design. Never shown publicly, never given to a business unless quote_consent is true. Used to notify and to block.';

-- A post can now come from a member or from a member of the public, so the
-- business link becomes optional and an author appears alongside it.
alter table public.board_posts
  alter column growth_client_id drop not null;

alter table public.board_posts
  add column if not exists identity_id uuid references public.board_identities(id) on delete cascade,
  add column if not exists author_kind text not null default 'member' check (author_kind in ('member', 'public')),
  -- Public posts clear themselves after ten days. Member posts never
  -- expire: each one is a permanent page Google can rank, which is the
  -- entire reason this beats posting the same thing on Facebook.
  add column if not exists expires_at timestamptz;

-- Exactly one author, always.
alter table public.board_posts
  add constraint board_posts_one_author check (
    (author_kind = 'member' and growth_client_id is not null and identity_id is null)
    or (author_kind = 'public' and identity_id is not null and growth_client_id is null)
  );

-- The kinds, rewritten. Old values map to the closest survivor rather than
-- being deleted, so nothing already posted disappears.
update public.board_posts set kind = 'special' where kind in ('update', 'job_done');

alter table public.board_posts drop constraint if exists board_posts_kind_check;
alter table public.board_posts
  add constraint board_posts_kind_check check (
    kind in ('special', 'offer', 'for_sale', 'looking_for')
  );

create index if not exists board_posts_expiry_idx on public.board_posts (expires_at) where expires_at is not null;
create index if not exists board_posts_author_idx on public.board_posts (author_kind, status, published_at desc);
