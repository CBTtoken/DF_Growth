-- Admin-granted free access, distinct from the agent-comped flow
-- (is_agent_comped): that one is permanent and only ever Foundation,
-- granted by the client themselves via /agents/setup-page. This is
-- Dewald granting free access to ANY plan for a chosen window, for
-- prospects he wants to onboard, build a real page for, and let test
-- before they commit to paying.
alter table public.growth_clients
  add column is_admin_comped boolean not null default false,
  add column admin_comp_until timestamptz,
  add column admin_comp_note text;
