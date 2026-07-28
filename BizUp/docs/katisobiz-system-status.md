# KatisoBiz: System Status

**Prepared 29 July 2026.** Written for a business update, so it says what exists, how it works, and what does not exist yet. Every figure was read from the live database on the date above, not estimated.

---

## 1. What KatisoBiz is

Mobile-first quoting and invoicing for South African tradesmen and one-person businesses. A plumber standing in a customer's kitchen builds a quote on his phone in under a minute, sends it on WhatsApp from his own number, turns it into an invoice when the job is done, and gets paid.

It is a module inside the existing DigitalFlyer Growth application: same codebase, same database, same login, its own domain.

**Live at katisobiz.co.za.** Also answers on www.katisobiz.co.za, katisobiz.digitalflyer.co.za and the older bizup.digitalflyer.co.za, so nothing already sent to a customer breaks.

**Commercially, it is a funnel into Growth, not a revenue line of its own.** Free tier proves the product, R49 makes a solo operator better, R89 handles a small team. A member who starts getting calls from their free listing is the easiest conversation about a Growth page there is.

---

## 2. Where it stands today

| | |
|---|---|
| Members | 6 |
| Paying members | 2 |
| Members who have issued a document | 5 |
| Documents issued | 11 |
| Payments recorded | 5, totalling R20,775 |
| Subscription revenue collected | R49 |
| Customers captured | 5 |
| Saved prices | 7 |

These are test and pilot accounts. The product has been run end to end by the product owner, including the correction flow, and one real R49 subscription has been paid and correctly credited.

---

## 3. What a member can do

### Quotes and invoices
- Build a quote from a saved price list or by typing one-off lines
- Search the price list by name rather than scrolling it
- Add a customer mid-quote without losing the quote
- Issue a quote, which allocates its number and locks the amounts
- Send on WhatsApp from the member's own number, or by email, or as a link
- See when the customer opened it
- Convert an accepted quote into an invoice with nothing retyped
- Raise an invoice directly when a job was never quoted

### Getting paid
- Banking details print on every invoice, with the invoice number as the payment reference
- Record full or part payments, with method and statement reference
- Record a deposit taken **before** the invoice was written, shown as a deduction with the balance due
- Chase overdue invoices: the dashboard lists them worst first with a prepared WhatsApp message

### Fixing mistakes
- "Fix this invoice" handles all three cases correctly: a detail-only correction keeping the same number and date, a full credit note and cancellation, or a credit note and a replacement
- Issued documents are never silently altered; both versions are kept

### VAT
- A member with no VAT number never sees VAT anywhere
- Adding a VAT number switches every future document to a proper Tax Invoice with 15% worked out
- Over R5,000, SARS requires the customer's full details, and the product asks at that moment and blocks issuing until it has them
- A rolling twelve-month turnover tracker against the R120,000 and R2.3 million thresholds

### Reports
Six on one screen, for any period: quotes sent and won with a win rate, invoiced totals, money received against money outstanding, aged debtors in 30-day bands, open quotes at face value, and the VAT turnover tracker. Every figure opens the documents behind it. Plus per-customer statements and a CSV export.

### The accountant export
One button produces a link containing every invoice, credit note and payment as spreadsheets, every PDF, and a cover sheet with the totals. Delivered as an expiring link rather than an attachment because it contains third-party personal information. The cover sheet carries a discreet KatisoBiz line, which makes it a referral channel into accountants.

### Presentation
Five document templates, the member's own logo on paid plans, and a fraud notice on banking details.

### Getting found
An opt-in listing on the KatisoBiz Members List at digitalflyer's Growth site: business name, trade, town, WhatsApp button. Taps are counted.

---

## 4. How it works, in the parts that matter

**Documents are immutable once issued.** At the moment of issue, the supplier's details, the customer's details and the banking details are copied onto the document as snapshots. Nothing re-reads the live account afterwards. A member who changes their address next year does not retrospectively alter last year's invoices.

