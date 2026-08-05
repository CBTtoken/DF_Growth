-- Slip management (BizUp/docs/HANDOFF-slip-management.md).
--
-- A member photographs an expense slip, KatisoBiz reads it with OCR, the
-- member confirms the numbers and taps business or personal, and business
-- slips travel with the accountant export. After that export the image is
-- deleted from storage to conserve space; the row stays forever so totals
-- and history keep working. That lifecycle is the status column.

create table if not exists public.bizup_expense_slips (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.bizup_accounts(id) on delete cascade,
  -- Null once purged. The photo is a working copy, never the tax record:
  -- the member keeps the original slip per SARS, and the disclaimer at
  -- capture says so.
  storage_path text,
  slip_date date,
  supplier text,
  description text,
  amount_cents integer not null default 0,
  -- Null when the slip shows no VAT, which is most till slips from
  -- non-vendors. Zero would wrongly claim the slip said R0.00 VAT.
  vat_amount_cents integer,
  -- Null until the member taps one. Never inferred by the OCR: the
  -- allocation is the member's decision, that is the whole feature.
  allocation text check (allocation in ('business', 'personal')),
  status text not null default 'captured'
    check (status in ('captured', 'reviewed', 'exported', 'purged')),
  -- What the OCR actually said, kept verbatim so a bad suggestion can be
  -- diagnosed later without the original image.
  ocr_raw jsonb,
  captured_at timestamptz not null default now(),
  exported_at timestamptz,
  purged_at timestamptz
);

create index if not exists bizup_expense_slips_account_idx
  on public.bizup_expense_slips (account_id, captured_at desc);
create index if not exists bizup_expense_slips_period_idx
  on public.bizup_expense_slips (account_id, slip_date);

-- Same posture as every other bizup_* table: RLS on, no anon or
-- authenticated policies, all access through Server Actions running as the
-- service role after an ownership check.
alter table public.bizup_expense_slips enable row level security;

-- The estate rule proven four times and fixed wholesale on 5 Aug: every
-- new table ships its full service_role grant set in its own migration.
grant select, insert, update, delete on public.bizup_expense_slips to service_role;

-- PRIVATE bucket, the opposite of bizup-logos. A slip is a financial
-- document; nothing about it is public. Members reach their own images
-- through short-lived signed URLs minted server-side, and there are no
-- storage.objects policies at all, so anon and authenticated cannot touch
-- the bucket directly.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bizup-slips',
  'bizup-slips',
  false,
  5242880, -- 5MB ceiling at the storage layer; the client compresses far below this
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
