-- Agent terms v2 (docs/agent-terms-and-faq-v2.md) changed the commercial
-- rules, not just the wording:
--
--   Clause 8: any YEARLY plan pays 25%, rising to 40% past ten yearly
--   members. The old Foundation 10% carve-out is gone.
--   Clause 9: any MONTHLY plan pays 10%, from the first cleared payment.
--   The old three month delay is gone.
--
-- commission_ledger.rate_applied was constrained to (25, 40), which was
-- correct when only Growth and Enterprise annual ever earned. A monthly
-- payment now writes 10, so the insert would fail the check constraint and
-- the commission would be silently lost while the published FAQ told the
-- agent they had earned it.
alter table public.commission_ledger drop constraint commission_ledger_rate_applied_check;

alter table public.commission_ledger
  add constraint commission_ledger_rate_applied_check check (rate_applied in (10, 25, 40));

-- No backfill. Every existing row is a Growth annual payment at 25 or 40,
-- which is still correct under v2, and rewriting historical ledger rows to
-- match a newer rule is exactly what an audit trail exists to prevent.
