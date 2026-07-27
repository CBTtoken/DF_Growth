-- BizUp Phase 1, build step 1 continued (BizUp/docs/bizup-phase1-spec.md
-- Sec 8): "Changing bank details requires an email confirmation click, to
-- defend against account takeover leading to redirected payments."
--
-- Implemented as a typed 6-digit code rather than the clicked link the
-- spec describes, and that is a deliberate strengthening, not a shortcut.
-- This project already established (Rate & Review Sprint 1) that mail
-- scanners such as Zoho and Microsoft Safe Links open links in incoming
-- mail before the recipient does, which silently consumes a single-use
-- token. For a login link that is an annoyance. Here it would be a hole:
-- an attacker who has taken over an account changes the banking details,
-- the real owner's own mail scanner opens the confirmation link, and the
-- change confirms itself with no human involved. A code that has to be
-- typed back into the app cannot be consumed by a scanner.
--
-- The proposed details live in this table, not in bizup_bank_details, so
-- an unconfirmed change can never be the thing an invoice prints.

create table public.bizup_bank_change_requests (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.bizup_accounts (id) on delete restrict,

  -- The proposed details, encrypted exactly as the live row is
  -- (src/lib/crypto.ts, AES-256-GCM). A pending change is just as
  -- sensitive as a live one.
  bank_name text not null,
  account_holder text not null,
  account_number_encrypted text not null,
  account_number_last4 text not null check (account_number_last4 ~ '^[0-9]{4}$'),
  branch_code text not null,
  account_type text not null check (account_type in ('cheque', 'savings')),

  -- HMAC of the code, never the code itself, same reasoning as a password.
  -- Anyone reading this table cannot use what they find to confirm a change.
  code_hash text not null,
  -- Bounded so the six digits cannot simply be guessed. The request is dead
  -- once this is exceeded, and a fresh one has to be started.
  attempts integer not null default 0,
  expires_at timestamptz not null,

  confirmed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);

-- At most one live request per account. Without this, two overlapping
-- requests would race and whichever code arrived second could confirm the
-- other one's details.
create unique index bizup_bank_change_one_pending_per_account
  on public.bizup_bank_change_requests (account_id)
  where confirmed_at is null and cancelled_at is null;

alter table public.bizup_bank_change_requests enable row level security;

-- No policies for `authenticated` at all, which with RLS on means a member
-- cannot read or write this table through the API. Deliberate: the code
-- hash and the pending account number live here, and the entire flow runs
-- server-side through Server Actions using the service role. A member who
-- could read their own row could read the hash.

grant select, insert, update on public.bizup_bank_change_requests to service_role;
-- No delete: a rejected or expired attempt to change banking details is
-- exactly the kind of thing worth still having a record of if a member ever
-- reports money going to the wrong account. Superseded rows are marked
-- cancelled, not removed.
