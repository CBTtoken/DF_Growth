-- Agent Referral Programme Sprint 1 (docs/GROWTH_AGENT_REFERRAL_BUILD_SPEC_CLAUDE.md).
--
-- agents is deliberately not modeled like reviewer_accounts/event_organizers
-- (a lightweight table keyed on auth.uid()) — an applicant has no account at
-- all yet at submission time (Sec 3: "no payment step, no account creation
-- yet, this is an application only"). user_id stays null until Sprint 2's
-- agent-comped Growth account flow creates one and links it back here.
create table public.agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id),
  full_name text not null,
  email text not null,
  whatsapp_number text not null,
  facebook_page_url text not null,
  understands_facebook_rules text not null,
  can_generate_content text not null,
  promotion_method text not null
    check (promotion_method in ('facebook_only', 'beyond_facebook', 'both')),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  -- Generated on approval (Sec 3), null while pending/rejected.
  referral_code text unique,
  -- Sprint 2 (Sec 7): Paystack Transfer Recipient code, never raw bank
  -- details — Paystack stores those on their side.
  paystack_recipient_code text,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  rejected_at timestamptz
);

-- Sec 5: attribution written onto the referred client's own record at
-- signup — simplest possible join for both the commission calculation and
-- an agent's own referral list (Sprint 2), no separate attribution table.
alter table public.growth_clients add column referred_by_agent_id uuid references public.agents (id);

-- Sec 6: one row per commission-earning event, not a running total — the
-- audit trail that makes a payout dispute-proof. rate_applied is stored as
-- the literal 25/40 the spec calls for (not a fraction) so a ledger row
-- reads as self-explanatory without cross-referencing the tier rules.
create table public.commission_ledger (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents (id) on delete cascade,
  referred_client_id uuid not null references public.growth_clients (id) on delete cascade,
  period_year integer not null,
  rate_applied integer not null check (rate_applied in (25, 40)),
  amount_due numeric not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved_to_pay', 'paid')),
  paystack_transfer_reference text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.agents enable row level security;
alter table public.commission_ledger enable row level security;

-- Sprint 1 has no agent-side dashboard yet (Sec 9 is Sprint 2) — RLS for an
-- agent reading their own agents/commission_ledger rows via user_id is
-- added alongside that dashboard, once user_id is actually being set.
-- Public application submission (Sec 3) goes through a Server Action using
-- the admin client, same as every other public write in this codebase
-- (reviews, events) — no anon-role insert policy needed here.

grant select, insert, update, delete on public.agents to service_role;
grant select, insert, update, delete on public.commission_ledger to service_role;