**Numbering is atomic.** Numbers come from a database function that row-locks, verified with 40 concurrent allocations producing 1 to 40 with no gaps and no duplicates. Gaps in an invoice sequence are a SARS problem, so this is not left to application code.

**Money is integer cents throughout**, and VAT is calculated once on the subtotal rather than summed per line, so rounding cannot drift.

**Every figure comes from one module.** The reports screen, the CSV, and the accountant pack all call the same functions. An accountant finding two different totals for one month is the fastest way to lose trust in the whole product.

**Nothing messages a customer on its own.** Quotes, invoices and payment reminders all open WhatsApp on the member's phone with the message written; the member presses send. A tool that messages your customers for you is a trust problem in this market.

**Payments are idempotent.** Paystack redelivers webhooks, so crediting is keyed on Paystack's own transaction reference with a unique constraint. Verified: a redelivered topup credits once, a genuinely second topup credits again.

**Banking details are encrypted at rest**, decrypted only to print on a document, and changing them requires a code emailed to the member. That last part exists because an attacker who takes over an account changes the banking details, and a clicked-link confirmation can be consumed by a mail scanner before the owner sees it.

---

## 5. Commercial mechanics

| Plan | Price | What it gives |
|---|---|---|
| Free | R0 forever | 10 documents a month, 1 template, WhatsApp sending, VAT handling, credit notes |
| KatisoBiz | R49/month | 75 documents, all 5 templates, own logo, reports, statements, accountant export |
| Unlimited | R89/month | Unlimited documents |
| Topup | R49 once | 75 more documents, never expire |

Included at no extra cost with Growth Engine and Enterprise. A bundled member is shown that it is already included and is offered nothing to buy, so they cannot be charged twice.

Payment runs through Paystack. Upgrading and topping up both work and have been paid for with a real card.

**Deliberately refused, not deferred:** expense tracking, bank reconciliation, financial statements, any general ledger. The moment a member needs books they need an accountant, and this product's job is to hand that accountant clean data. That boundary is what keeps it light against payPod at R159 and Sage at R240.

---

## 6. What is not built

Stated plainly so nobody promises it.

- **Multi-user accounts.** Sprint 2. Every account is one user today, enforced in code.
- **Recurring invoices.** Sprint 2.
- **Transactional emails to members.** Nothing emails a member when a quote is opened or accepted.
- **Online card payment on an invoice.** A customer pays by EFT, not by clicking the invoice.
- **The /terms and /privacy restructure.** The PAIA manual and the legal disclosure block are published; the two main policy pages are still in their old shape.
- **DigitalFlyer's own financial reporting.** Requested, agreed as not a priority.

---

## 7. Open items

**Needs a decision:** seven documents were issued before a defect was fixed and carry a masked account number, so a customer holding one cannot pay it. Backfilling the number would alter issued documents, which the design deliberately prevents. The counter-argument is that those documents were always meant to carry it and are useless without it. This needs an explicit yes.

**Needs an attorney:** the KatisoBiz operator clause in the terms of service. The product stores personal information about members' own customers, which DigitalFlyer has no relationship with.

**Needs the accountant:** South African time of supply is the earlier of invoice or payment, so a registered member who took a deposit before invoicing technically triggered the VAT at the deposit. The product records it correctly either way; the reporting treatment needs confirming.

**Watch from launch:** the build spec commits to tracking how many members hit the free cap and go quiet versus how many upgrade. If more than half go quiet, the volume cap is the wrong model. This is measured and visible on the admin page.

---

## 8. What would move the needle next

In order of what actually changes the business.

1. **Activation.** A signup who never sends a document is worth nothing. The setup path has been shortened but has not been measured against real signups.
2. **The accountant channel.** One accountant carries fifty to two hundred small businesses. The export is built and designed as a referral, and has never been sent to a real accountant.
3. **Transactional emails.** The product currently goes silent between a member sending a quote and remembering to check it.
4. **The Members List.** Live, opt-in, and empty until members switch it on.
