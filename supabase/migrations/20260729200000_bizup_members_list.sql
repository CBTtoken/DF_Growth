-- The KatisoBiz Members List.
--
-- A deliberately thin public listing: business name, what they do, the
-- town they work in, and a WhatsApp button. No page, no photos, no
-- reviews, no URL of their own. That thinness is the product decision, not
-- a shortcut: "Marketplace Presence" is a paid DigitalFlyer Growth
-- feature, and giving every free KatisoBiz member a full page would give
-- away the thing Growth members pay for. A listing is a taste; a Growth
-- page is the meal.

-- What the member actually does. Critical, in Dewald's word, and the field
-- the whole list is organised around: nothing else we already store tells
-- us whether someone is a plumber or a painter.
alter table public.bizup_accounts
  add column if not exists service_type text;

-- Opt in, off by default, and this one is not negotiable.
--
-- Members signed up for quoting software. Publishing their business name
-- and phone number is processing their information for a purpose they
-- never agreed to, which is a POPIA problem, and practically it is exactly
-- the kind of surprise that makes a tradesman delete the app. Anyone
-- listed here chose to be.
alter table public.bizup_accounts
  add column if not exists listed_publicly boolean not null default false;

comment on column public.bizup_accounts.listed_publicly is
  'Member has explicitly asked to appear on the public KatisoBiz Members List. Off by default and never set by anything except the member themselves.';

-- Every tap on a listing's WhatsApp button.
--
-- This is the upsell trigger. A member who is getting calls from a free
-- listing is the easiest possible conversation about a Growth page, and
-- without counting them that conversation is guesswork.
create table public.bizup_listing_clicks (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.bizup_accounts (id) on delete cascade,
  clicked_at timestamptz not null default now(),
  -- Which button. Only whatsapp today, but naming it now means adding a
  -- second contact route later does not need a migration.
  kind text not null default 'whatsapp' check (kind in ('whatsapp', 'profile'))
);

create index bizup_listing_clicks_account_idx
  on public.bizup_listing_clicks (account_id, clicked_at desc);

alter table public.bizup_listing_clicks enable row level security;

-- A member can see how many people tapped their own listing. Nobody can
-- see anyone else's, and nobody can write one: the insert happens through
-- a route handler running as the service role, because a client-writable
-- counter is a counter that gets inflated.
create policy "members read own bizup listing clicks"
  on public.bizup_listing_clicks for select
  using (
    exists (
      select 1 from public.bizup_accounts a
      where a.id = bizup_listing_clicks.account_id
        and a.owner_user_id = auth.uid()
    )
  );

grant select, insert on public.bizup_listing_clicks to service_role;

-- Only listed members are ever read publicly, and only a few columns, so
-- the index matches how the page actually queries.
create index if not exists bizup_accounts_listed_idx
  on public.bizup_accounts (service_type, city)
  where listed_publicly = true;
