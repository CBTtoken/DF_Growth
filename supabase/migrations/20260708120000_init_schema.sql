-- DigitalFlyer Growth schema (CLAUDE.md Section 5)
-- Applied automatically by the Supabase GitHub integration on push to main.

-- ============================================================
-- Tables
-- ============================================================

create table public.growth_clients (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  slug text unique not null,
  plan text not null check (plan in ('foundation', 'growth_engine', 'enterprise')),
  paystack_subscription_code text,
  status text not null default 'pending_intake'
    check (status in ('pending_intake', 'active', 'paused', 'cancelled')),
  brand_primary_color text,
  brand_secondary_color text,
  logo_path text,
  meta_pixel_id text, -- null for 'foundation' tier clients, they never connect Meta ads
  meta_ad_account_id text,
  created_at timestamptz not null default now()
);

-- Access tokens are sensitive. Encrypt at the application layer before insert,
-- never store a raw long-lived Meta access token in plaintext in this column.
create table public.growth_client_secrets (
  growth_client_id uuid primary key references public.growth_clients (id) on delete cascade,
  meta_capi_access_token_encrypted text,
  updated_at timestamptz not null default now()
);

create table public.growth_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  growth_client_id uuid not null references public.growth_clients (id) on delete cascade,
  role text not null default 'growth_owner',
  unique (user_id, growth_client_id)
);

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  growth_client_id uuid not null references public.growth_clients (id) on delete cascade,
  author_name text not null,
  quote text not null,
  rating int check (rating between 1 and 5),
  photo_path text,
  created_at timestamptz not null default now()
);

create table public.generated_assets (
  id uuid primary key default gen_random_uuid(),
  growth_client_id uuid not null references public.growth_clients (id) on delete cascade,
  testimonial_id uuid references public.testimonials (id),
  template text not null check (template in ('testimonial-square', 'quote-story', 'promo-banner')),
  image_path text not null,
  created_at timestamptz not null default now()
);

create table public.landing_pages (
  id uuid primary key default gen_random_uuid(),
  growth_client_id uuid not null references public.growth_clients (id) on delete cascade,
  slug text not null,
  headline text not null,
  subheadline text,
  cta_label text not null default 'Get Started',
  cta_href text not null,
  published boolean not null default false,
  unique (growth_client_id, slug)
);

create table public.capi_events (
  id uuid primary key default gen_random_uuid(),
  growth_client_id uuid not null references public.growth_clients (id) on delete cascade,
  event_name text not null check (event_name in ('Lead', 'Purchase', 'CompleteRegistration')),
  event_id text not null, -- shared with the client-side Pixel event for dedup
  fbclid text,
  hashed_email text,
  hashed_phone text,
  payload jsonb,
  sent_at timestamptz not null default now(),
  response_status int
);

-- A landing page conversion (e.g. a sign-up lead), distinct from `testimonials`,
-- which holds client-submitted marketing content.
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  growth_client_id uuid not null references public.growth_clients (id) on delete cascade,
  landing_page_id uuid references public.landing_pages (id),
  name text not null,
  email text not null,
  phone text,
  fbclid text,
  event_id text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.growth_clients enable row level security;
alter table public.growth_client_secrets enable row level security;
alter table public.growth_members enable row level security;
alter table public.testimonials enable row level security;
alter table public.landing_pages enable row level security;
alter table public.generated_assets enable row level security;
alter table public.capi_events enable row level security;
alter table public.leads enable row level security;

-- growth_members: a user can see their own membership rows (used to resolve
-- which growth_client_id they belong to).
create policy "members read own membership"
on public.growth_members for select
using (user_id = auth.uid());

-- growth_clients: members read their own client record.
create policy "members read own client"
on public.growth_clients for select
using (
  exists (
    select 1 from public.growth_members
    where growth_members.growth_client_id = growth_clients.id
    and growth_members.user_id = auth.uid()
  )
);

-- testimonials: members read and write their own client's data.
create policy "members read own client testimonials"
on public.testimonials for select
using (
  exists (
    select 1 from public.growth_members
    where growth_members.growth_client_id = testimonials.growth_client_id
    and growth_members.user_id = auth.uid()
  )
);

create policy "members write own client testimonials"
on public.testimonials for insert
with check (
  exists (
    select 1 from public.growth_members
    where growth_members.growth_client_id = testimonials.growth_client_id
    and growth_members.user_id = auth.uid()
  )
);

-- landing_pages: members read and write their own client's data.
create policy "members read own client landing pages"
on public.landing_pages for select
using (
  exists (
    select 1 from public.growth_members
    where growth_members.growth_client_id = landing_pages.growth_client_id
    and growth_members.user_id = auth.uid()
  )
);

create policy "members write own client landing pages"
on public.landing_pages for insert
with check (
  exists (
    select 1 from public.growth_members
    where growth_members.growth_client_id = landing_pages.growth_client_id
    and growth_members.user_id = auth.uid()
  )
);

-- generated_assets: system-generated (Section 8), members only read their own.
create policy "members read own client generated assets"
on public.generated_assets for select
using (
  exists (
    select 1 from public.growth_members
    where growth_members.growth_client_id = generated_assets.growth_client_id
    and growth_members.user_id = auth.uid()
  )
);

-- leads: members read their own client's leads. No public insert policy —
-- leads are only written server-side via the Server Action using the
-- service role client, never directly from the browser.
create policy "members read own client leads"
on public.leads for select
using (
  exists (
    select 1 from public.growth_members
    where growth_members.growth_client_id = leads.growth_client_id
    and growth_members.user_id = auth.uid()
  )
);

-- growth_client_secrets and capi_events are never client-readable directly,
-- only accessed server-side via the service role key inside Route Handlers/
-- Server Actions. No select policy is defined for either — RLS with zero
-- policies means every non-service-role query is denied by default.
