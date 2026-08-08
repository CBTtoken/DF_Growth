-- Stays and Tours, phase 1.
-- Handoff: scripts/handoff-stays-and-tours-phase1.md
--
-- A guesthouse and a tour company run from one brand. Neither of the two
-- modules already here fits:
--
--   Booking (bookable_units, reservations) is slot-based, with opening
--   hours and buffers between appointments. A stay is a range of nights
--   across an inventory, which is different arithmetic on different data.
--
--   Events is a free community board that non-members can post to. A tour
--   is commercial, seated and paid, so it cannot live on a surface anyone
--   can post to.
--
-- So this is its own module with its own tables, and the handoff's naming
-- decision is settled: Stays and Tours, never "Bookings" (HOUSE-RULES.md).
--
-- The single idea underneath the whole schema: model ROOM TYPES, never
-- individual rooms. A guesthouse has four Standard Doubles, not Room 3 and
-- Room 4. Availability is then arithmetic (four exist, two booked, two
-- free) and every hard problem in hotel software -- room assignment, moving
-- a guest, per-room housekeeping state -- never enters the building.

-- ============================================================
-- The property
-- ============================================================

-- One property per member in phase 1, so growth_client_id is the primary
-- key rather than an indexed FK -- the same shape booking_operational_rules
-- already uses, and the thing that makes Postgrest embed this as a single
-- object instead of an array.
create table if not exists public.stays_properties (
  growth_client_id uuid primary key references public.growth_clients (id) on delete cascade,

  -- The member's own switch, same as growth_clients.booking_enabled and
  -- .shop_enabled. Off until they have something worth showing.
  enabled boolean not null default false,

  -- The short paragraph above the date picker. Not the page's About text:
  -- this one is about staying here specifically.
  intro text,

  -- Property-level amenities as slugs, never free text. Phase 1 only
  -- displays them, but they become marketplace filters later and the data
  -- has to exist first (handoff Job 5). The list of valid slugs lives in
  -- src/lib/stays/amenities.ts, deliberately in application code: it is a
  -- list that will grow with each new trade that joins, and a check
  -- constraint would turn every addition into a migration.
  amenities text[] not null default '{}',

  check_in_from text,
  check_out_by text,

  -- Handoff Job 4. The member sets how many days before arrival the balance
  -- is due; the reminder itself is the existing KatisoBiz one, which the
  -- member sends themselves. Nothing here ever sends anything.
  balance_due_days integer not null default 7 check (balance_due_days between 0 and 90),

  -- The member's own words, shown at booking and repeated on the
  -- confirmation. Free text on purpose: cancellation terms are a promise
  -- the member makes to their guest, not a setting we model.
  cancellation_terms text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Room types
-- ============================================================

create table if not exists public.stays_room_types (
  id uuid primary key default gen_random_uuid(),
  growth_client_id uuid not null references public.growth_clients (id) on delete cascade,

  name text not null,
  description text,

  -- Who physically fits. A party of two adults and two children must never
  -- be shown a room type with a maximum of two (handoff Job 2, acceptance
  -- criterion 1), so these are the numbers that filter search.
  max_adults integer not null default 2 check (max_adults between 1 and 20),
  max_children integer not null default 0 check (max_children between 0 and 20),

  -- How many of this room type exist. The whole of availability is this
  -- number minus what is booked or blocked on the tightest night.
  units_count integer not null default 1 check (units_count between 1 and 100),

  -- One rate per room type per night. Not per person, not seasonal, no
  -- weekend loading, no minimum-night rules -- those are phase 2 and are
  -- explicitly out of scope, including half-built hooks for them.
  --
  -- Null means the member has not set a price yet. A room type with no rate
  -- is never offered to a guest, because a price we do not know is not a
  -- price we may guess at.
  rate_cents integer check (rate_cents is null or rate_cents >= 0),

  -- Deposit taken at booking, as a percentage or a fixed amount, the
  -- member's choice per room type (handoff Job 4).
  deposit_kind text not null default 'percent' check (deposit_kind in ('percent', 'fixed')),
  deposit_percent integer not null default 50 check (deposit_percent between 0 and 100),
  deposit_fixed_cents integer not null default 0 check (deposit_fixed_cents >= 0),

  amenities text[] not null default '{}',

  -- client_photos ids, in the order the member arranged them. A room type
  -- shows the member's own photos from the one photo library they already
  -- manage, rather than a second upload path that would drift out of sync
  -- with the first.
  photo_ids uuid[] not null default '{}',

  position integer not null default 0,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stays_room_types_client_idx
  on public.stays_room_types (growth_client_id, position);

-- ============================================================
-- Bookings
-- ============================================================

create table if not exists public.stays_bookings (
  id uuid primary key default gen_random_uuid(),
  growth_client_id uuid not null references public.growth_clients (id) on delete cascade,
  room_type_id uuid not null references public.stays_room_types (id) on delete restrict,

  -- Half open, [check_in, check_out). A guest arriving on the 4th and
  -- leaving on the 6th occupies the nights of the 4th and the 5th, and the
  -- 6th is free for somebody else. Every availability sum in this file
  -- depends on that being consistent.
  check_in date not null,
  check_out date not null,
  check (check_out > check_in),

  units integer not null default 1 check (units between 1 and 20),
  adults integer not null default 1 check (adults between 1 and 40),
  children integer not null default 0 check (children between 0 and 40),

  guest_name text not null,
  guest_email text,
  guest_phone text,

  -- Frozen at booking. A member raising their rate next week must never
  -- change what a guest already agreed to pay.
  nightly_rate_cents integer not null,
  nights integer not null,
  total_cents integer not null,
  deposit_cents integer not null default 0,

  -- held      the five minute window between choosing to pay and paying
  -- confirmed a real booking, occupying the room
  -- expired   an abandoned checkout, released by the scheduled sweep
  -- cancelled cancelled by the member, dates released immediately
  status text not null default 'held' check (status in ('held', 'confirmed', 'expired', 'cancelled')),
  hold_expires_at timestamptz,

  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'deposit_paid', 'paid')),
  -- Ours, not the gateway's, so the row can be found again on the way back
  -- from a hosted checkout without matching on anything a person typed.
  payment_reference text unique,
  gateway text,
  deposit_paid_at timestamptz,

  -- The invoice in KatisoBiz carrying the balance owing. Null when the
  -- member has no KatisoBiz account, which is the common case today.
  bizup_document_id uuid references public.bizup_documents (id) on delete set null,

  -- Growth Chat, offered after booking and never before. The thread is
  -- attached here so the conversation sits with the booking it is about.
  chat_thread_id uuid references public.board_threads (id) on delete set null,

  -- What the guest gets in their confirmation link. Unguessable, because it
  -- is the only thing standing between a typed URL and somebody else's name,
  -- email and phone number.
  guest_token text not null unique,

  cancelled_at timestamptz,
  cancellation_reason text,
  -- The system never moves money. Any refund is made by the member in their
  -- own Paystack; this records that it happened and nothing more.
  refund_given boolean not null default false,
  refund_note text,

  created_at timestamptz not null default now()
);

