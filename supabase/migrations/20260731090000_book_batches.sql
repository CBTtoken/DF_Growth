-- Batches become real things, with dates.
--
-- Until now a batch was just an integer written on each order. Dewald,
-- 31 July, on the first real paid order: "there is no set date yet, only
-- once we send it to the printer can we set an expected delivery date?
-- Should we add a 3rd trigger, Sent for Printing?"
--
-- He is right, and the reason is sharper than adding a status. A batch
-- number tells a buyer nothing. "You are in batch 1" could mean tomorrow or
-- six weeks. What they want is a date, and a date only becomes honest once
-- the batch has actually gone to the printer.
--
-- The dates live on the batch rather than on each order, so setting one
-- date updates everybody in that batch. Putting them on the order would
-- mean fifty rows to keep in step and fifty chances to disagree.
--
-- Scoped to growth_client_id from the start. This is Standing 365's today,
-- but the whole point of the exercise is that the next member selling
-- something physical inherits it rather than getting nothing.

create table if not exists public.book_batches (
  id uuid primary key default gen_random_uuid(),
  growth_client_id uuid not null references public.growth_clients (id) on delete cascade,

  -- The number the seller and buyer both talk about. Unique per seller, not
  -- globally: two members should each be able to have a batch 1.
  number integer not null check (number >= 1),

  -- Null until it actually goes to the printer, which is the event that
  -- makes any promised date meaningful.
  sent_to_printer_at timestamptz,

  -- What the buyer is told. Deliberately a date and not a timestamp: a
  -- promise accurate to the minute would be a lie.
  expected_delivery_date date,

  -- The seller's own note, never shown to a buyer. Printer reference,
  -- courier waybill, whatever they need to find it again.
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (growth_client_id, number)
);

comment on table public.book_batches is
  'A print run. Orders point at one by number. Holds the dates a buyer is told about, so one update covers everyone in the run.';

create index if not exists book_batches_client_idx
  on public.book_batches (growth_client_id, number desc);

alter table public.book_batches enable row level security;

-- No policies, matching every other seller-owned table here: the dashboard
-- reads and writes through the service role after checking ownership in the
-- action itself. A policy would imply members query this directly, and they
-- do not.
grant select, insert, update on public.book_batches to service_role;

-- Existing orders already carry a batch_number written before batches
-- existed. Backfilled so nothing is orphaned and the seller sees the same
-- numbers they have been using.
insert into public.book_batches (growth_client_id, number)
select distinct growth_client_id, batch_number
from public.book_orders
where batch_number is not null
on conflict (growth_client_id, number) do nothing;
