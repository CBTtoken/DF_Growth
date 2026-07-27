# BizUp, Phase 1 Build Specification

**Module:** Quoting and invoicing for South African small and informal businesses
**Parent product:** DigitalFlyer Growth
**Domain:** bizup.digitalflyer.co.za (confirmed). Register bizup.co.za defensively if available and 301 redirect it to the subdomain. Brand equity builds under DigitalFlyer, deliberately.
**Status:** Approved by Dewald, 27 July 2026. All decisions closed. Ready for the coding session.
**Prepared:** 27 July 2026

> Style rules apply throughout: no em dashes anywhere in UI copy, emails, or PDFs. Correspondence voice is "DigitalFlyer SA", opening "Good day {name},". Call the platform a marketplace, never a directory.

---

## 1. What this is, in one paragraph

A mobile-first tool that lets a South African service business (plumber, electrician, mechanic, tree feller, handyman) create a quote in under sixty seconds on a phone, send it by WhatsApp, convert it to an invoice with one tap, and track who has paid. It handles VAT correctly and automatically based on whether the business is a registered VAT vendor, and it handles invoice corrections in a way that is legally clean without exposing the member to any accounting vocabulary.

It is deliberately **not** an accounting package. It produces documents and tracks payment status. It does not do bookkeeping, ledgers, payroll, or VAT returns. That boundary is a feature, not a limitation, and it must be defended against scope creep.

---

## 2. Commercial model

BizUp is deliberately positioned as the cheapest, easiest entry point into the DigitalFlyer world. The R49 is not the business model. The business model is that a plumber who opens BizUp three times a week eventually buys Growth, and that every document he sends drives another visitor to the domain. Build accordingly.

### The standalone ladder (this is what the pricing page shows)

| Plan | Price | Documents per month | What they get |
|---|---|---|---|
| BizUp Free | R0 | 10 | 1 template, no logo upload, basic status tracking, BizUp footer |
| BizUp | R49/month | 75 | All 5 templates, own logo, customer database, reports, BizUp footer |
| BizUp Unlimited | R89/month | Unlimited | Everything above, no cap. **Phase 2. Build the entitlement structure now, do not create the tier yet.** |

### Entitlements when bundled with Growth

| Growth tier | BizUp included | Upgrade available |
|---|---|---|
| Foundation | BizUp Free (10 documents) | Add BizUp for R49, or Unlimited for R89 |
| Growth Engine | BizUp (75 documents) | Add Unlimited for R40 more |
| Enterprise | BizUp (75 documents) | Add Unlimited for R40 more |

**A Foundation member who hits the cap must be able to buy the R49 add-on directly, without being forced to upgrade to Growth Engine.** Never block a customer trying to spend money. This also keeps Growth Engine sold on what it is actually for, the Meta tracking and managed campaigns, rather than on invoice volume.

### Why these specific numbers

Based on Dewald's direct knowledge of the market: **a typical member is doing around one job per working day**, roughly 22 jobs a month.

- **10 free documents** is enough for a genuine side-hustler doing a couple of jobs a week. Anyone trading properly converts to paid quickly, while the free tier still puts a meaningful number of footer-branded documents in front of other business owners. The free tier is acquisition spend, so err generous.
- **75 paid documents** sits comfortably above a typical member at roughly 44 documents a month. The members who breach it are doing forty-plus jobs a month, which is exactly the point at which R89 is affordable. **A cap should bind when the business is going well enough to pay for the upgrade, not before.**
- **R89 rather than R99** for unlimited. Zoho Books, the nearest credible competitor, sits at R99. Pricing at R89 keeps BizUp the cheapest option at every single tier, which is the whole DigitalFlyer position.

### The real driver is the quote-to-win ratio, not the job count

Watch this after launch. Document volume is driven less by jobs completed than by **how many quotes a member issues to win each job**. A member quoting twelve jobs to win six burns eighteen documents for six jobs of revenue.

This means a **bad** month can eat the cap faster than a good one, and that is the wrong member to squeeze. He is already struggling and is the most likely to churn. The R49 topup gives him a low-commitment way through it without signing up to a higher monthly subscription he cannot rely on affording.

### The footer stays on every tier

The small line **"Generated via BizUp, DigitalFlyer SA"** with a short link appears on paid documents as well as free ones. It is not a free-tier penalty, it is the acquisition engine. Every invoice a member sends is read by another business owner, which is exactly the audience DigitalFlyer wants. Keep it genuinely small and unobtrusive so no member feels the need to ask for it to be removed.