create index if not exists stays_bookings_room_dates_idx
  on public.stays_bookings (room_type_id, check_in, check_out);
create index if not exists stays_bookings_client_idx
  on public.stays_bookings (growth_client_id, check_in);
-- The sweep's own index: it asks for held rows past their expiry and
-- nothing else, several times an hour, forever.
create index if not exists stays_bookings_hold_idx
  on public.stays_bookings (hold_expires_at)
  where status = 'held';
create index if not exists stays_bookings_document_idx
  on public.stays_bookings (bizup_document_id)
  where bizup_document_id is not null;
create index if not exists stays_bookings_thread_idx
  on public.stays_bookings (chat_thread_id)
  where chat_thread_id is not null;

-- ============================================================
-- Blocked dates
-- ============================================================

-- Anything sold elsewhere, or a room being painted. Blocked dates behave
-- exactly like booked dates in search (handoff Job 8, acceptance
-- criterion 9), which is why the availability function below counts them in
-- the same sum rather than filtering them separately.
create table if not exists public.stays_blocks (
  id uuid primary key default gen_random_uuid(),
  growth_client_id uuid not null references public.growth_clients (id) on delete cascade,
  room_type_id uuid not null references public.stays_room_types (id) on delete cascade,

  -- Inclusive on both ends, and counted in NIGHTS rather than dates. A
  -- member blocking "the 5th to the 7th" means the nights of the 5th, 6th
  -- and 7th, which is what they would say out loud. Bookings are half open
  -- because that is what arithmetic wants; blocks are inclusive because
  -- that is what a person wants, and the conversion happens in one place.
  first_night date not null,
  last_night date not null,
  check (last_night >= first_night),

  units integer not null default 1 check (units between 1 and 100),
  reason text,

  created_at timestamptz not null default now()
);

