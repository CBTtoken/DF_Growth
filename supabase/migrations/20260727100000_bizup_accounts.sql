-- BizUp Phase 1, build step 1 (BizUp/docs/bizup-phase1-spec.md Sec 15.1):
-- "Account setup, business profile, bank details (encrypted), VAT status
-- logic."
--
-- Follows this repo's established migration conventions: no DB-level
-- updated_at trigger (set manually in application code, matching every
-- other table here), RLS enabled on every table with per-operation
-- policies, explicit service_role grants at the end of each section.
--
-- Money is stored as integer cents throughout, matching bookable_units
-- and shop_products. The spec (Sec 4) does not specify a numeric type;
-- integer cents is the existing house convention and is also the correct
-- choice for tax documents, since it makes rounding explicit rather than
-- inherited from a float.

-- ============================================================
-- Settings (Sec 3.5: "Thresholds must be stored as configurable values in
-- a settings table, not hardcoded, because SARS changes them.")
-- ============================================================

-- Single row. The `singleton` primary key is a constant-true boolean, so a
-- second row is physically impossible rather than merely discouraged.
create table public.bizup_settings (
  singleton boolean primary key default true check (singleton),
  -- Sec 3.1. Stored here for the same reason as the thresholds below: the
  -- rate is set by the Minister of Finance and has been changed before.
  -- Every issued document also snapshots the rate that applied on the day
  -- (bizup_documents.vat_rate, next migration), so changing this value
  -- never rewrites history.
  vat_rate numeric(6,5) not null default 0.15,
  -- Sec 3.5(a). Rolling 12-month turnover markers.
  vat_voluntary_threshold_cents bigint not null default 12000000,   -- R120,000
  vat_compulsory_threshold_cents bigint not null default 230000000, -- R2.3m
  -- Sec 3.2. VAT-inclusive document total at which an abridged tax invoice
  -- is no longer sufficient and customer name + address become required.
  full_tax_invoice_threshold_cents bigint not null default 500000,  -- R5,000
  -- Sec 3.2. Below this, no formal tax invoice is required at all. Not
  -- acted on in Phase 1 (we still issue a normal document), stored so the
  -- rule is visible in one place rather than living only in prose.
  formal_invoice_minimum_cents bigint not null default 5000,        -- R50
  -- Sec 3.3 / Sec 7 Path A. Days from issue within which a tax invoice
  -- must be issued, and within which particulars may be corrected under
  -- section 20(1B).
  correction_window_days integer not null default 21,
  -- Sec 3.3: "a gentle nudge on unissued drafts older than 14 days."
  draft_nudge_days integer not null default 14,
  updated_at timestamptz not null default now()
);

insert into public.bizup_settings (singleton) values (true);

alter table public.bizup_settings enable row level security;

-- Readable by any signed-in member: these are published rules, not
-- secrets, and the quote builder needs them client-side to show the
-- R5,000 notice as the running total changes. No write policy at all --
-- changing a SARS threshold is a deliberate act, done by Dewald in the
-- SQL editor, never by the application.
create policy "signed-in members read bizup settings"
  on public.bizup_settings for select
  to authenticated
  using (true);

grant select, insert, update, delete on public.bizup_settings to service_role;

-- ============================================================
-- Accounts (the tenant, Sec 4)
-- ============================================================

create table public.bizup_accounts (
  id uuid primary key default gen_random_uuid(),

  -- The owner. Not in the spec's own column list, but required: Sec 4 says
  -- "RLS enabled keyed on the authenticated user", and growth_client_id is
  -- nullable (a standalone BizUp member has no Growth account at all), so
  -- it cannot serve as the ownership link. A direct column rather than a
  -- bizup_members join table because Sec 13 explicitly puts "multi-user or
  -- multi-seat accounts" out of Phase 1 -- if that changes, this becomes
  -- the join table's first row rather than a wasted column.
  owner_user_id uuid not null unique references auth.users (id) on delete restrict,

  -- Sec 4. Nullable: BizUp is sold standalone as well as bundled, and the
  -- standalone member is the whole point of the R49 entry price (Sec 2).
  -- A real FK is possible here only because BizUp lives in the same
  -- Supabase project as Growth (Sec 14.2); the earlier federated design
  -- could never have had one.
  growth_client_id uuid unique references public.growth_clients (id) on delete set null,

  business_name text not null,
  trading_name text,
  registration_number text,

  -- Sec 3.1: the single most important field in the product. Its presence
  -- decides "Invoice" vs "Tax Invoice", whether VAT is calculated at all,
  -- and whether any VAT UI renders. Format is validated in application
  -- code (10 digits starting with 4, Sec 3.4) rather than by a check
  -- constraint, so a member gets a helpful message instead of a database
  -- error.
  vat_number text,
  vat_registered_from date,

  address_line1 text,
  address_line2 text,
  city text,
  province text,
  postal_code text,

  email text not null,
  phone text,
  whatsapp text,

  logo_url text,
  -- Sec 10. Five skins over one data structure. 'clean' is the default
  -- because it is the one that survives a cheap printer.
  template_id text not null default 'clean'
    check (template_id in ('clean', 'bold', 'compact', 'classic', 'trade')),

  -- Sec 15: entitlement level and where it came from are modelled
  -- separately and deliberately. "A member on `paid` because Growth Engine
  -- bundles it and a member on `paid` because they pay R49 directly have
  -- identical capabilities but completely different billing consequences
  -- when a subscription lapses. Merging these two into one field will
  -- cause billing bugs."
  plan text not null default 'free'
    check (plan in ('free', 'paid', 'unlimited')),
  -- The bundled_* values match src/lib/paystack/plans.ts's Tier union
  -- exactly ('foundation' | 'growth_engine' | 'enterprise') so the mapping
  -- from a Growth tier to a BizUp entitlement is one to one. The spec
  -- writes the middle one as `bundled_growth`; using the real tier key
  -- avoids a second name for the same tier.
  plan_source text not null default 'self_paid'
    check (plan_source in ('self_paid', 'bundled_foundation', 'bundled_growth_engine', 'bundled_enterprise')),

  -- Sec 15 Topup. A credit balance in documents, not currency. Never
  -- reset, never expires (Sec 15: "State 'never expires' prominently").
  topup_balance integer not null default 0 check (topup_balance >= 0),

  -- Sec 3.5(b). Used only to group report periods, never to reset the
  -- rolling VAT tracker. February is correct for sole proprietors and most
  -- small businesses, since the individual tax year ends on the last day
  -- of February.
  financial_year_end_month integer not null default 2
    check (financial_year_end_month between 1 and 12),

  -- Sec 8, invoice interception fraud. Default is 'no_change' rather than
  -- 'phone_to_confirm' because it defeats the same fraud without requiring
  -- the member to be reachable by phone.
  bank_notice_style text not null default 'no_change'
    check (bank_notice_style in ('none', 'no_change', 'phone_to_confirm')),
  -- Sec 8: "If a member selects `none`, show a one-time confirmation ...
  -- Log the choice. Do not nag again." Non-null means the warning has been
  -- shown and accepted, so it is never shown a second time.
  bank_notice_none_ack_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Deliberately NOT stored: the spec's `documents_used_this_month` counter.
-- A stored integer reset by a monthly cron can double-reset, miss a month,
-- or drift after a failed run, and either wrongly blocks a paying member
-- or wrongly lets one through. Usage is derived instead, by counting
-- issued documents in the current calendar month (Sec 15: "The cap counts
-- issued documents only"), which is always correct, self-healing, and
-- needs no cron. topup_balance above stays a stored column because it
-- genuinely is a balance, not a derivable count.

create index bizup_accounts_growth_client_idx on public.bizup_accounts (growth_client_id)
  where growth_client_id is not null;

alter table public.bizup_accounts enable row level security;

-- Note the known Supabase behaviour flagged in Sec 8: `.insert().select()`
-- fails RLS unless the inserter can also SELECT the new row. The select
-- policy below matches on owner_user_id and the insert policy forces
-- owner_user_id to the caller, so a returning insert satisfies both.
create policy "members read own bizup account"
  on public.bizup_accounts for select
  to authenticated
  using (owner_user_id = auth.uid());

create policy "members create own bizup account"
  on public.bizup_accounts for insert
  to authenticated
  with check (owner_user_id = auth.uid());

create policy "members update own bizup account"
  on public.bizup_accounts for update
  to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

-- No delete policy. Sec 8 gives BizUp financial records a documented
-- 5-year retention exception that overrides the platform's standard
-- 60-day deletion rule, so an account is never removed by an ordinary
-- request. The `on delete restrict` on owner_user_id above enforces the
-- same thing from the auth side: deleting the Supabase auth user fails
-- while a BizUp account still exists, rather than silently taking five
-- years of tax records with it.

grant select, insert, update, delete on public.bizup_accounts to service_role;

-- ============================================================
-- Bank details (Sec 4 / Sec 8: "Separate table so it can be locked down
-- independently.")
-- ============================================================

create table public.bizup_bank_details (
  -- One row per account. Primary key rather than a plain FK: a member has
  -- one set of banking details, and a second row would mean an invoice
  -- could silently print the wrong account.
  account_id uuid primary key references public.bizup_accounts (id) on delete restrict,

  bank_name text not null,
  account_holder text not null,

  -- Sec 8: encrypted at rest with the existing APP_ENCRYPTION_KEY pattern
  -- (src/lib/crypto.ts, AES-256-GCM, iv:authTag:ciphertext hex). Decrypted
  -- only inside the PDF render path, never returned from any API route the
  -- admin console can reach, and every decryption written to
  -- bizup_audit_log.
  account_number_encrypted text not null,
  -- Stored separately so the member's own UI can show the masked form
  -- (Sec 8: "Masked to last four digits ... after first entry") without
  -- decrypting anything. Decryption should happen for exactly one reason,
  -- rendering a document, and this keeps the display path from becoming a
  -- second one.
  account_number_last4 text not null check (account_number_last4 ~ '^[0-9]{4}$'),

  branch_code text not null,
  account_type text not null check (account_type in ('cheque', 'savings')),

  -- Sec 8: "Changing bank details requires an email confirmation click, to
  -- defend against account takeover leading to redirected payments." The
  -- pending change sits here unconfirmed until the token is used.
  last_confirmed_at timestamptz,
  confirm_token text,
  confirm_token_expires_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bizup_bank_details enable row level security;

-- Sec 8: policies derive account_id from auth.uid() via a join, never from
-- a request parameter.
create policy "members read own bizup bank details"
  on public.bizup_bank_details for select
  to authenticated
  using (
    account_id in (select id from public.bizup_accounts where owner_user_id = auth.uid())
  );

create policy "members write own bizup bank details"
  on public.bizup_bank_details for insert
  to authenticated
  with check (
    account_id in (select id from public.bizup_accounts where owner_user_id = auth.uid())
  );

create policy "members update own bizup bank details"
  on public.bizup_bank_details for update
  to authenticated
  using (
    account_id in (select id from public.bizup_accounts where owner_user_id = auth.uid())
  )
  with check (
    account_id in (select id from public.bizup_accounts where owner_user_id = auth.uid())
  );

-- A select policy on this table exposes account_number_encrypted to the
-- member's own session. That is ciphertext without the server-side key, so
-- it is not a leak, but the application must still never select the column
-- into a client component -- account_number_last4 exists precisely so it
-- never needs to.

grant select, insert, update, delete on public.bizup_bank_details to service_role;

-- ============================================================
-- Audit log (Sec 4: "Append-only. No UPDATE or DELETE granted to the API
-- role.")
-- ============================================================

create table public.bizup_audit_log (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.bizup_accounts (id) on delete restrict,
  -- Plain uuid, no foreign key, and that is deliberate: an audit row must
  -- outlive whatever it describes, and bizup_documents does not exist
  -- until the next migration. Issued documents are never deleted anyway
  -- (Sec 7), so there is nothing for a FK to protect here.
  document_id uuid,
  actor_user_id uuid references auth.users (id) on delete set null,
  -- Free text rather than a check constraint. The set of auditable actions
  -- grows with every build step (bank_details_decrypted, invoice_issued,
  -- invoice_corrected, credit_note_issued, ...) and a constraint here
  -- would mean a migration for each one, which is how audit logging
  -- quietly stops being added to new code paths.
  action text not null,
  from_status text,
  to_status text,
  reason text,
  created_at timestamptz not null default now()
);

create index bizup_audit_log_account_idx on public.bizup_audit_log (account_id, created_at desc);
create index bizup_audit_log_document_idx on public.bizup_audit_log (document_id)
  where document_id is not null;

alter table public.bizup_audit_log enable row level security;

-- No policies at all for `authenticated`, which with RLS on means members
-- cannot read or write this table through the API under any circumstance.
-- Writes happen server-side through the service role only.

-- Intentionally NOT the usual "select, insert, update, delete" grant used
-- on every other table in this repo. Append-only is the whole point of an
-- audit log: if it can be edited by the same role that writes it, it
-- proves nothing. Do not "fix" this to match the other tables.
grant select, insert on public.bizup_audit_log to service_role;
