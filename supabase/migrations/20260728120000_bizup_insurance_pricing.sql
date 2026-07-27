-- Insurance versus private pricing, and deposits received before invoicing.
--
-- Both come from a real plumber testing the product. Plumbers and
-- electricians quote insurance work at a different rate to their own
-- private jobs, and they routinely take cash or an EFT before the invoice
-- is written.
--
-- The rate is chosen on the document, not on the customer. The same
-- customer can be an insurance job one week and a private job the next, so
-- storing it against the customer would guess wrong regularly and quietly
-- put the wrong prices on a quote.

-- ============================================================
-- The switch
-- ============================================================

-- Off by default, and every part of the interface stays hidden while it is
-- off. Painters, tilers and gardeners have one price list and must not have
-- to look at a second price column that means nothing to them.
alter table public.bizup_accounts
  add column if not exists insurance_pricing_enabled boolean not null default false;

-- ============================================================
-- The second price
-- ============================================================

-- Nullable on purpose. Null means "no separate insurance price for this
-- item", and the private price is used for both. That is the safe default:
-- turning the feature on must never zero out a price or put a blank on a
-- customer's quote. A member fills in only the items that actually differ.
alter table public.bizup_catalogue_items
  add column if not exists insurance_price_excl_cents integer
    check (insurance_price_excl_cents is null or insurance_price_excl_cents >= 0);

-- ============================================================
-- The rate stamped on the document
-- ============================================================

-- Recorded on the document rather than worked out at render time, for the
-- same reason vat_rate is snapshotted: a document issued last March must
-- still show what it showed last March, whatever has happened to the price
-- list since.
alter table public.bizup_documents
  add column if not exists rate_type text not null default 'private'
    check (rate_type in ('private', 'insurance'));

comment on column public.bizup_documents.rate_type is
  'Which price list the lines were filled from. Snapshotted at line-add time; changing it re-prices the lines while the document is still a draft, and is refused once it is issued.';
