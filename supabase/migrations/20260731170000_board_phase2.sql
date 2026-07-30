-- The Board, Phase 2 (handoff section 5): likes, comments, reporting and
-- moderation. Public interaction, still no public account.
--
-- The identity model is the whole point of this phase, so it is worth being
-- exact about it. A person proves an email address with a one-time code and
-- can then like and comment. There is no password, no profile, no login
-- page and no account surface anywhere. What is stored is the email that
-- was verified, the name they sign comments with, and whether they agreed
-- the business may quote them. That is the "verified email used for OTP"
-- that acceptance criterion 12 allows, and nothing beyond it.
--
-- Sharing is untouched by all of this. It stays anonymous and ungated,
-- which section 5 states in as many words.
create table public.board_identities (
  id uuid primary key default gen_random_uuid(),

  -- Supabase Auth holds the email verification itself, the same mechanism
  -- the review flow uses. This row is the small amount of context the auth
  -- record cannot carry.
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text not null,

  -- Consent, captured at the moment the person writes the comment, for the
  -- one thing that would otherwise hand their address to a business without
  -- asking: the quote-from-a-comment feature. Off unless they tick it, and
  -- the quote is created with their name only when it is off.
  quote_consent boolean not null default false,

  created_at timestamptz not null default now(),
  verified_at timestamptz
);

create table public.board_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.board_posts(id) on delete cascade,
  identity_id uuid not null references public.board_identities(id) on delete cascade,
  body text not null,

  -- pending_verification: written, not visible, waiting for the code.
  -- published: visible. held: taken out of public view by a rule or by the
  -- member, waiting for a human decision. removed: decided, stays out.
  status text not null default 'pending_verification'
    check (status in ('pending_verification', 'published', 'held', 'removed')),

  -- Which rule took it out of public view, in plain words, so the decision
  -- log reads as something a person can act on rather than a code.
  held_reason text,

  -- Hashed, never the address itself. Same helper the review flow uses.
  ip_fingerprint text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index board_comments_post_idx on public.board_comments (post_id, status, created_at);
create index board_comments_moderation_idx on public.board_comments (status, created_at desc);

-- A like is a row or it is nothing. No counter column on the post, because
-- a counter is what somebody eventually sorts by, and section 7 puts
-- engagement ranking out of scope. Counting rows on demand at this volume
-- costs nothing and cannot be ranked on by accident.
create table public.board_likes (
  post_id uuid not null references public.board_posts(id) on delete cascade,
  identity_id uuid not null references public.board_identities(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, identity_id)
);

-- Every report, from the public or from the member whose post it is.
create table public.board_reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('post', 'comment')),
  target_id uuid not null,

  -- Exactly one of these is set. A member reporting a comment on his own
  -- post is a different actor from a stranger reporting one, and the
  -- difference decides how fast it comes down.
  reported_by_identity_id uuid references public.board_identities(id) on delete set null,
  reported_by_client_id uuid references public.growth_clients(id) on delete set null,

  reason text,
  status text not null default 'open' check (status in ('open', 'upheld', 'rejected')),
  created_at timestamptz not null default now()
);

create index board_reports_open_idx on public.board_reports (status, created_at desc);
create index board_reports_target_idx on public.board_reports (target_type, target_id);

-- Section 5: "Takedown path with a logged decision: rule, actor, timestamp,
-- outcome." Append only. Nothing in the application updates or deletes a
-- row here, which is the point of having it: the comment table records what
-- is true now, this records how it got that way, including the automatic
-- decisions that never had a report behind them.
create table public.board_moderation_log (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('post', 'comment')),
  target_id uuid not null,

  action text not null,   -- held, removed, restored, published
  rule text not null,     -- the rule in plain words, or 'admin decision'
  actor text not null,    -- 'system', 'member:<growth_client_id>', 'admin:<email>'
  note text,
  created_at timestamptz not null default now()
);

create index board_moderation_log_target_idx on public.board_moderation_log (target_type, target_id, created_at desc);

alter table public.board_identities enable row level security;
alter table public.board_comments enable row level security;
alter table public.board_likes enable row level security;
alter table public.board_reports enable row level security;
alter table public.board_moderation_log enable row level security;

-- service_role only, no policies, same as board_posts and the bizup_*
-- tables. Without these grants every query returns permission denied and
-- the pages render as though nothing exists, which is how this was found
-- the first time.
grant select, insert, update, delete on public.board_identities to service_role;
grant select, insert, update, delete on public.board_comments to service_role;
grant select, insert, delete on public.board_likes to service_role;
grant select, insert, update on public.board_reports to service_role;
-- No update and no delete, deliberately. An append-only log that the
-- application can rewrite is not a log.
grant select, insert on public.board_moderation_log to service_role;
