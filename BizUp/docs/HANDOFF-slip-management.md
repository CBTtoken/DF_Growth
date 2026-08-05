# HANDOFF: KATISOBIZ SLIP MANAGEMENT

**Agreed with Dewald, 5 August 2026, at the end of the walkthrough session.
This is the next KatisoBiz mission. Read `CLAUDE.md` section 0.0 before
touching anything, and the walkthrough findings in the session memory
(`project_bizup_invoicing.md`) for how the existing flows behave.**

---

## THE ONE-SENTENCE BRIEF

A member photographs an expense slip on their phone, KatisoBiz reads it,
they confirm the numbers and tap personal or business, and the business
ones travel with the accountant export — after which the image is deleted
to save space, with the member clearly told from day one that the paper
slip stays their responsibility.

## DEWALD'S OWN WORDS (5 Aug 2026, verbatim requirements)

- "what about expense slips, can we take photo's of those so it goes with
  to my accountant... OCR on slips that it takes a photo, scans it, OCR it
  into a spreadsheet or table, which I can review and allocated to
  personal or business and then it is packaged into my accountant export"
- "it should keep the picture of the slip as well"
- "the member should see a clear message, we do not take responsibility of
  the image of the slip and it should still be kept as per SARS
  requirement for proof if required, or something like that"
- "once a slip is packaged and export for the accountant we clean the db,
  meaning to conserve space we delete the slip, once it is exported"

## THE FLOW

1. **Capture.** A "Slips" surface in the KatisoBiz dashboard (likely a nav
   item beside Price list; check what the nav can carry on a phone before
   deciding). Big obvious button, `<input type="file" accept="image/*"
   capture="environment">` so a phone opens the camera directly. Compress
   client-side before upload; a slip photo does not need 4MB.
2. **OCR.** Claude vision reads the image into structured fields: slip
   date, supplier, description, total, VAT amount if shown. Model choice
   at build time (Haiku 4.5 first for cost; step up only if accuracy on
   real till slips demands it). **Mind the standing memory rule: strip
   markdown fences before JSON.parse on any LLM output.** OCR output is a
   SUGGESTION: the member always sees and can correct every field before
   anything is saved as fact. Never present unreviewed OCR as truth.
3. **Review and allocate.** A table of captured slips: date, supplier,
   amount, and one tap per slip for **Business / Personal**. Editing a
   field is inline. This screen must work one-handed in a queue, same
   standard as the walkthrough held the quote flow to.
4. **Export.** The existing "Export for my accountant" on Reports grows an
   expenses section: business slips for the period as CSV rows PLUS the
   slip images bundled in the download (zip). Personal slips never leave
   the member's own view.
5. **Purge after export.** Once a slip has gone out in an accountant
   export, its IMAGE is deleted from storage to conserve space. The data
   row stays (status `purged`), so totals and history keep working. The
   purge is disclosed up front, not discovered later.

## THE DISCLAIMER (shown at capture, in Dewald's intent, wording to polish)

> KatisoBiz reads your slip to save you typing, but the photo here is a
> working copy, not your tax record. SARS requires you to keep the
> original slip (paper or your own scan) for five years, and DigitalFlyer
> does not take responsibility for storing the image. Once a slip has been
> exported for your accountant, the photo is deleted from KatisoBiz to
> save space; the numbers stay.

Show it plainly on first use and keep it reachable; the export screen
repeats the purge consequence at the moment it applies.

## DATA SHAPE (suggested, verify against live schema before migrating)

`bizup_expense_slips`: id, account_id, storage_path (nullable — null once
purged), slip_date, supplier, description, amount_cents, vat_amount_cents,
allocation ('business' | 'personal' | null while unreviewed), status
('captured' | 'reviewed' | 'exported' | 'purged'), ocr_raw jsonb,
captured_at, exported_at, purged_at.

Storage: a **private** bucket (`bizup-slips`), member access through
signed URLs only. Slips are financial documents; nothing public. Remember
the estate rule proven four times and fixed wholesale on 5 Aug: every new
table gets the full service_role grant set in the same migration
(`20260805153000_bizup_grants_all.sql` covers existing bizup tables; a new
table needs its own grant).

## DECISIONS ALREADY MADE — DO NOT REOPEN

- Image IS kept until export, then deleted. Rows are kept forever.
- Member is told clearly the original slip is their SARS responsibility.
- Business/personal allocation is the member's tap, never inferred
  silently by the OCR.
- The export is the existing accountant export, extended — not a second
  export surface.

## DEWALD DECIDES

- Whether slips are part of the R49 plan, free, or something else.
- The final disclaimer wording (draft above is the shape he asked for).
- Retention window if he ever wants un-exported slips to expire too.

## OUT OF SCOPE

- Bank feed imports, mileage logs, recurring expenses.
- Any claim that KatisoBiz output satisfies SARS record-keeping on its
  own. It explicitly does not; that is the disclaimer's whole point.

## ACCEPTANCE CRITERIA

1. A member can photograph a slip on a phone and see it in their slips
   list within seconds, with OCR-suggested fields visible.
2. Every OCR field is editable before and after saving; nothing unreviewed
   is marked reviewed.
3. Allocation is one tap per slip, changeable until exported.
4. The disclaimer appears at first capture and the purge warning at
   export.
5. The accountant export includes business slips for the period as CSV
   plus images in one download, and personal slips never appear in it.
6. After export, the image is gone from storage, the row remains with
   status purged, and the slips list shows the slip without its photo,
   plainly marked.
7. A slip image is never publicly reachable; signed URLs only.
8. Everything else in KatisoBiz behaves exactly as before.
9. New table ships with full service_role grants in its own migration.
10. Test data created while building is deleted before reporting done
    (CLAUDE.md house rule; the walkthrough session's fixture pattern —
    disposable account, deleted wholesale after — worked well).

## OPEN THREADS THE NEXT SESSION INHERITS (not this mission, but live)

- **Shop Sprint 2 remainder:** Bob Go waybill-from-paid-order + tracking;
  Bob Pay sandbox e2e + refund await Dewald's Bob Pay credentials
  (application in progress).
- **Old Good:** flip `unlisted` when Dewald says so; link Jordan's account
  when he opens one; build the market-stall stock view then.
- Dewald's oldgood.co.za domain is live end to end; nothing pending.
- The estate memory files carry the full state; read them first.

## OPERATIONAL NOTES

- Build with `--webpack` on this machine (Turbopack blocked).
- Main deploys to production on push; verify live with strings a page
  actually renders.
- DDL runs live via the Supabase Management API with
  `SUPABASE_ACCESS_TOKEN` (POST /v1/projects/{ref}/database/query);
  verify columns exist before pushing dependent code.
- Multiple sessions run in parallel on this repo: add only your own
  paths, never `git add -A`.