Differentiation between free and paid therefore rests on document volume, templates, logo, reports and the customer database, not on branding removal.

### Presentation warning

The entitlement matrix above is a four-by-three grid and it will confuse people on a phone. **Never publish it.** The BizUp pricing page shows only the three standalone plans, with a simple "included with DigitalFlyer Growth" badge on the paid plan. Entitlement resolution happens silently in the member's dashboard.

### Upgrade path
Standalone BizUp into a Growth tier must be one tap in the dashboard, with the R49 already paid that month credited against the Growth subscription.

---

## 3. Compliance rules the system must enforce

All verified against SARS as at July 2026.

### 3.1 VAT status drives everything

The single most important rule in the product. Driven by whether `bizup_accounts.vat_number` is present and validated.

**Not a VAT vendor (no VAT number on file):**
- Document is titled **"Invoice"**. Never "Tax Invoice".
- No VAT column, no VAT row, no VAT percentage shown anywhere.
- `vat_rate` stored as 0 on the document.
- Small footer line: "Not a VAT vendor. No VAT charged."
- All VAT UI is hidden, not disabled. The member should never see a greyed-out VAT field.

**VAT vendor (valid VAT number on file):**
- Document titled **"Tax Invoice"**.
- 15% VAT calculated and shown as a separate line.
- Supplier name, address and VAT number always printed.
- Quotes must lead with the VAT-inclusive total, because section 65 of the VAT Act requires quoted prices for taxable supplies to include VAT or show both figures.

### 3.2 The R5,000 threshold (VAT vendors only)

Based on the VAT-inclusive total of the document.

| Total incl. VAT | Requirement | UI behaviour |
|---|---|---|
| R50 or less | No formal tax invoice required | No special handling in Phase 1, still issue a normal document |
| R50 to R5,000 | Abridged tax invoice | Customer address and customer VAT number are optional |
| Over R5,000 | Full tax invoice | Customer legal name and physical address become **required**, customer VAT number prompted |

Implementation: when a VAT vendor's running total crosses R5,000 while building the document, show a non-blocking inline notice and auto-reveal the required customer fields. Block issue, not editing, if they are still empty.

Mandatory fields on a full tax invoice: the words "Tax Invoice", supplier name and address and VAT number, customer name and address and VAT number where the customer is a vendor, unique serial number, date of issue, accurate description of goods or services, quantity or volume, and the value of the supply plus the VAT amount plus the total.

### 3.3 The 21-day rule

A tax invoice must be issued within 21 days of the supply. Surface this as a gentle nudge on unissued drafts older than 14 days, not as a hard block. Same 21-day window applies to particulars corrections under section 20(1B).

### 3.4 VAT number validation

Format check only: 10 digits, beginning with 4. Do not claim to verify against SARS. On entry, show: "Please check this against your VAT 103 certificate from SARS."

When a member adds a VAT number for the first time, show a confirmation step: "From now on your invoices will include 15% VAT and will be titled Tax Invoice. Documents you have already issued will not change."

### 3.5 The turnover tracker (build this, it is a differentiator)

**Important distinction, do not merge these two concepts.** They are different periods and building them as one thing will produce wrong numbers.

**(a) The VAT threshold tracker** uses a **rolling twelve months**, meaning any consecutive twelve-month period, not the financial year. SARS tests it as a rolling window, so the tracker must recompute continuously rather than reset at year end.

A rolling twelve-month sum of issued invoice values per account, with two markers:

- Crossing **R120,000**: "You can now choose to register for VAT with SARS. This is optional."
- Crossing **R2.3 million**: "You must register for VAT with SARS within 21 business days."

Thresholds must be stored as configurable values in a settings table, not hardcoded, because SARS changes them.

**(b) The financial year** is a separate, member-defined setting used only for report periods ("this tax year", "last tax year").

- Captured at registration as `financial_year_end_month`, defaulting to **February**, which is correct for sole proprietors and most small businesses since the individual tax year ends on the last day of February.
- Editable at any time, because registered companies may choose a different year end.
- Changing it must not alter any historical document, only how reports are grouped.

Never use the financial year end to reset the VAT tracker.

### 3.6 Liability language

