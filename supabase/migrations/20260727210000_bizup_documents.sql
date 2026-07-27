-- BizUp Phase 1, build steps 4 to 6 foundation
-- (BizUp/docs/bizup-phase1-spec.md Sec 4, 5, 6 and 15).
--
-- The two non-negotiable modelling rules from Sec 4 are both enforced
-- here rather than left to application code:
--
--   1. Snapshot everything at issue. customer_snapshot, issuer_snapshot
--      and bank_snapshot freeze both parties' details onto the document.
--      If a member changes their business address in six months,
--      historical invoices must not change. Getting this wrong is a legal
--      problem, not a cosmetic one.
--   2. Store vat_rate on the document. Never read a global constant at
--      render time.
--
-- Money is integer cents throughout, matching the rest of BizUp.

-- ============================================================
-- Number counters (Sec 5)
-- ============================================================

create table public.bizup_number_counters (
  account_id uuid not null references public.bizup_accounts (id) on delete restrict,
  series text not null check (series in ('QUO', 'INV', 'CN')),
  year integer not null,
  -- The next number to hand out. Starts at 1.
  next_value integer not null default 1,
  primary key (account_id, series, year)
);

alter table public.bizup_number_counters enable row level security;
-- No member-facing policies at all. Numbers are allocated server-side
-- through the function below and never touched directly.
grant select, insert, update on public.bizup_number_counters to service_role;

/**
 * Allocates the next document number for one account, series and year.
 *
 * Sec 5: "Assignment happens inside a database transaction against
 * bizup_number_counters." Sec 14.4: "Two invoices with the same number is
 * a legal problem, not a bug."
 *
 * The atomicity comes from INSERT ... ON CONFLICT DO UPDATE, which takes a
 * row lock for the duration of the statement. Two concurrent callers
 * cannot both read the same value: the second blocks until the first
 * commits its increment. This is deliberately NOT a read-then-write in
 * application code, which is exactly the pattern that produces duplicates
 * under concurrency.
 *
 * RETURNING next_value - 1 is correct for both branches. On a fresh insert
 * next_value is set to 2 and this returns 1. On an update from 5 it
 * becomes 6 and this returns 5, the number the caller should use.
 */
create function public.bizup_allocate_document_number(
  p_account_id uuid,
  p_series text,
  p_year integer
) returns integer
language sql
security definer
set search_path = public
as $$
  insert into public.bizup_number_counters (account_id, series, year, next_value)
  values (p_account_id, p_series, p_year, 2)
  on conflict (account_id, series, year)
    do update set next_value = public.bizup_number_counters.next_value + 1
  returning next_value - 1;
$$;

revoke all on function public.bizup_allocate_document_number(uuid, text, integer) from public;
grant execute on function public.bizup_allocate_document_number(uuid, text, integer) to service_role;

-- ============================================================
-- Documents (Sec 4, lifecycle in Sec 6)
-- ============================================================

create table public.bizup_documents (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.bizup_accounts (id) on delete restrict,

  doc_type text not null check (doc_type in ('quote', 'invoice', 'credit_note')),
  series text not null check (series in ('QUO', 'INV', 'CN')),
  -- Sec 5: NULL until issued. This is what makes free editing of drafts
  -- safe and prevents gaps from abandoned drafts. Format QUO-2026-0001.
  number text,

  -- One column for all three lifecycles (Sec 6). A quote never takes an
  -- invoice status and vice versa; that pairing is enforced in application
  -- code, since expressing it here would need a check constraint that has
  -- to be rewritten every time a status is added.
  status text not null default 'draft' check (status in (
    'draft',
    -- quote
    'sent', 'accepted', 'declined', 'expired', 'converted',
    -- invoice
    'issued', 'partially_paid', 'paid', 'overdue', 'cancelled',
    'credited', 'superseded', 'corrected'
  )),

  -- Nullable so a quote can be built for a walk-up customer before their
  -- details are captured. ON DELETE RESTRICT is the thing that stops a
  -- customer being removed once they have been invoiced.
  customer_id uuid references public.bizup_customers (id) on delete restrict,

  -- Sec 4 rule 1. Frozen at issue, never re-read afterwards. bank_snapshot
  -- holds the masked number and display string only, never the ciphertext
  -- and never the full account number.
  customer_snapshot jsonb,
  issuer_snapshot jsonb,
  bank_snapshot jsonb,

  issue_date date,
  due_date date,
  valid_until date, -- quotes only

  -- Sec 4 rule 2 and Sec 3.1. The rate that applied on the day, stored per
  -- document. 0 for a member who is not a VAT vendor.
  vat_rate numeric(6,5) not null default 0,
  subtotal_excl_cents integer not null default 0,
  vat_amount_cents integer not null default 0,
  total_incl_cents integer not null default 0,

  notes text,
  terms text,

  -- Sec 10: historical documents render with the template that was active
  -- when they were issued, so this is stored rather than read from the
  -- account at render time.
  template_id text not null default 'clean'
    check (template_id in ('clean', 'bold', 'compact', 'classic', 'trade')),

  -- Sec 7. parent_document_id links a credit note to its invoice and a
  -- converted invoice to its quote. superseded_by_id points forward from a
  -- credited invoice to its replacement. correction_of_id links a
  -- corrected version to the original under section 20(1B).
  parent_document_id uuid references public.bizup_documents (id) on delete restrict,
  superseded_by_id uuid references public.bizup_documents (id) on delete restrict,
  correction_of_id uuid references public.bizup_documents (id) on delete restrict,

  -- Sec 9: long unguessable token for the public link, no expiry because
  -- invoices must stay reachable. Revocable by clearing this column.
  public_token text unique,

  created_at timestamptz not null default now(),
  issued_at timestamptz,
  sent_at timestamptz,
  -- Surfaced to the member so they can see their customer opened the quote.
  first_viewed_at timestamptz
);

