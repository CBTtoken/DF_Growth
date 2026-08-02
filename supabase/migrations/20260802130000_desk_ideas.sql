-- Think. Somewhere to dream without it becoming a task.
--
-- The Dump box turns everything you type into an item with a status, and an
-- idea is not a task yet. Putting a half-formed thought into a list that
-- tracks whether it is done is how it gets abandoned or, worse, how it starts
-- nagging. So ideas live in their own table with no status, no due date, no
-- effort and no owner. Nothing counts them and nothing chases them.
--
-- The only bridge is deliberate: when an idea becomes work, one tap copies it
-- into desk_items and records which idea it came from, so the idea stays
-- where it is and the work goes where work goes.
create table public.desk_ideas (
  id uuid primary key default gen_random_uuid(),

  -- A free text board name so related thinking sits together: "Kwaai Press",
  -- "one day", "things that annoy me". Not an enum, because the whole point
  -- is that the categories are not known in advance.
  board text not null default 'Ideas',

  heading text,
  body text,

  -- Set when the idea has been turned into an item, so the card can say so
  -- rather than being silently duplicated.
  became_item_id uuid references public.desk_items(id) on delete set null,

  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index desk_ideas_board_idx on public.desk_ideas (board, position, created_at);

alter table public.desk_ideas enable row level security;
grant select, insert, update, delete on public.desk_ideas to service_role;

-- Two boards to start, so the screen opens with somewhere to put things
-- rather than an empty page and a blinking cursor.
insert into public.desk_ideas (board, heading, body, position) values
  ('Ideas', 'What this board is for',
   'Anything that is not a task yet. Half thoughts, what-ifs, things you would build if the week had eight days. Nothing here is counted, chased or scored. When one of them turns into work, tap Make it an item and it moves across.', 0),
  ('One day', 'Things worth wanting',
   'The version of this that is not about today. Write it badly, come back later.', 0);