Every report and the terms of service must carry: BizUp helps you produce compliant documents but you remain responsible for your own tax affairs. Complex cases should go to a tax practitioner or SARS.

Never market this as "SARS compliant" or "guaranteed compliant". Use "SARS-ready documents".

---

## 4. Data model

All tables prefixed `bizup_`. All tables carry `account_id` and have RLS enabled keyed on the authenticated user, never on a client-supplied parameter.

### bizup_accounts (the tenant)
`id`, `growth_client_id` (nullable, links to an existing Growth member), `business_name`, `trading_name`, `registration_number`, `vat_number` (nullable), `vat_registered_from` (date), `address_line1/2/city/province/postal_code`, `email`, `phone`, `whatsapp`, `logo_url`, `template_id`, `plan` (free / paid / unlimited), `plan_source` (self_paid / bundled_foundation / bundled_growth / bundled_enterprise), `financial_year_end_month` (int, default 2 for February), `bank_notice_style` (none / no_change / phone_to_confirm, default `no_change`), `documents_used_this_month` (int, reset monthly), `topup_balance` (int, never reset), `created_at`

### bizup_bank_details
Separate table so it can be locked down independently.
`account_id`, `bank_name`, `account_holder`, `account_number_encrypted`, `branch_code`, `account_type` (cheque/savings), `last_confirmed_at`, `confirm_token`

### bizup_customers
`account_id`, `name`, `is_business` (bool), `registration_number`, `vat_number`, `email`, `phone`, `whatsapp`, `address_line1/2/city/province/postal_code`, `notes`, `created_at`

### bizup_catalogue_items
`account_id`, `type` (labour / part / product / travel / callout / other), `name`, `description`, `unit` (hour / day / each / km / callout / job), `unit_price_excl`, `default_markup_pct` (nullable), `tax_code` (standard / zero / exempt, default standard), `active`

### bizup_documents
`account_id`, `doc_type` (quote / invoice / credit_note), `number` (**NULL until issued**), `series`, `status`, `customer_id`, `customer_snapshot` (jsonb), `issuer_snapshot` (jsonb), `bank_snapshot` (jsonb, masked account number plus display string), `issue_date`, `due_date`, `valid_until` (quotes), `vat_rate` (stored on the document, not global), `subtotal_excl`, `vat_amount`, `total_incl`, `notes`, `terms`, `parent_document_id`, `superseded_by_id`, `correction_of_id`, `public_token`, `created_at`, `issued_at`, `sent_at`, `first_viewed_at`

### bizup_document_lines
`document_id`, `line_no`, `catalogue_item_id` (nullable), `description`, `quantity`, `unit`, `unit_price_excl`, `line_total_excl`, `tax_code`

### bizup_payments
`document_id`, `amount`, `paid_at`, `method` (eft / cash / card / other), `reference`, `note`

### bizup_number_counters
`account_id`, `series`, `year`, `next_value`. Increment must be atomic at the database level, not in application code.

### bizup_audit_log
Append-only. No UPDATE or DELETE granted to the API role.
`account_id`, `document_id`, `actor_user_id`, `action`, `from_status`, `to_status`, `reason`, `created_at`

### Two non-negotiable modelling rules

**1. Snapshot everything at issue.** `customer_snapshot`, `issuer_snapshot` and `bank_snapshot` freeze the member's and customer's details onto the document at the moment it is issued. If the member changes their business address in six months, historical invoices must not change. Getting this wrong is a legal problem, not a cosmetic one.

**2. Store `vat_rate` on the document.** Never read a global constant at render time. If the VAT rate ever changes, every historical document must still show the rate that applied on the day.

---

## 5. Numbering

- Format: `QUO-2026-0001`, `INV-2026-0001`, `CN-2026-0001`. Per account, per series, per year.
- **The number is assigned at the moment of Issue, never at draft creation.** This is what makes free editing of drafts safe and prevents gaps from abandoned drafts.
- Assignment happens inside a database transaction against `bizup_number_counters`.
- Once assigned, a number is never reused, never edited, and the document is never deleted.
- Credit notes take their own series but the same no-gap rule.

---

## 6. Document lifecycle

### Quote
`draft` → `sent` → `accepted` / `declined` / `expired` → `converted`

Drafts are fully editable and fully deletable. Once sent, edits create a new version of the quote (quotes are not financial records, so versioning is fine and does not need credit notes).

