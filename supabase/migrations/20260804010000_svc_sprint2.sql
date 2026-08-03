-- SVC Sprint 2: what the member area and the monthly issue run need on
-- top of the Sprint 1 schema. Safe to run at any point after the Sprint 1
-- migration; contains no seed inserts, so re-running is harmless.

-- ---------------------------------------------------------------------------
-- Referral codes
-- ---------------------------------------------------------------------------

-- The short code a member shares. Generated on first request (server
-- side), stored once, never changed: a changed code kills every link the
-- member already posted.
alter table svc.member
  add column if not exists referral_code text unique;

comment on column svc.member.referral_code is
  'The member''s shareable referral code, e.g. svc.co.za/join?ref=CODE. Generated once server-side; never reissued.';

-- ---------------------------------------------------------------------------
-- Manual coupon import (handoff section 9's no-API path)
-- ---------------------------------------------------------------------------

-- One row per admin upload: which benefit, which month, and the note that
-- makes the audit trail readable a year later.
create table if not exists svc.coupon_file (
  id uuid primary key default gen_random_uuid(),
  benefit_id uuid not null references svc.benefit (id) on delete restrict,
  period date not null,
  note text,
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (benefit_id, period)
);

-- The codes inside an upload. A code is assigned to a benefit_issue row
-- when the issue run hands it to a member; unassigned rows are remaining
-- stock. Codes may also be absent entirely (a coupon pack whose codes are
-- shared or delivered inside the provider's own app), in which case the
-- issue run simply issues without a unique code.
create table if not exists svc.coupon_code (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references svc.coupon_file (id) on delete cascade,
  code text not null,
  benefit_issue_id uuid references svc.benefit_issue (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (file_id, code)
);

create index if not exists svc_coupon_code_unassigned_idx
  on svc.coupon_code (file_id) where benefit_issue_id is null;

-- ---------------------------------------------------------------------------
-- Grants and RLS for the new tables (same posture as everything else:
-- service_role only, no anon/authenticated policies)
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on svc.coupon_file to service_role;
grant select, insert, update, delete on svc.coupon_code to service_role;

alter table svc.coupon_file enable row level security;
alter table svc.coupon_code enable row level security;
