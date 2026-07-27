-- BizUp Sec 7, the "Fix this invoice" flow.
--
-- Path A is a correction of particulars under section 20(1B) of the VAT
-- Act. The spec is explicit that it keeps the **same invoice number**, the
-- same issue date and the same amounts, and that both the original and the
-- corrected version are retained and linked by correction_of_id.
--
-- That collides with the unique index created in
-- 20260727210000_bizup_documents.sql, which allows one document per number
-- per account. Two rows sharing a number is exactly what a correction is.
--
-- The fix is to keep the guarantee where it matters and scope it out where
-- it does not. Two *independent* documents still cannot share a number,
-- which is the legal requirement. A correction is not an independent
-- document: it is a restatement of one that already exists, it carries a
-- pointer back to what it corrects, and the pair is meaningless apart.
--
-- Retaining "the original PDF" is satisfied in substance and arguably
-- better than storing a file. Both rows keep their own frozen snapshots,
-- so either version re-renders byte-for-byte on demand, and neither can be
-- edited afterwards. A stored PDF could be replaced; an append-only row
-- with its own snapshot cannot.

drop index if exists public.bizup_documents_number_unique;

create unique index bizup_documents_number_unique
  on public.bizup_documents (account_id, number)
  where number is not null and correction_of_id is null;

-- The correction chain is walked in both directions: from an original to
-- find its corrections, and from a correction back to its original.
create index bizup_documents_correction_of_idx
  on public.bizup_documents (correction_of_id)
  where correction_of_id is not null;