### Invoice
`draft` → `issued` → `partially_paid` → `paid`
Side branches from `issued`: `overdue` (automatic, past due date), `cancelled`, `credited`, `superseded`, `corrected`

### Credit note
`issued` only. Always linked to a parent invoice.

---

## 7. The "Fix this invoice" flow (the most important UX in the product)

One button on any issued invoice. One question. No accounting words.

**Question shown to member: "Does the amount need to change?"**

### Path A: No, just the details are wrong
Legal basis: section 20(1B) of the VAT Act, correction of particulars.

- Same invoice number. Same issue date. Same amounts.
- Editable: customer name, address, VAT number, line descriptions.
- **Not editable:** any quantity, price, or total.
- Original PDF retained. Corrected PDF generated. Both linked via `correction_of_id`.
- Reason field required, stored in the audit log.
- If more than 21 days have passed since issue, show a soft warning: "SARS asks for corrections to be made within 21 days. You can still correct this, but keep a note of why."
- Member-facing label: **"Correct the details"**.

### Path B: Yes, the customer is not paying at all
- Full credit note for the full invoice amount, issued automatically.
- Original invoice status becomes `cancelled`.
- Optionally offer to create a fresh invoice.
- Member-facing label: **"Cancel this invoice"**.

### Path C: Yes, the amount is different
- Full credit note for the full original amount.
- New invoice created, pre-filled with the original lines, opened as a draft for editing.
- Original status becomes `credited`, linked via `superseded_by_id`.
- Member-facing label: **"Replace with a corrected invoice"**.
- Copy shown after: "We cancelled the old invoice and created a new one for you. Both are saved for your records."

### Deliberate Phase 1 simplifications
- **No debit notes.** An increase in value is handled as a full credit plus a new invoice. Legally defensible and far simpler for a non-accountant.
- **No partial credit notes.** Full credit plus new invoice only.
- Both are Phase 2 candidates if real usage demands them.

### Absolute rules
- An issued document is never deleted, never renumbered, and its amounts are never overwritten.
- Drafts have no number and can be deleted freely.

### Exact screen copy (build this wording, do not improvise)

This flow is the highest-risk moment in the product. A member who has just realised they made a mistake on a document they already sent to a paying customer is stressed. Every word must reduce panic, not add vocabulary.

**Screen 1, after tapping "Fix this invoice" on INV-2026-0042:**

> **Let's fix invoice INV-2026-0042**
> First, one question.
>
> **Does the amount need to change?**
>
> [ No, the amount is right ]  →  Path A
> [ Yes, the amount is wrong ]  →  Screen 2
>
> *Small text: Don't worry, nothing has been sent to your customer yet.*

**Screen 2, only if they said the amount is wrong:**

> **What happened?**
>
> [ The customer is not paying this at all ]  →  Path B
> [ The amount should be different ]  →  Path C

**Path A confirmation screen:**

> **Correct the details**
> You can fix the name, address, VAT number or the wording of what you did. The invoice keeps the same number and date, which is what SARS expects.
>
> *What went wrong? (required)* [text field]
>
> [ Save corrected invoice ]

**Path B confirmation screen:**

> **Cancel invoice INV-2026-0042**
> We will create a credit note that cancels this invoice completely. Both documents stay in your records, which is what the law requires.
>
> *Why is it being cancelled? (required)* [text field]
>
> [ Cancel this invoice ]  [ Cancel this invoice and start a new one ]

**Path C confirmation screen:**

> **Replace invoice INV-2026-0042**
> We will cancel this invoice with a credit note, then open a new invoice with the same details for you to fix. Both stay in your records.
>
> *What needs to change? (required)* [text field]
>
> [ Create the new invoice ]

**Success screen for Path C:**

> **Done.**
> Invoice INV-2026-0042 has been cancelled with credit note CN-2026-0007.
> Your new invoice INV-2026-0051 is ready to review and send.
>
> [ Review and send ]

### Foolproofing requirements
- Every path is reversible up until the final button. Nothing is written until then.
- No path can be reached by accident. There is no inline edit pencil on an issued invoice anywhere in the UI.
- After any correction, the member's next screen must show clearly what the customer will now receive, and they must press Send themselves. The system never re-sends automatically.
- If the invoice has recorded payments against it, Paths B and C must warn first: "You have recorded R{amount} received against this invoice. Cancelling it will leave that payment unallocated. Continue?"

---

## 8. Security, POPIA, and data isolation

