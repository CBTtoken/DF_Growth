-- The Board, structural moderation (handoff scripts/handoff-board-moderation.md).
--
-- Job 2: "Anything with money attached comes from an identified business
-- with a page, a number and a subscription to lose... Enforce this at the
-- data layer, in RLS, not the interface. A hidden button is a suggestion.
-- A database rule is a rule."
--
-- Every board_* table today has RLS enabled with zero policies -- all
-- reads/writes go through the service-role admin client, which bypasses RLS
-- entirely. A policy only that connection could ever satisfy would be a
-- comment, not a control. So this is a deliberate, narrow exception to that
-- pattern: for_sale/offer/special inserts specifically move onto the
-- member's own session (the `authenticated` role) in
-- src/app/board/new/actions.ts, and this policy is what that connection has
-- to satisfy. Every other board table, and every other operation on
-- board_posts, keeps today's posture unchanged.

grant insert on public.board_posts to authenticated;

create policy "members insert their own posts, entitlement checked"
on public.board_posts for insert
to authenticated
with check (
  -- Attribution: a post attributed to a business must be the caller's own.
  -- Granting insert to `authenticated` at all is new, so this also has to
  -- stop one member impersonating another's growth_client_id, not just
  -- gate the money kinds below.
  (
    growth_client_id is null
    or exists (
      select 1 from public.growth_members
      where growth_members.user_id = auth.uid()
        and growth_members.growth_client_id = board_posts.growth_client_id
    )
  )
  and (
    kind not in ('for_sale', 'offer', 'special')
    or (
      posted_by_client_id is not null
      and exists (
        select 1 from public.growth_members
        join public.growth_clients on growth_clients.id = growth_members.growth_client_id
        where growth_members.user_id = auth.uid()
          and growth_members.growth_client_id = board_posts.posted_by_client_id
          and growth_clients.status = 'active'
      )
    )
  )
);
