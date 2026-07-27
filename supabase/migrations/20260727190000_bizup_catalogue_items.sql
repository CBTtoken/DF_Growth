-- BizUp Phase 1, build step 3 (BizUp/docs/bizup-phase1-spec.md Sec 15.3
-- "Catalogue", detail in Sec 11, data model in Sec 4).
--
-- Called "price list" everywhere the member can see, matching Sec 11's own
-- member-facing wording ("Save this to my price list"). The table keeps the
-- spec's internal name.
--
-- Sec 11 is explicit that this is a shortcut and never a requirement: a
-- member must always be able to type a free-text line into a quote without
-- touching the price list at all. Nothing in this schema is referenced as
-- mandatory by anything else.

create table public.bizup_catalogue_items (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.bizup_accounts (id) on delete restrict,

  -- Sec 11's three broad shapes that service businesses need: labour,
  -- parts and products, and travel. 'callout' and 'other' round it out
  -- rather than forcing a plumber's callout fee to be filed as labour.
  type text not null default 'labour'
    check (type in ('labour', 'part', 'product', 'travel', 'callout', 'other')),

  name text not null,
  description text,

  -- Sec 11: hourly rate, day rate, per-job fixed price, per kilometre,
  -- fixed callout. The unit is what makes a stored price meaningful, since
  -- R450 means something very different per hour than per job.
  unit text not null default 'each'
    check (unit in ('hour', 'day', 'each', 'km', 'callout', 'job')),

  -- Integer cents, matching bookable_units and shop_products and the rest
  -- of BizUp. Excludes VAT always: whether VAT is added is a property of
  -- the member's registration status at the time a document is issued
  -- (Sec 3.1), never of a stored price.
  unit_price_excl_cents integer not null check (unit_price_excl_cents >= 0),

  -- Sec 11: "a plumber buys a geyser at cost and bills at cost plus
  -- margin". Nullable because most lines have no markup at all, and a
  -- default of zero would be a lie rather than an absence.
  default_markup_pct numeric(6,2) check (default_markup_pct is null or default_markup_pct >= 0),

  -- Sec 13: the column exists so zero-rated and exempt supplies can be
  -- added later without a migration, but only 'standard' is exposed in the
  -- Phase 1 UI. Do not surface the other two without the VAT treatment to
  -- go with them.
  tax_code text not null default 'standard' check (tax_code in ('standard', 'zero', 'exempt')),

  -- Archiving rather than deleting is the normal path for a price that is
  -- no longer offered. A deleted item would still be referenced by every
  -- quote that used it, and a member who stops offering a service should
  -- not lose the history of having offered it.
  active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The quote builder's hot path: this account's active items, by name.
create index bizup_catalogue_account_active_idx
  on public.bizup_catalogue_items (account_id, name)
  where active;

alter table public.bizup_catalogue_items enable row level security;

-- Sec 8: account_id derived from auth.uid() via a join, never from a
-- request parameter. The select policy also covers an insert's RETURNING
-- clause, which otherwise fails RLS on this Supabase project.
create policy "members read own bizup catalogue"
  on public.bizup_catalogue_items for select
  to authenticated
  using (account_id in (select id from public.bizup_accounts where owner_user_id = auth.uid()));

create policy "members create own bizup catalogue"
  on public.bizup_catalogue_items for insert
  to authenticated
  with check (account_id in (select id from public.bizup_accounts where owner_user_id = auth.uid()));

create policy "members update own bizup catalogue"
  on public.bizup_catalogue_items for update
  to authenticated
  using (account_id in (select id from public.bizup_accounts where owner_user_id = auth.uid()))
  with check (account_id in (select id from public.bizup_accounts where owner_user_id = auth.uid()));

create policy "members delete own bizup catalogue"
  on public.bizup_catalogue_items for delete
  to authenticated
  using (account_id in (select id from public.bizup_accounts where owner_user_id = auth.uid()));

grant select, insert, update, delete on public.bizup_catalogue_items to service_role;