create index if not exists stays_blocks_room_idx
  on public.stays_blocks (room_type_id, first_night, last_night);
create index if not exists stays_blocks_client_idx
  on public.stays_blocks (growth_client_id, first_night);

-- ============================================================
-- Tours
-- ============================================================

create table if not exists public.tours (
  id uuid primary key default gen_random_uuid(),
  growth_client_id uuid not null references public.growth_clients (id) on delete cascade,

  -- Its own indexable page lives at /[clientSlug]/tours/[slug]. This is
  -- what Google finds and what the member shares, so the slug is stable and
  -- unique per member.
  slug text not null,
  title text not null,
  summary text,
  description text,
  itinerary text,
  meeting_point text,

  departure_date date not null,
  departure_time text,
  duration_text text,

  price_cents integer not null default 0 check (price_cents >= 0),
  seats_total integer not null default 1 check (seats_total between 1 and 500),

  deposit_kind text not null default 'percent' check (deposit_kind in ('percent', 'fixed')),
  deposit_percent integer not null default 50 check (deposit_percent between 0 and 100),
  deposit_fixed_cents integer not null default 0 check (deposit_fixed_cents >= 0),

  photo_ids uuid[] not null default '{}',

  is_published boolean not null default false,
  position integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (growth_client_id, slug)
);

create index if not exists tours_client_idx
  on public.tours (growth_client_id, departure_date);

create table if not exists public.tours_bookings (
  id uuid primary key default gen_random_uuid(),
  growth_client_id uuid not null references public.growth_clients (id) on delete cascade,
  tour_id uuid not null references public.tours (id) on delete restrict,

  seats integer not null default 1 check (seats between 1 and 50),

  guest_name text not null,
  guest_email text,
  guest_phone text,

  price_cents integer not null,
  total_cents integer not null,
  deposit_cents integer not null default 0,

  status text not null default 'held' check (status in ('held', 'confirmed', 'expired', 'cancelled')),
  hold_expires_at timestamptz,

  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'deposit_paid', 'paid')),
  payment_reference text unique,
  gateway text,
  deposit_paid_at timestamptz,

  bizup_document_id uuid references public.bizup_documents (id) on delete set null,
  chat_thread_id uuid references public.board_threads (id) on delete set null,
  guest_token text not null unique,

  cancelled_at timestamptz,
  cancellation_reason text,
  refund_given boolean not null default false,
  refund_note text,

  created_at timestamptz not null default now()
);

create index if not exists tours_bookings_tour_idx
  on public.tours_bookings (tour_id, status);
create index if not exists tours_bookings_client_idx
  on public.tours_bookings (growth_client_id, created_at);
create index if not exists tours_bookings_hold_idx
  on public.tours_bookings (hold_expires_at)
  where status = 'held';
create index if not exists tours_bookings_document_idx
  on public.tours_bookings (bizup_document_id)
  where bizup_document_id is not null;
create index if not exists tours_bookings_thread_idx
  on public.tours_bookings (chat_thread_id)
  where chat_thread_id is not null;

-- At zero seats the tour page collects names for the next date rather than
-- showing a dead end. That list is the member's, visible in their dashboard.
create table if not exists public.tours_waitlist (
  id uuid primary key default gen_random_uuid(),
  growth_client_id uuid not null references public.growth_clients (id) on delete cascade,
  tour_id uuid not null references public.tours (id) on delete cascade,

  name text not null,
  email text,
  phone text,
  people integer not null default 1 check (people between 1 and 50),
  note text,

  created_at timestamptz not null default now()
);

create index if not exists tours_waitlist_tour_idx
  on public.tours_waitlist (tour_id, created_at);
create index if not exists tours_waitlist_client_idx
  on public.tours_waitlist (growth_client_id, created_at);

-- ============================================================
-- Availability, as one function both the reader and the writer use
-- ============================================================

-- How many units of a room type are spoken for on the tightest night in a
-- range. Bookings and blocks are counted in the same sum because a blocked
-- night and a booked night are the same thing to a guest searching.
--
-- An expired hold counts for nothing here regardless of whether the sweep
-- has run yet: the sweep is hygiene, and correctness must not wait on a
-- schedule.
create or replace function public.stays_units_taken(
  p_room_type_id uuid,
  p_check_in date,
  p_check_out date
) returns integer
language sql
stable
as $$
  select coalesce(max(taken), 0)::integer
  from (
    select
      coalesce((
        select sum(b.units)
        from public.stays_bookings b
        where b.room_type_id = p_room_type_id
          and (b.status = 'confirmed' or (b.status = 'held' and b.hold_expires_at > now()))
          and b.check_in <= night::date
          and b.check_out > night::date
      ), 0)
      +
      coalesce((
        select sum(k.units)
        from public.stays_blocks k
        where k.room_type_id = p_room_type_id
          and k.first_night <= night::date
          and k.last_night >= night::date
      ), 0) as taken
    from generate_series(p_check_in, p_check_out - 1, interval '1 day') as night
  ) nights;
