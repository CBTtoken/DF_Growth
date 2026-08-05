-- The DigitalFlyer page poster (Facebook/HANDOFF-digitalflyer-page-poster.md).
-- A scheduler that keeps the DigitalFlyer SA Facebook page alive: member
-- spotlights, new member announcements, Board offers and evergreen posts,
-- generated into a week-ahead queue that Dewald approves before anything
-- publishes. Nothing here posts to a member's own page or to a group.

-- Fair rotation state, one row per client. last_featured_at null means
-- "never featured" and sorts first, so a brand new member is the next
-- pick rather than the last. Survives a restart because it lives here,
-- not in memory. new_member_posted_at is separate: it fires the
-- "new member" post exactly once per client, independent of the
-- spotlight cycle.
create table public.page_poster_client_state (
  growth_client_id uuid primary key references public.growth_clients (id) on delete cascade,
  last_featured_at timestamptz,
  new_member_posted_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Our own written posts (handoff Sec 2, "Evergreen"), supplied as a
-- content file and imported here. used_at null means never queued; the
-- generator cycles through the whole table before repeating, same fair
-- rotation shape as client_state.
create table public.page_poster_evergreen (
  id uuid primary key default gen_random_uuid(),
  slot text not null check (slot in ('morning', 'evening')),
  body text not null,
  link_url text,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- A target posts-per-day and posts-per-week, configurable per the handoff
-- (Sec 4). Single row, id fixed to 1 so there is only ever one.
create table public.page_poster_settings (
  id smallint primary key default 1 check (id = 1),
  posts_per_day int not null default 2 check (posts_per_day >= 0 and posts_per_day <= 6),
  posts_per_week int not null default 10 check (posts_per_week >= 0 and posts_per_week <= 40),
  updated_at timestamptz not null default now()
);
insert into public.page_poster_settings (id) values (1);

-- The queue itself. Every row is one post, generated up to a week ahead,
-- sitting at pending_approval until Dewald acts on it (handoff Sec 5: an
-- item unapproved by its scheduled time is skipped, not delayed).
create table public.page_poster_queue (
  id uuid primary key default gen_random_uuid(),
  post_type text not null check (post_type in ('new_member', 'spotlight', 'board_highlight', 'evergreen')),

  -- Set for new_member and spotlight; null for board_highlight and evergreen.
  growth_client_id uuid references public.growth_clients (id) on delete cascade,
  -- Set for board_highlight only.
  board_post_id uuid references public.board_posts (id) on delete cascade,
  -- Set for evergreen only, so a used evergreen row is not picked twice
  -- while still queued.
  evergreen_id uuid references public.page_poster_evergreen (id) on delete set null,

  message text not null,
  link_url text,
  photo_url text,

  slot text not null check (slot in ('morning', 'evening')),
  scheduled_for timestamptz not null,

  status text not null default 'pending_approval'
    check (status in ('pending_approval', 'approved', 'published', 'skipped', 'rejected', 'failed')),
  approved_at timestamptz,
  approved_by text,
  published_at timestamptz,
  meta_post_id text,
  failure_reason text,

  -- The member-notification half of the build (handoff Sec 6). Null until
  -- a publish successfully tells the member; the dashboard banner reads
  -- straight off this queue row.
  member_notified_at timestamptz,
  member_dismissed_at timestamptz,

  created_at timestamptz not null default now()
);

create index page_poster_queue_status_scheduled_idx
  on public.page_poster_queue (status, scheduled_for);
create index page_poster_queue_client_idx
  on public.page_poster_queue (growth_client_id);
create index page_poster_queue_board_post_idx
  on public.page_poster_queue (board_post_id);

alter table public.page_poster_client_state enable row level security;
alter table public.page_poster_evergreen enable row level security;
alter table public.page_poster_settings enable row level security;
alter table public.page_poster_queue enable row level security;

-- Everything above is written and read server-side via the service role
-- (admin approval screen, the generate/publish cron jobs) except one
-- narrow case: a member's own dashboard reads their own published,
-- not-yet-dismissed spotlight so it can show the share banner. No insert
-- or update policy for members anywhere in this migration — the queue is
-- never member-writable.
create policy "members read own published spotlight"
on public.page_poster_queue for select
using (
  status = 'published'
  and exists (
    select 1 from public.growth_members
    where growth_members.growth_client_id = page_poster_queue.growth_client_id
    and growth_members.user_id = auth.uid()
  )
);
