-- The Board, Phase 3: Growth Chat, one to one, public to member.
--
-- Unblocked on 30 July 2026 when Dewald settled data retention. The
-- handoff's section 6 gate was never about chat being hard, it was about
-- not holding conversations belonging to members of the public with no
-- settled position on how long we keep them. That position now exists,
-- is enforced in code, and is visible on /admin/retention.
--
-- Two things section 6 asks for that are worth stating before the schema.
-- Both paths stay live side by side: the WhatsApp tap-through on every post
-- is untouched, and a member decides whether he accepts in-app chat at all.
-- Nothing here replaces WhatsApp, it sits next to it, and usage decides.

-- The member's own switch. Default true so the feature exists the day it
-- ships, off means the Message button never appears on his posts and no
-- new thread can be opened with him.
alter table public.growth_clients
  add column if not exists chat_enabled boolean not null default true;

-- One thread per business and person. Not per post: somebody who asks
-- about a gate today and a driveway next month is having one conversation
-- with one business, and splitting it by post would fragment it the way
-- Facebook does.
create table public.board_threads (
  id uuid primary key default gen_random_uuid(),
  growth_client_id uuid not null references public.growth_clients(id) on delete cascade,
  identity_id uuid not null references public.board_identities(id) on delete cascade,

  -- Which post started it, kept for context and set null rather than
  -- cascading if that post is later taken down. The conversation outlives
  -- the post it began from.
  opening_post_id uuid references public.board_posts(id) on delete set null,

  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  unique (growth_client_id, identity_id)
);

create index board_threads_member_idx on public.board_threads (growth_client_id, last_message_at desc);
create index board_threads_identity_idx on public.board_threads (identity_id, last_message_at desc);

create table public.board_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.board_threads(id) on delete cascade,

  -- Who wrote it. Two participants only, so this is a side rather than a
  -- user id, and it stays correct even after retention removes the
  -- identity row behind a public sender.
  sender text not null check (sender in ('public', 'member')),
  body text not null,

  -- When the other side actually read it. Null means unread, which is what
  -- the unread count on both dashboards is built from, rather than a
  -- counter that can drift out of step with the messages themselves.
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index board_messages_thread_idx on public.board_messages (thread_id, created_at);

alter table public.board_threads enable row level security;
alter table public.board_messages enable row level security;

grant select, insert, update, delete on public.board_threads to service_role;
grant select, insert, update, delete on public.board_messages to service_role;
