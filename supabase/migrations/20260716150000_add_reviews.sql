-- Rate & Review Sprint 1 (docs/GROWTH_RATE_REVIEW_BUILD_SPEC_CLAUDE.md).
--
-- A genuinely new account shape for this project: every existing login is
-- tied to a business via growth_members (see require-growth-client.ts).
-- A reviewer has no business membership at all, so this is its own table
-- keyed directly on auth.uid(), not routed through growth_members.
create table public.reviewer_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id),
  -- Public display shows first name only, never full name or email (Sec 5)
  -- — only ever capture what's actually shown, nothing more.
  display_name text not null,
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.growth_clients (id) on delete cascade,
  reviewer_account_id uuid not null references public.reviewer_accounts (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  review_text text not null,
  status text not null default 'pending_verification'
    check (status in ('pending_verification', 'published', 'flagged', 'removed')),
  business_reply text,
  business_reply_at timestamptz,
  flagged_reason text,
  created_at timestamptz not null default now(),
  -- Set when the review transitions to published — either immediately, if
  -- the reviewer account's email was already confirmed at submission time,
  -- or later, the moment a pending reviewer confirms their email (Sec 2/3:
  -- "unverified submissions sit pending... until confirmed" — confirmation
  -- is an account-level event, read from auth.users.email_confirmed_at,
  -- not duplicated as a separate per-review flag).
  verified_at timestamptz,
  -- One review per verified account per business (Sec 3).
  unique (business_id, reviewer_account_id)
);

alter table public.reviewer_accounts enable row level security;
alter table public.reviews enable row level security;

-- reviewer_accounts: a reviewer reads their own account row. No public
-- insert/update policy — writes happen server-side via a Server Action
-- using the service role client, same pattern as `leads`.
create policy "reviewer reads own account"
on public.reviewer_accounts for select
using (user_id = auth.uid());

-- reviews: genuinely public read, unlike every other table in this schema
-- so far — the entire point is a visitor browsing a business page sees
-- published reviews without being logged in at all.
create policy "anyone reads published reviews"
on public.reviews for select
using (status = 'published');

-- A reviewer can also see their own review regardless of status (e.g. to
-- see it's still pending confirmation), and a business owner can see every
-- review left on their own page regardless of status (Sec 6 dashboard,
-- including flagged ones).
create policy "reviewer reads own review"
on public.reviews for select
using (
  exists (
    select 1 from public.reviewer_accounts
    where reviewer_accounts.id = reviews.reviewer_account_id
    and reviewer_accounts.user_id = auth.uid()
  )
);

create policy "business reads own page reviews"
on public.reviews for select
using (
  exists (
    select 1 from public.growth_members
    where growth_members.growth_client_id = reviews.business_id
    and growth_members.user_id = auth.uid()
  )
);

grant select, insert on public.reviewer_accounts to service_role;
grant select, insert, update on public.reviews to service_role;
