-- Consolidated Sprint Sec 3.4: member-facing analytics, page-view tracking.
-- One row per view rather than a single counter column — cheap at this
-- traffic level, and the only way to support "a basic trend" (group by
-- day) on the dashboard, not just a running total. Never read/written
-- from a client's own session directly — always through the admin client
-- (the tracking route inserts, the dashboard query reads), so no RLS
-- policy is needed, only the service_role grant every other table here
-- needs (see 20260715150000_grant_book_orders.sql's own comment on why
-- RLS being enabled doesn't imply service_role can already read/write).
create table public.page_views (
  id uuid primary key default gen_random_uuid(),
  growth_client_id uuid not null references public.growth_clients (id) on delete cascade,
  viewed_at timestamptz not null default now()
);

create index page_views_growth_client_id_viewed_at_idx
  on public.page_views (growth_client_id, viewed_at);

alter table public.page_views enable row level security;

grant select, insert on public.page_views to service_role;