### Legal position
The member is the **responsible party** for their own customer data. DigitalFlyer is the **operator**. This requires an operator agreement clause in the BizUp terms of service, per POPIA sections 20 and 21.

**BizUp cannot launch on the existing DigitalFlyer terms and privacy policy.** Both need specific additions. This is a blocking item, not a nice-to-have, because BizUp stores third-party personal information (the member's customers) that DigitalFlyer has no direct relationship with.

**The terms of service must add:**
1. **Operator clause.** DigitalFlyer processes customer data only on the member's instruction, will not use it for any other purpose, will not sell or share it, and will secure it. Required by POPIA section 21, which also requires this to be in writing.
2. **Not tax advice.** BizUp is an assistive tool. The member remains responsible for their own tax affairs, for the accuracy of what they invoice, and for their own VAT registration status. Complex cases go to a tax practitioner or SARS.
3. **Accuracy of VAT status.** The member warrants that the VAT number they enter is real and current, and accepts that entering one causes the system to charge 15% VAT.
4. **Retention.** Financial records are kept for at least 5 years as required by SARS, and this survives cancellation of the subscription.
5. **Export on exit.** What the member gets and how long they have to collect it.
6. **Document delivery.** DigitalFlyer is not liable for a customer failing to receive or read a document, or for non-payment by the member's customers.
7. **Banking details.** The member is responsible for the accuracy of the banking details they enter. DigitalFlyer prints what it is given.

**The privacy policy must add:**
1. A plain statement that BizUp stores the member's customers' names and contact details, why, and that DigitalFlyer acts as operator rather than owner of that data.
2. What DigitalFlyer staff can and cannot see, stated accurately per the admin restrictions below.
3. The 5-year financial retention period and that it overrides the standard deletion timeline.
4. Sub-processors named: Supabase (hosting and database), Resend (email), Vercel (application hosting), and the PDF rendering service once chosen.
5. Information Officer details and how to lodge a complaint, including the Information Regulator.

**Recommendation:** have a South African attorney draft the operator clause and review the retention position once, rather than adapting a template. This is money, third-party personal data, and tax records in one product. It is the one place in the whole DigitalFlyer stack where a template is a false economy.

### Tenant isolation
- RLS enabled on every `bizup_` table.
- Policies derive `account_id` from `auth.uid()` via a join, never from a request parameter.
- Note the known Supabase gotcha already in the handoff: `.insert().select()` fails RLS unless the inserter can also SELECT the new row. Write policies accordingly.
- Note the known GoTrue bug: admin `/users?email=` returns all users. Always exact-match in code, never trust `users[0]`.

### Bank details
- `account_number_encrypted` encrypted at rest using the existing `APP_ENCRYPTION_KEY` pattern.
- Decrypted only inside the PDF render path. Never returned from any API route that the admin console can reach.
- Masked to last four digits in the member's own UI after first entry.
- Every decryption written to the audit log.
- Changing bank details requires an email confirmation click, to defend against account takeover leading to redirected payments.

### Admin access, structurally limited
Build a dedicated database view for the admin console that exposes **only**: account name, plan, subscription status, document counts, aggregate totals, and last activity date.

It must not expose customer names, customer contact details, line item descriptions, or any bank field. Enforce this at the view level so there is no screen that could later be built to show it by accident. Do not rely on hiding fields in the UI.

**Honest external claim:** "Your client list and banking details are encrypted, and our support team cannot see them." Do not claim zero-knowledge encryption, because the server must decrypt bank details to render a PDF.

### Retention, and a conflict to resolve
**This overrides an existing standing rule.** The current DigitalFlyer rule is that non-renewed or unsubscribed businesses are permanently deleted after 60 days for POPIA. That rule cannot apply to BizUp financial records.

- SARS requires invoices, credit notes and supporting records to be kept for **at least 5 years**.
- POPIA permits retention where another law requires it, so there is no conflict in law, only in your current internal policy.
- BizUp financial records get a documented 5-year retention exception.
- Personal marketing data (contact preferences, nudge history) still follows the 60-day rule.
- Any departing member must receive a full export (ZIP of PDFs plus a CSV of all documents) **before** anything is removed. This is both a POPIA data portability obligation and good practice.

### Invoice interception fraud (South Africa specific)
Altered banking details on emailed invoices are a known and litigated fraud pattern in South Africa, with courts having placed the loss on the payer in some circumstances.

Member-controlled setting, `bank_notice_style`, with three options. **Default is `no_change`.**

| Option | Text printed on the invoice |
|---|---|
| `no_change` **(default)** | "Our banking details never change. If you receive a message asking you to pay into a different account, please do not pay it and contact us." |
| `phone_to_confirm` | "Please phone us on {phone} to confirm these banking details before making payment." |
| `none` | Nothing printed |

**Why `no_change` is the default rather than the phone version:** it defeats the same fraud, because the whole attack depends on the customer accepting altered details, but it does not require the member to be reachable by phone. An informal trader under a sink cannot answer every call, and a notice that generates calls he cannot take is a notice he will switch off. This version works while he is unavailable, which is exactly when it needs to.

If a member selects `none`, show a one-time confirmation: "Invoice fraud is common in South Africa. Without this notice, a customer who receives a fake invoice using your business name may pay a criminal instead of you. Are you sure?" Log the choice. Do not nag again.

The same notice appears above the PDF on the public document link.

---

## 9. Mobile-first experience

**Target: a new quote created and sent in under 60 seconds, one-handed, on a mid-range Android phone.**

- Progressive Web App, installable to the home screen. Not a native app in Phase 1.
- Login: magic link for first login (reuse the existing auth), then a device PIN or biometric unlock for return visits. The PIN is a convenience layer over a stored session, not a second authentication factor, and that is fine and standard.
- Drafts must survive a lost connection. Persist in-progress documents locally and sync when signal returns. Full offline mode is Phase 2, but a tradesman in a basement losing a half-built quote is an instant uninstall.
- The quote creation screen: pick or type a customer, tap catalogue items as chips to add lines, adjust quantity with a stepper, see the running total pinned to the bottom with the VAT state clearly visible, preview, send.
- Every screen must work at 360px wide.

### Sending
- **WhatsApp: use a `wa.me` deep link in Phase 1.** The message opens in the member's own WhatsApp, from their own number, containing a short public link to the document. This costs nothing, requires no WhatsApp Business API approval, and is better UX because the customer gets it from a number they recognise. Do not build the Business API integration in Phase 1.
- **Email: via Resend.** From the DigitalFlyer sending domain, with the member's business name as the display name and reply-to set to the member's own email. **Dependency: the custom Resend sending domain is still pending DNS per the handoff. Confirm this is live before launch.**
- **Download: direct PDF.**

### Public document links
- Long unguessable `public_token`, no expiry (invoices must stay reachable), `noindex` header, and a "revoke this link" option in the member dashboard.
- The public page contains customer data and banking details, so it must never be indexable.

---

## 10. Templates

Five templates. **One data structure, five visual skins.** Every skin must render every mandatory field. No "minimal" template may drop the VAT number, the invoice number, or the supplier address.

Suggested range, aimed at trades rather than agencies:
1. **Clean** (default, plain and legible, works on a cheap printer)
2. **Bold** (strong colour band, logo prominent)
3. **Compact** (fits a long job on one page)
4. **Classic** (conservative, for members invoicing corporates or government)
5. **Trade** (space for a job reference, site address, and technician name)

Template choice is per account, changeable at any time, and applies to future documents only. Historical documents render with the template that was active when issued (store `template_id` on the document).

---

## 11. Catalogue and line items

Service businesses need three broad shapes, so the catalogue supports all of them:

- **Labour**: hourly rate, day rate, callout fee, per-job fixed price
- **Parts and products**: unit price, optional default markup percentage (a plumber buys a geyser at cost and bills at cost plus margin)
- **Travel**: per kilometre or fixed callout

Practical detail that determines whether the catalogue ever gets populated: **add a "Save this to my price list" button on any line typed manually inside a quote.** Nobody sits down and fills in a catalogue up front. They build it by accident while working, if you let them.

Members must always be able to type a free-text line without touching the catalogue. The catalogue is a shortcut, never a requirement.

---

## 12. Reports (Phase 1 only)

Six screens. Resist adding more.

1. **Quotes** for the period: number sent, number accepted, total value, win rate percentage
2. **Invoiced** for the period: total issued
3. **Money in**: received versus outstanding
4. **Aged debtors**: 0 to 30, 31 to 60, 61 to 90, over 90 days
5. **Pipeline**: open quotes not yet expired, at face value (no weighting, it will confuse people)
6. **VAT turnover tracker**: rolling 12-month taxable supplies against the R120,000 and R2.3 million markers

Every report exportable to CSV and PDF. Period selector: this month, last month, this tax year, custom.

---

## 13. Explicitly NOT in Phase 1

Listed so the coding session does not drift.

- The R99 Unlimited tier. Build the plan and entitlement structure so it can be switched on, but do not create the tier or its pricing page yet.
- Recurring or scheduled invoices
- Online payment collection on the invoice (strong Phase 1.5 candidate given Paystack is already in the stack, but it needs the Sprint 4 payments decision resolved first)
- Multi-user or multi-seat accounts
- Multi-currency. Everything is ZAR.
- Purchase orders, delivery notes, statements of account
- Expense tracking, bank feeds, reconciliation, any ledger
- VAT201 return preparation or SARS eFiling integration
- Debit notes and partial credit notes
- Full offline sync
- WhatsApp Business API
- Zero-rated and exempt supply handling (the `tax_code` field exists on lines but only `standard` is exposed in Phase 1)
- Inventory or stock levels

---

## 14. Open technical decisions for the coding session

1. **PDF rendering approach.** Headless Chrome on Vercel serverless is heavy and slow. A React-based PDF library or an HTML-to-PDF service is likely better. Needs a decision with a real cold-start and cost measurement, since PDF generation is the one operation that runs on every single document.
2. **Where BizUp lives in the codebase.** Same Next.js app under a route group with a separate domain mapping, or a separate deployment. Recommend the same app for shared auth and to avoid duplicating the Supabase and Resend wiring, with `bizup.digitalflyer.co.za` mapped as an additional domain in Vercel.
3. **Structured data format for the future e-invoicing mandate.** No action needed now, but keep invoice data in proper typed columns rather than text blobs so a Peppol or UBL export can be added later without a migration. SARS confirmed in February 2026 an intent to move to mandatory e-invoicing with phased rollout from 2026 to 2027 and full capability around 2028, targeting large VAT-registered vendors first. BizUp's users are mostly below the VAT threshold so this will not affect them for years, but the data shape decision is free today and expensive later.
4. **Atomic number allocation.** Confirm the counter increment is safe under concurrent issue requests. Two invoices with the same number is a legal problem, not a bug.

---

## 15. Suggested build order

1. Account setup, business profile, bank details (encrypted), VAT status logic
2. Customers
3. Catalogue
4. Quote creation, one template, PDF render, download
5. Numbering and the issue transaction
6. Quote to invoice conversion
7. WhatsApp and email sending
8. Payment recording and status tracking
9. The "Fix this invoice" flow, all three paths
10. Remaining four templates
11. Reports
12. Plan entitlements, document caps, footer branding, subscription and upgrade path
13. Admin console with the restricted view

### Document cap and entitlement rules
- Model **entitlement level** (`plan`) separately from **where it came from** (`plan_source`). A member on `paid` because Growth Engine bundles it and a member on `paid` because they pay R49 directly have identical capabilities but completely different billing consequences when a subscription lapses. Merging these two into one field will cause billing bugs.
- When a Growth subscription lapses, the BizUp entitlement drops to `free`. It does **not** delete anything. Documents over the cap stay visible and downloadable, the member simply cannot issue new ones until they resubscribe or pay R49.
- The cap counts **issued** documents only. Drafts are free and unlimited, so nobody is ever blocked mid-job by a cap.
- Credit notes generated by the correction flow do **not** count against the cap. A member must never be charged for fixing a mistake.
- **A permanently visible counter is the primary defence, not the warnings.** Show "48 of 75 used" on the dashboard at all times. The member should never be able to be surprised by the cap at any point in the month. Notifications are a backstop for people who open the app rarely.
- **Active warnings at 10 remaining, 3 remaining, and on the last available document.** On the free tier of 10, warn at 3 remaining and on the last one only. Do not nag beyond this.
- **Hard stop at the cap. No overage, no grace month.** An earlier draft of this spec proposed a one-time free grace month. That was rejected, correctly: it teaches the member the cap is not real, which undermines the upgrade the cap exists to drive.
- **The block happens at Send, never at Create.** This is the single most important rule in the cap logic. A member at zero remaining can still create, edit and save a draft. A tradesman standing in a customer's kitchen must always be able to build the quote in front of them. It simply cannot be sent until they upgrade or top up.
- On the blocked send screen, present upgrade and topup as one-tap Paystack purchases. Target under thirty seconds from block to sent document. Do not route the member away to a pricing page.

### Topup

Recognises that informal trade income is lumpy. A member who has one strong month is often unwilling to commit to a permanently higher subscription, because next month may be quiet, but will readily pay once for this month.

- **R49 buys 75 additional documents.** Same price and volume as the monthly paid tier.
- **Topup documents never expire and roll over indefinitely** as a credit balance. Marginal cost per document is effectively zero, so this costs nothing and removes the main hesitation at the point of purchase. State "never expires" prominently on the purchase button.
- Consumption order: monthly allowance first, then topup balance. Never burn purchased credit while free allowance remains.
- Store as `topup_balance` (int) on the account, plus a `bizup_topup_purchases` record for each purchase (amount, documents, paystack_reference, purchased_at) for audit and refunds.
- **After a second topup in a rolling 90 days, prompt honestly:** "You have topped up twice. Unlimited at R89 a month would cost you less." Recurring revenue beats one-off revenue, and the member who discovers this on their own instead will resent it.
- Topup is available on the free tier as well as the paid tier. Never block someone trying to spend money.
- The counter resets on the calendar month, not the member's billing date, because it is simpler to explain.
- A Foundation member hitting the free cap sees the R49 BizUp add-on as the primary call to action, with Growth Engine offered as a secondary option. Do not force the larger upgrade.

Get steps 1 to 7 in front of one real plumber before building steps 8 onwards. The catalogue and correction flow are the two places where an assumption about how tradesmen actually work will be wrong, and finding out early is worth more than shipping fast.

---

## 16. Decisions

### All confirmed by Dewald, 27 July 2026. No open items.

1. **R49 as a strategic entry price.** BizUp is a funnel into Growth, not a standalone revenue line. Optimise for adoption and for traffic to the domain, not for BizUp margin.
2. **BizUp Free at 10 documents per month.**
3. **Paid tier at 75 documents per month** for R49. Unlimited at R89 held for Phase 2. Numbers set against Dewald's market knowledge that a typical member does about one job per working day, so the cap binds only when the business can afford the upgrade.
4. **Foundation gets BizUp Free**, and can add the R49 tier à la carte without upgrading to Growth Engine. Growth Engine and Enterprise get the R49 tier included, with Unlimited available for R40 more.
5. **The footer stays on every tier**, small, reading "Generated via BizUp, DigitalFlyer SA".
6. **Domain stays `bizup.digitalflyer.co.za`.** Product suite builds brand under DigitalFlyer by design. `bizup.co.za` registered and redirected only if available.
7. **Encryption position accepted:** admins are structurally blocked, not mathematically blocked, with terms and privacy policy updated to match.
8. **Fraud notice is a member setting**, defaulting to the "our banking details never change" wording.
9. **Financial year end captured at registration**, defaulting to February, editable. Kept strictly separate from the rolling twelve-month VAT tracker.
10. **5-year retention exception accepted** for BizUp financial records.
11. **The entitlement matrix is never published.** Pricing page shows three standalone plans only.
12. **Hard cap, no overage.** Progressive warnings plus a permanently visible counter, with the block applied at Send rather than at Create so a draft can always be built on site.
13. **R49 topup for 75 extra documents**, rolling over and never expiring, available on every tier.

### Blocking before public launch, not before build
- Terms of service and privacy policy updated per section 8. Build can proceed in parallel, but nothing goes live to a real member without these.
- Resend custom sending domain DNS confirmed live.

### To review after 60 days of real usage
- **The quote-to-win ratio**, which is the true driver of document volume rather than the job count. Track average documents issued per member per month, split by whether they are winning or losing quotes. If members are burning the cap on unsuccessful quoting rather than on growth, the cap is in the wrong place.
- **Topup versus upgrade behaviour.** How many members top up, how often, and how many eventually move to a monthly plan. If a large group tops up repeatedly and never converts, either the R89 tier is priced wrong or the honest prompt is not working hard enough.
- **How many members hit the cap and then do nothing.** These are the silent churn risk. They did not upgrade, did not top up, and simply stopped sending documents.

### Blocking before public launch, not before build
- Terms of service and privacy policy updated per section 8. Build can proceed in parallel, but nothing goes live to a real member without these.
- Resend custom sending domain DNS confirmed live.
