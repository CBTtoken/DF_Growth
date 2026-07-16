-- List Your Event Sprint 1 (docs/GROWTH_LIST_YOUR_EVENT_BUILD_SPEC_CLAUDE.md).
--
-- event_organizers mirrors reviewer_accounts' shape (Rate & Review Sprint
-- 1, supabase/migrations/20260716150000_add_reviews.sql) for the same
-- reason: a genuinely new account type with no business membership, keyed
-- directly on auth.uid(). An existing Growth business owner listing an
-- event gets one of these created transparently on first use via their
-- already-authenticated session (Sec 2: "no need to create a second
-- account if they're already a member") — never a second signup, never
-- comped into a business membership they don't have.
create table public.event_organizers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organizer_account_id uuid not null references public.event_organizers (id) on delete cascade,
  event_name text not null,
  description text,
  start_datetime timestamptz not null,
  end_datetime timestamptz,
  location_address text,
  -- Matched against Growth's existing city taxonomy (src/lib/cities.ts),
  -- same free-text-with-"Other" pattern as growth_clients.city — not an
  -- FK, that taxonomy is a curated in-code list, not a database table.
  city text not null,
  -- Sec 3: "workshop, market, community, fundraiser, and similar... keep
  -- it short and genuinely useful" — src/lib/event-types.ts is the single
  -- source of truth this check constraint must stay in sync with.
  event_type text not null
    check (event_type in ('workshop', 'market', 'community', 'fundraiser', 'sports', 'arts-culture', 'other')),
  social_links jsonb,
  contact_details jsonb,
  images jsonb,
  ticket_info_text text,
  -- No 'pending_verification' state here, unlike reviews — Sec 6 ties the
  -- auto-publish/manual-review split explicitly to Turnstile + spam-pattern
  -- checks (Sprint 2), never to email confirmation. Sprint 1 has none of
  -- that infrastructure yet, so every Sprint 1 submission publishes
  -- immediately; email confirmation (still required by Supabase's own
  -- "Confirm signup" project setting) only gates the organizer's ability
  -- to log back in later, not whether their event is already live.
  status text not null default 'published'
    check (status in ('published', 'pending_review', 'flagged', 'removed', 'expired')),
  -- Sprint 2 fields (report-flag / admin moderation queue), added now so
  -- the Sprint 2 migration only has to add behavior, not new columns —
  -- same reasoning as reviews.flagged_by/flagged_reason/flagged_at.
  flagged_by text check (flagged_by in ('public', 'system')),
  flagged_reason text,
  flagged_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.event_organizers enable row level security;
alter table public.events enable row level security;

create policy "organizer reads own account"
on public.event_organizers for select
using (user_id = auth.uid());

-- Public read, same as reviews — the entire point is a visitor browsing
-- Events sees published listings without being logged in at all. Sec 4's
-- "past events automatically drop out of the public browse view" is
-- enforced by the browse query filtering on start_datetime, not by this
-- policy or a status value — a past event's status stays 'published'
-- (Sec 4: "kept in the database, not deleted, just no longer surfaced"),
-- consistent with 'expired' being reserved for Sprint 2's explicit
-- archiving job rather than every event past its date.
create policy "anyone reads published events"
on public.events for select
using (status = 'published');

create policy "organizer reads own events"
on public.events for select
using (
  exists (
    select 1 from public.event_organizers
    where event_organizers.id = events.organizer_account_id
    and event_organizers.user_id = auth.uid()
  )
);

grant select, insert, update, delete on public.event_organizers to service_role;
grant select, insert, update, delete on public.events to service_role;
