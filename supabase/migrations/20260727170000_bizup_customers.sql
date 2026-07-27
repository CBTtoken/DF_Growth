-- BizUp Phase 1, build step 2 (BizUp/docs/bizup-phase1-spec.md Sec 15.2:
-- "Customers", data model in Sec 4).
--
-- Conventions match the rest of this repo: no DB-level updated_at trigger
-- (set in application code), RLS on with per-operation policies, explicit
-- service_role grants at the end.

create table public.bizup_customers (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.bizup_accounts (id) on delete restrict,

  name text not null,
  -- Sec 4. Decides whether the registration and VAT number fields are
  -- worth showing at all. A private homeowner has neither, and asking a
  -- plumber for his customer's company registration number when the
  -- customer is a person is exactly the friction Sec 9's sixty-second
  -- target cannot afford.
  is_business boolean not null default false,
  registration_number text,
  -- Sec 3.2: prompted, not required, and only when the customer is a
  -- business and the document is over R5,000.
  vat_number text,

  email text,
  phone text,
  -- Sec 9: quotes and invoices are sent by wa.me deep link, so this is
  -- the field that actually gets used for delivery most of the time.
  whatsapp text,

  -- Sec 3.2: a full tax invoice (over R5,000) requires the customer's
  -- legal name and physical address. Captured here so it is already on
  -- file rather than being asked for mid-invoice with a customer waiting.
  address_line1 text,
  address_line2 text,
  city text,
  province text,
  postal_code text,

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Every customer query is scoped to one account and ordered or filtered by
-- name. At the volumes involved (a tradesman with hundreds of customers,
-- not millions) this is enough, and a trigram index would be premature.
create index bizup_customers_account_name_idx on public.bizup_customers (account_id, name);

alter table public.bizup_customers enable row level security;

-- Sec 8: policies derive account_id from auth.uid() via a join, never from
-- a request parameter. The select policy also covers the RETURNING clause
-- of an insert, which otherwise fails RLS on this Supabase project.
create policy "members read own bizup customers"
  on public.bizup_customers for select
  to authenticated
  using (account_id in (select id from public.bizup_accounts where owner_user_id = auth.uid()));

create policy "members create own bizup customers"
  on public.bizup_customers for insert
  to authenticated
  with check (account_id in (select id from public.bizup_accounts where owner_user_id = auth.uid()));

create policy "members update own bizup customers"
  on public.bizup_customers for update
  to authenticated
  using (account_id in (select id from public.bizup_accounts where owner_user_id = auth.uid()))
  with check (account_id in (select id from public.bizup_accounts where owner_user_id = auth.uid()));

create policy "members delete own bizup customers"
  on public.bizup_customers for delete
  to authenticated
  using (account_id in (select id from public.bizup_accounts where owner_user_id = auth.uid()));

-- Deletion is allowed here, unlike documents. A customer record is not a
-- financial record, and a member who typed a name wrong must be able to
-- clear it up.
--
-- It stops being freely deletable the moment documents exist:
-- bizup_documents.customer_id will reference this table with ON DELETE
-- RESTRICT, so Postgres itself will block removing a customer who has been
-- invoiced. That matters for two reasons beyond tidiness. Sec 12's client
-- statements are per customer and would lose their subject, and Sec 8's
-- 5-year retention applies to the financial record the customer is named
-- in. The application handles that rejection with a plain-language message
-- rather than letting a database error surface.
grant select, insert, update, delete on public.bizup_customers to service_role;
