-- Handoff: scripts/handoff-unified-account-and-reviews.md, Job 4.
--
-- A review left through KatisoBiz's "request a review" button (Job 4) needs
-- somewhere to land even when the member has no Growth page yet. Rather
-- than invent a second reviews table, `reviews` gets a second, mutually
-- exclusive target: business_id (Growth, existing) or the new
-- bizup_account_id. No backfill is needed when a KatisoBiz-only member
-- later takes a Growth plan and gets linked (Job 1) — the Growth page's own
-- reviews query is extended separately to also read reviews attached to its
-- linked bizup_account_id, so a review already shows up the moment the
-- accounts are linked rather than needing its row rewritten.

alter table public.reviews
  alter column business_id drop not null;

alter table public.reviews
  add column bizup_account_id uuid references public.bizup_accounts(id) on delete cascade;

alter table public.reviews
  add constraint reviews_one_target check (
    (business_id is not null and bizup_account_id is null)
    or (bizup_account_id is not null and business_id is null)
  );

-- One review per person per KatisoBiz account, the same rule
-- reviews_one_per_identity_idx already enforces per Growth business.
create unique index if not exists reviews_one_per_identity_bizup_idx
  on public.reviews (bizup_account_id, identity_id)
  where identity_id is not null and bizup_account_id is not null;

create index if not exists reviews_bizup_account_idx on public.reviews (bizup_account_id);

-- Mirrors "business reads own page reviews": a KatisoBiz account owner sees
-- every review left against their own account regardless of status,
-- including flagged ones, the same visibility a Growth business owner gets.
create policy "bizup account reads own reviews"
on public.reviews for select
using (
  exists (
    select 1 from public.bizup_accounts
    where bizup_accounts.id = reviews.bizup_account_id
    and bizup_accounts.owner_user_id = auth.uid()
  )
);
