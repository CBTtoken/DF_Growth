-- Public Beta Polish Sprint Sec 13.6: lightweight anonymous event tracking
-- for the beta's own success metrics — deliberately just event_type +
-- timestamp, nothing else. No growth_client_id, no email, no IP: the spec
-- is explicit that "anonymous" here means no personal data attached to the
-- event itself, just counts and timing for aggregate reporting.
create table public.beta_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('onboarding_completed', 'first_lead_received', 'trial_converted')),
  created_at timestamptz not null default now()
);

create index beta_events_event_type_created_at_idx on public.beta_events (event_type, created_at);

alter table public.beta_events enable row level security;

-- Written only from Server Actions/Route Handlers via the service-role
-- client, same pattern as every other system-only table this sprint
-- (homepage_inquiries, whatsapp_conversations) — no anon/authenticated
-- policy needed since nothing client-side ever touches this table
-- directly.
grant select, insert on public.beta_events to service_role;
