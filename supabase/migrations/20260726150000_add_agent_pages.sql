-- Agent Programme Phase 1 (docs/agent-programme-build-spec.md Sec 1.1 to 1.7).
--
-- The agent page hangs off the existing agents row rather than a parallel
-- table: Sec 1.1 is explicit that one login carries both roles, and an
-- agent's page is a property of being an agent, not a second account. The
-- alternative (a growth_clients row with page_type = 'agent') was rejected
-- because Sec 1.1 also says the two roles share no content, and an agent
-- with no business membership at all (Natasha, Helplift) has no
-- growth_clients row to hang anything off.
alter table public.agents
  -- Sec 1.2: resolves at root level, one namespace shared with
  -- growth_clients.slug and the reserved platform routes. Enforced in
  -- application code (src/lib/slug-namespace.ts) since the uniqueness
  -- spans two tables and a hardcoded blocked list, which no single
  -- column constraint can express. Unique here anyway, as the last line
  -- of defence against two agents racing for the same slug.
  add column page_slug text unique,
  -- Sec 1.2: "404 on unknown or inactive agent slugs." A page stays
  -- draft until Dewald publishes it, so a half-populated page is never
  -- publicly reachable.
  add column page_status text not null default 'draft'
    check (page_status in ('draft', 'live')),
  -- Sec 1.4: the one colour every other page colour is derived from.
  -- Defaults to the DigitalFlyer brand blue so a page is never unstyled.
  add column accent_color text not null default '#1081b8',
  add column town text,
  -- Storage path inside the agent-photos bucket below. Null means the
  -- generated monogram badge is used instead (Sec 1.5) — never a stock
  -- photo of a stranger.
  add column photo_path text,
  -- Sec 1.3 credential strip, "active since {month year}". Separate from
  -- approved_at so Dewald can set a truthful date for an agent who was
  -- working before this system existed, without rewriting the approval
  -- audit trail.
  add column active_since date,
  -- Page copy, all first person (Sec 1.3), all AI-draftable (Sec 1.6)
  -- and all editable afterward.
  add column hero_promise text,
  add column story_text text,
  add column offer_text text,
  -- Sec 1.7: same shape as growth_clients.packages ({name, price,
  -- description, type}), deliberately not a parallel model.
  add column services jsonb not null default '[]'::jsonb,
  -- Sec 1.6: the four questions the copy is generated from, kept so a
  -- redraft doesn't need the agent interviewed again.
  add column intake_before text,
  add column intake_why text,
  add column intake_who text,
  add column intake_area text;

-- Sec 1.2: every public lookup is "this slug, and it must be live".
create index agents_page_slug_live_idx on public.agents (page_slug)
  where page_status = 'live';

-- Public bucket, same as client-photos and event-photos: an agent page is
-- a public unauthenticated page, so the portrait has to load from a plain
-- URL with no signed-URL round trip.
insert into storage.buckets (id, name, public)
values ('agent-photos', 'agent-photos', true)
on conflict (id) do nothing;
