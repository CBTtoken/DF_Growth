-- The Board, structural moderation (handoff scripts/handoff-board-moderation.md).
--
-- Job 1: each post kind gets the fields it actually needs, and a post that
-- is missing one should be unpostable rather than merely unwise. New columns
-- plus `not valid` check constraints: they bind every future insert/update
-- but are never retroactively checked against rows that already exist, so
-- nothing already published is broken or hidden by this migration.
--
-- posted_by_client_id also lands here: it is the one column that lets a
-- member's post be traced back to their account regardless of whether they
-- posted as their business or "as myself" (personal item) -- today's
-- schema has no link back to the account at all in the "as myself" case.
-- Job 2's entitlement check and Job 6's poster-history screen both need it.

alter table public.board_posts
  add column if not exists condition text,
  add column if not exists saving_text text,
  add column if not exists urgency text check (urgency in ('asap', 'this_week', 'flexible')),
  add column if not exists posted_by_client_id uuid references public.growth_clients(id) on delete set null,
  add column if not exists last_renewed_at timestamptz,
  add column if not exists expiry_reminder_sent_at timestamptz;

create index if not exists board_posts_posted_by_idx on public.board_posts (posted_by_client_id);

comment on column public.board_posts.condition is
  'For a for_sale post: new, like_new, good, or for_parts. Required by the app going forward, not backfilled on existing rows.';
comment on column public.board_posts.saving_text is
  'Free-text alternative to price_cents on an offer/special post -- "20% off", "second one half price" -- when there is a saving but no single number.';
comment on column public.board_posts.posted_by_client_id is
  'The authenticated member behind this post, regardless of attribution. Set for every member-authored post, including "post as myself". Null for a public visitor post.';

alter table public.board_posts
  add constraint board_posts_for_sale_needs_photo
  check (kind <> 'for_sale' or photo_path is not null) not valid;

alter table public.board_posts
  add constraint board_posts_for_sale_needs_price
  check (kind <> 'for_sale' or price_cents is not null) not valid;

alter table public.board_posts
  add constraint board_posts_offer_needs_enddate
  check (kind not in ('offer', 'special') or expires_at is not null) not valid;

alter table public.board_posts
  add constraint board_posts_offer_needs_price_or_saving
  check (kind not in ('offer', 'special') or price_cents is not null or saving_text is not null) not valid;

alter table public.board_posts
  add constraint board_posts_looking_for_needs_urgency
  check (kind <> 'looking_for' or urgency is not null) not valid;

-- Job 3: a post can now be held, the same way a comment already can be --
-- out of public view, waiting on a person, never auto-removed.
alter table public.board_posts drop constraint if exists board_posts_status_check;
alter table public.board_posts
  add constraint board_posts_status_check check (status in ('published', 'hidden', 'removed', 'held'));