$$;

-- The hold, made atomic.
--
-- Acceptance criterion 4 is that a held room cannot be booked by a second
-- guest during the hold, and the naive version fails it: two requests
-- arriving together both read "one unit free" and both write. So the
-- availability sum and the insert happen inside one transaction that has
-- already taken a row lock on the room type. Every writer takes the same
-- lock in the same order, so the second one waits, re-counts, and correctly
-- finds nothing left.
create or replace function public.stays_create_hold(
  p_growth_client_id uuid,
  p_room_type_id uuid,
  p_check_in date,
  p_check_out date,
  p_units integer,
  p_adults integer,
  p_children integer,
  p_guest_name text,
  p_guest_email text,
  p_guest_phone text,
  p_nightly_rate_cents integer,
  p_nights integer,
  p_total_cents integer,
  p_deposit_cents integer,
  p_guest_token text,
  p_payment_reference text,
  p_hold_minutes integer
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_units_count integer;
  v_taken integer;
  v_id uuid;
begin
  if p_check_out <= p_check_in then
    raise exception 'invalid_dates';
  end if;

  select units_count into v_units_count
  from public.stays_room_types
  where id = p_room_type_id
    and growth_client_id = p_growth_client_id
    and is_active
    and rate_cents is not null
  for update;

  if v_units_count is null then
    raise exception 'room_unavailable';
  end if;

  v_taken := public.stays_units_taken(p_room_type_id, p_check_in, p_check_out);

  if v_taken + p_units > v_units_count then
    raise exception 'not_available';
  end if;

  insert into public.stays_bookings (
    growth_client_id, room_type_id, check_in, check_out, units, adults, children,
    guest_name, guest_email, guest_phone,
    nightly_rate_cents, nights, total_cents, deposit_cents,
    status, hold_expires_at, guest_token, payment_reference
  ) values (
    p_growth_client_id, p_room_type_id, p_check_in, p_check_out, p_units, p_adults, p_children,
    p_guest_name, p_guest_email, p_guest_phone,
    p_nightly_rate_cents, p_nights, p_total_cents, p_deposit_cents,
    'held', now() + make_interval(mins => p_hold_minutes), p_guest_token, p_payment_reference
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Seats, same shape and the same reason. A tour with two seats left must
-- never sell three because two people pressed at once.
create or replace function public.tours_create_hold(
  p_growth_client_id uuid,
  p_tour_id uuid,
  p_seats integer,
  p_guest_name text,
  p_guest_email text,
  p_guest_phone text,
  p_price_cents integer,
  p_total_cents integer,
  p_deposit_cents integer,
  p_guest_token text,
  p_payment_reference text,
  p_hold_minutes integer
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seats_total integer;
  v_taken integer;
  v_id uuid;
begin
  select seats_total into v_seats_total
  from public.tours
  where id = p_tour_id
    and growth_client_id = p_growth_client_id
    and is_published
  for update;

  if v_seats_total is null then
    raise exception 'tour_unavailable';
  end if;

  select coalesce(sum(seats), 0) into v_taken
  from public.tours_bookings
  where tour_id = p_tour_id
    and (status = 'confirmed' or (status = 'held' and hold_expires_at > now()));

  if v_taken + p_seats > v_seats_total then
    raise exception 'not_available';
  end if;

  insert into public.tours_bookings (
    growth_client_id, tour_id, seats,
    guest_name, guest_email, guest_phone,
    price_cents, total_cents, deposit_cents,
    status, hold_expires_at, guest_token, payment_reference
  ) values (
    p_growth_client_id, p_tour_id, p_seats,
    p_guest_name, p_guest_email, p_guest_phone,
    p_price_cents, p_total_cents, p_deposit_cents,
    'held', now() + make_interval(mins => p_hold_minutes), p_guest_token, p_payment_reference
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- ============================================================
-- Row level security
-- ============================================================

alter table public.stays_properties enable row level security;
alter table public.stays_room_types enable row level security;
alter table public.stays_bookings enable row level security;
alter table public.stays_blocks enable row level security;
alter table public.tours enable row level security;
alter table public.tours_bookings enable row level security;
alter table public.tours_waitlist enable row level security;

-- The member owns everything under their own growth_client, through the
-- same growth_members join every other tenant table in this schema uses.
create policy "members manage own stays property"
  on public.stays_properties for all
  to authenticated
  using (growth_client_id in (select growth_client_id from public.growth_members where user_id = auth.uid()))
  with check (growth_client_id in (select growth_client_id from public.growth_members where user_id = auth.uid()));

create policy "members manage own room types"
  on public.stays_room_types for all
  to authenticated
  using (growth_client_id in (select growth_client_id from public.growth_members where user_id = auth.uid()))
  with check (growth_client_id in (select growth_client_id from public.growth_members where user_id = auth.uid()));

create policy "members manage own stay bookings"
  on public.stays_bookings for all
  to authenticated
  using (growth_client_id in (select growth_client_id from public.growth_members where user_id = auth.uid()))
  with check (growth_client_id in (select growth_client_id from public.growth_members where user_id = auth.uid()));

create policy "members manage own blocks"
  on public.stays_blocks for all
  to authenticated
  using (growth_client_id in (select growth_client_id from public.growth_members where user_id = auth.uid()))
  with check (growth_client_id in (select growth_client_id from public.growth_members where user_id = auth.uid()));

create policy "members manage own tours"
  on public.tours for all
  to authenticated
  using (growth_client_id in (select growth_client_id from public.growth_members where user_id = auth.uid()))
  with check (growth_client_id in (select growth_client_id from public.growth_members where user_id = auth.uid()));

create policy "members manage own tour bookings"
  on public.tours_bookings for all
  to authenticated
  using (growth_client_id in (select growth_client_id from public.growth_members where user_id = auth.uid()))
  with check (growth_client_id in (select growth_client_id from public.growth_members where user_id = auth.uid()));

create policy "members manage own tour waitlist"
  on public.tours_waitlist for all
  to authenticated
  using (growth_client_id in (select growth_client_id from public.growth_members where user_id = auth.uid()))
  with check (growth_client_id in (select growth_client_id from public.growth_members where user_id = auth.uid()));

-- A published tour is public marketing copy with no personal information in
-- it, so anonymous read is correct and useful. Nothing else here gets one:
-- stays_bookings, tours_bookings and tours_waitlist hold guests' names,
-- email addresses and phone numbers, which are personal information
-- belonging to non-members and never appear in anything an unauthenticated
-- request can fetch. Both guest-facing pages are rendered server-side
-- behind an unguessable token instead.
create policy "anyone reads published tours"
  on public.tours for select
  to anon, authenticated
  using (is_published);

-- ============================================================
-- Grants
--
-- This project does not rely on Postgres default privileges (see
-- 20260708130000_grant_api_roles.sql). A missing base grant is checked
-- before RLS is ever evaluated, so leaving these out produces "permission
-- denied" on a table whose policies are perfectly correct.
-- ============================================================

grant select, insert, update, delete on public.stays_properties to authenticated;
grant select, insert, update, delete on public.stays_room_types to authenticated;
grant select, insert, update, delete on public.stays_bookings to authenticated;
grant select, insert, update, delete on public.stays_blocks to authenticated;
grant select, insert, update, delete on public.tours to authenticated;
grant select, insert, update, delete on public.tours_bookings to authenticated;
grant select, insert, update, delete on public.tours_waitlist to authenticated;

grant select on public.tours to anon;

grant all on public.stays_properties to service_role;
grant all on public.stays_room_types to service_role;
grant all on public.stays_bookings to service_role;
grant all on public.stays_blocks to service_role;
grant all on public.tours to service_role;
grant all on public.tours_bookings to service_role;
grant all on public.tours_waitlist to service_role;

grant execute on function public.stays_units_taken(uuid, date, date) to service_role, authenticated;
-- Never granted to anon. A guest holds a room through a Server Action that
-- has already verified Turnstile; nothing anonymous calls this directly.
grant execute on function public.stays_create_hold(uuid, uuid, date, date, integer, integer, integer, text, text, text, integer, integer, integer, integer, text, text, integer) to service_role;
grant execute on function public.tours_create_hold(uuid, uuid, integer, text, text, text, integer, integer, integer, text, text, integer) to service_role;
