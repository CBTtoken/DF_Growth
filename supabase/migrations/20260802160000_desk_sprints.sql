-- Sprints. The missing half of the loop.
--
-- The Desk could already hold work and could already show what was waiting on
-- somebody else, but there was no way to say "this bit is a build, and it is
-- for Claude Code". Export was mistaken for that and is not: Export is the
-- whole picture, for context. A sprint is a bundle with a brief.
--
-- The loop this closes:
--   capture it -> put it in a sprint -> write the goal -> hand it over
--   -> the items move to CC and leave his own list -> the work comes back
--   -> mark it shipped and every item in it is done.
create table public.desk_sprints (
  id uuid primary key default gen_random_uuid(),

  name text not null,

  -- What this sprint is for, in his words. This is the part a handoff cannot
  -- be written without, and the part only he can write.
  goal text,

  -- Anything the build needs to know that is not a task: constraints,
  -- decisions already made, things not to touch.
  context text,

  -- draft    still collecting items
  -- ready    brief written, not sent
  -- handed   sent to CC, items are now blocked by CC
  -- shipped  came back and was accepted
  status text not null default 'draft' check (status in ('draft', 'ready', 'handed', 'shipped')),

  handed_at timestamptz,
  shipped_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- An item belongs to at most one sprint. Deliberately not a join table: a
-- piece of work being in two sprints at once is a state he would have to
-- reason about, and the whole tool exists to stop him reasoning about
-- bookkeeping.
alter table public.desk_items
  add column sprint_id uuid references public.desk_sprints(id) on delete set null;

create index desk_items_sprint_idx on public.desk_items (sprint_id);
create index desk_sprints_status_idx on public.desk_sprints (status, created_at);

alter table public.desk_sprints enable row level security;
grant select, insert, update, delete on public.desk_sprints to service_role;

-- One sprint to start, holding the work that already exists for CC, so the
-- screen opens with something real in it rather than an empty state.
insert into public.desk_sprints (name, goal, status)
values (
  'Next build',
  'Whatever comes out of testing The Desk v2, plus anything from a client that turns into a system change.',
  'draft'
);