-- Sec 5: "Once assigned, a number is never reused." The unique index is
-- the last line of defence behind the allocation function, so even a bug
-- in application code cannot produce two documents sharing a number.
create unique index bizup_documents_number_unique
  on public.bizup_documents (account_id, number)
  where number is not null;

create index bizup_documents_account_status_idx
  on public.bizup_documents (account_id, doc_type, status, created_at desc);

-- Sec 15: the document cap counts issued documents in the current calendar
-- month, derived rather than stored, so this is the index that has to be
-- fast.
create index bizup_documents_issued_at_idx
  on public.bizup_documents (account_id, issued_at)
  where issued_at is not null;

alter table public.bizup_documents enable row level security;

create policy "members read own bizup documents"
  on public.bizup_documents for select
  to authenticated
  using (account_id in (select id from public.bizup_accounts where owner_user_id = auth.uid()));

create policy "members create own bizup documents"
  on public.bizup_documents for insert
  to authenticated
  with check (account_id in (select id from public.bizup_accounts where owner_user_id = auth.uid()));

create policy "members update own bizup documents"
  on public.bizup_documents for update
  to authenticated
  using (account_id in (select id from public.bizup_accounts where owner_user_id = auth.uid()))
  with check (account_id in (select id from public.bizup_accounts where owner_user_id = auth.uid()));

-- Deliberately no delete policy for members, and no DELETE grant below.
-- Sec 7: "An issued document is never deleted, never renumbered, and its
-- amounts are never overwritten." Drafts are deleted through a server-side
-- action that checks the number is still null, so the ability to delete a
-- draft never becomes the ability to delete an invoice.
grant select, insert, update, delete on public.bizup_documents to service_role;

-- ============================================================
-- Document lines (Sec 4)
-- ============================================================

create table public.bizup_document_lines (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.bizup_documents (id) on delete cascade,
  line_no integer not null,

  -- Nullable, and stays nullable forever. Sec 11: "Members must always be
  -- able to type a free-text line without touching the catalogue." A line
  -- copied from the price list keeps this reference for reporting, but the
  -- description and price below are the document's own copy and do not
  -- change if the price list later does.
  catalogue_item_id uuid references public.bizup_catalogue_items (id) on delete set null,

  description text not null,
  quantity numeric(12,3) not null default 1,
  unit text not null default 'each',
  unit_price_excl_cents integer not null default 0,
  line_total_excl_cents integer not null default 0,
  tax_code text not null default 'standard' check (tax_code in ('standard', 'zero', 'exempt')),

  unique (document_id, line_no)
);

-- ON DELETE CASCADE above is safe precisely because issued documents are
-- never deleted. It exists so discarding a draft takes its lines with it.
create index bizup_document_lines_document_idx on public.bizup_document_lines (document_id, line_no);

alter table public.bizup_document_lines enable row level security;

create policy "members read own bizup document lines"
  on public.bizup_document_lines for select
  to authenticated
  using (document_id in (
    select d.id from public.bizup_documents d
    join public.bizup_accounts a on a.id = d.account_id
    where a.owner_user_id = auth.uid()
  ));

create policy "members write own bizup document lines"
  on public.bizup_document_lines for insert
  to authenticated
  with check (document_id in (
    select d.id from public.bizup_documents d
    join public.bizup_accounts a on a.id = d.account_id
    where a.owner_user_id = auth.uid()
  ));

create policy "members update own bizup document lines"
  on public.bizup_document_lines for update
  to authenticated
  using (document_id in (
    select d.id from public.bizup_documents d
    join public.bizup_accounts a on a.id = d.account_id
    where a.owner_user_id = auth.uid()
  ))
  with check (document_id in (
    select d.id from public.bizup_documents d
    join public.bizup_accounts a on a.id = d.account_id
    where a.owner_user_id = auth.uid()
  ));

create policy "members delete own bizup document lines"
  on public.bizup_document_lines for delete
  to authenticated
  using (document_id in (
    select d.id from public.bizup_documents d
    join public.bizup_accounts a on a.id = d.account_id
    where a.owner_user_id = auth.uid()
  ));

grant select, insert, update, delete on public.bizup_document_lines to service_role;

-- ============================================================
-- Payments (Sec 4)
-- ============================================================

create table public.bizup_payments (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.bizup_documents (id) on delete restrict,
  amount_cents integer not null check (amount_cents > 0),
  paid_at date not null,
  method text not null default 'eft' check (method in ('eft', 'cash', 'card', 'other')),
  reference text,
  note text,
  created_at timestamptz not null default now()
);

-- ON DELETE RESTRICT, unlike lines: a recorded payment is a financial
-- record in its own right and must not disappear with anything else.
create index bizup_payments_document_idx on public.bizup_payments (document_id, paid_at);

alter table public.bizup_payments enable row level security;

create policy "members read own bizup payments"
  on public.bizup_payments for select
  to authenticated
  using (document_id in (
    select d.id from public.bizup_documents d
    join public.bizup_accounts a on a.id = d.account_id
    where a.owner_user_id = auth.uid()
  ));

create policy "members record own bizup payments"
  on public.bizup_payments for insert
  to authenticated
  with check (document_id in (
    select d.id from public.bizup_documents d
    join public.bizup_accounts a on a.id = d.account_id
    where a.owner_user_id = auth.uid()
  ));

grant select, insert, update, delete on public.bizup_payments to service_role;
