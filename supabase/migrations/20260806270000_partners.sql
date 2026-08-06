-- Partners (e.g. BidWeb/Smart Value Club): a reseller who pays DigitalFlyer
-- directly and gives their own customers a Growth page as an added-value
-- perk. Distinct from `agents` (individual referral commission on a client
-- who pays DigitalFlyer themselves) — a partner-sourced client is comped,
-- never pays DigitalFlyer directly, and the partner's own user can add more
-- of their referred businesses over time via the dashboard.
create table public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_email text,
  created_at timestamptz not null default now()
);

alter table public.growth_clients
  add column partner_id uuid references public.partners(id),
  add column is_partner_comped boolean not null default false;

create index growth_clients_partner_id_idx on public.growth_clients (partner_id);

grant select on public.partners to authenticated, anon;
grant select, insert, update on public.partners to service_role;
