# KatisoBiz: System Status

**Updated 28 July 2026, the day the paid campaign went live.** Written for a business update, so it says what exists, how it works, and what does not exist yet. Every figure was read from the live database, not estimated, and the database was cleared of test data first so the figures mean something.

---

## 1. What KatisoBiz is

Mobile-first quoting and invoicing for South African tradesmen and one-person businesses. A plumber standing in a customer's kitchen builds a quote on his phone in under a minute, sends it on WhatsApp from his own number, turns it into an invoice when the job is done, and gets paid.

It is a module inside the existing DigitalFlyer Growth application: same codebase, same database, same login, its own domain.

**Live at katisobiz.co.za.** Also answers on www.katisobiz.co.za, katisobiz.digitalflyer.co.za and the older bizup.digitalflyer.co.za, so nothing already sent to a customer breaks.

**Commercially, it is a funnel into Growth, not a revenue line of its own.** Free tier proves the product, R49 makes a solo operator better, R89 handles a small team. A member who starts getting calls from their free spot on the Members List is the easiest conversation about a Growth page there is.

---

## 2. Where it stands today

**The paid campaign is live and has produced its first member.** The product is out of pilot and into acquisition.

| | |
|---|---|
| Real members | 3 |
| Of those, from the paid campaign | 1 |
| Product owner's own account | 1 |
| Subscription revenue collected | R49 |
| Documents in the system | 0, cleared for launch |

The database was deliberately emptied on 28 July. Every test account, test document and test customer was removed so the numbers from here are real. What survived was chosen rather than defaulted: the record of money actually taken was kept, and one account was kept out of the deletion because it carries a live Paystack subscription that deleting the account would not have cancelled.

**Two real businesses are now on it.** A working plumber, recruited directly, and a second business that arrived through the campaign without being spoken to. The plumber has run a full job through the system end to end.

**Field testing has been worth more than any internal review.** It has produced four defects in two days, each one found by use rather than inspection:

- Banking details printed masked on invoices, so no customer could actually pay one
- A straight invoice appeared impossible, because only one screen offered it and another screen said the opposite
- Four footer links returned 404 on the KatisoBiz domain
- No page in the signup funnel loaded the advertising pixel, so paid traffic would have been unattributable

All four are fixed. The last was found the day before spending started.

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

### Continuing an existing numbering sequence
A business arriving from a paper book or another product is usually mid-sequence. A tax invoice has to carry a number in an unbroken series, so restarting at 1 when the old book reached 450 reads to an auditor as missing invoices. The member sets their starting number before issuing anything, and it locks afterwards, because changing it later would either repeat a number a customer already holds or leave a gap. Raised by a real member, built the same day.

### Fixing mistakes
- "Fix this invoice" handles all three cases correctly: a detail-only correction keeping the same number and date, a full credit note and cancellation, or a credit note and a replacement
- Issued documents are never silently altered; both versions are kept

### Being told what the customer did
Three emails, each one prompting a specific action rather than reporting news: the customer has opened it, so phone them; a quote is about to lapse, so follow it up; an invoice is late, so chase it. All go to the member and never to the member's customer, which is the same rule the reminder feature follows. On by default, with a switch. A fourth, "your quote was accepted", was deliberately dropped: the member records acceptance themselves, so it would have emailed them what they had just clicked.

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
An opt-in spot on the KatisoBiz Members List at DigitalFlyer's Growth site: business name, trade, town, WhatsApp button. Taps are counted.

---

## 4. How it works, in the parts that matter

**Documents are immutable once issued.** At the moment of issue, the supplier's details, the customer's details and the banking details are copied onto the document as snapshots. Nothing re-reads the live account afterwards. A member who changes their address next year does not retrospectively alter last year's invoices.

**Numbering is atomic.** Numbers come from a database function that row-locks, verified with 40 concurrent allocations producing 1 to 40 with no gaps and no duplicates. Gaps in an invoice sequence are a SARS problem, so this is not left to application code.

**Money is integer cents throughout**, and VAT is calculated once on the subtotal rather than summed per line, so rounding cannot drift.

**Every figure comes from one module.** The reports screen, the CSV, and the accountant pack all call the same functions. An accountant finding two different totals for one month is the fastest way to lose trust in the whole product.

**Nothing messages a customer on its own.** Quotes, invoices and payment reminders all open WhatsApp on the member's phone with the message written; the member presses send. A tool that messages your customers for you is a trust problem in this market.

**Payments are idempotent.** Paystack redelivers webhooks, so crediting is keyed on Paystack's own transaction reference with a unique constraint. Verified: a redelivered topup credits once, a genuinely second topup credits again.

**Banking details are encrypted at rest**, decrypted only to print on a document, and changing them requires a code emailed to the member. That last part exists because an attacker who takes over an account changes the banking details, and a clicked-link confirmation can be consumed by a mail scanner before the owner sees it.

**Notifications cannot fire twice.** Each of the three claims a guard column before sending rather than after, so a retry, a duplicate scheduled run or a deploy mid-batch cannot email the same member about the same document again. Proven live: a first run sent, an immediate second run sent nothing, and opening a document link three more times produced no further email.

**Sending reputation is treated as an asset.** A customer's email address is checked before a document is sent to it, because a member's typo becomes a bounce against DigitalFlyer's domain rather than theirs, and a throttled domain stops login codes arriving for everybody. The check catches malformed addresses and domains that do not exist. It does not catch a typo that happens to be a registered domain, which is a limitation recorded honestly rather than papered over.

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

- **Multi-user accounts.** Parked, not scheduled. Every account is one user today, enforced in code. The realistic case is an owner plus one admin person rather than a crew, and it would need a membership table, two roles, and banking details restricted to the owner. Because account scoping runs through a single function rather than being repeated in every query, it stays a contained change when demand appears. Nobody has asked yet, including the field tester.
- **Recurring invoices.** Deliberately refused rather than deferred. Tradesmen invoice per job, not per month, and the History tab plus the saved price list already make repeat work fast.
- **Online card payment on an invoice.** A customer pays by EFT, not by clicking the invoice. Raised as an idea worth doing later: helping members open their own Paystack account so every invoice carries a Pay Now link. It shares an unresolved commercial decision with Growth's own payments question, and the published terms currently state DigitalFlyer is not a party to a member's transaction, so it would need those terms revisited.
- **DigitalFlyer's own financial reporting.** Requested, agreed as not a priority.

---

## 7. Open items

**Closed since the last version.** The masked account numbers needed no decision: all were on test accounts and already settled. The attorney-reviewed clauses are published. The accountant has confirmed the VAT treatment. Customer email addresses are now validated before sending. All three transactional emails are built and running.

**Needs doing by the product owner:** verifying the katisobiz.co.za domain inside Meta. Until that is done, conversions from iPhone users are under-reported, so the campaign's real performance will look worse than it is. Everything on the product side is in place and tested.

**Needs doing before roughly eighty members:** the email provider's free tier allows one hundred sends a day, and that daily ceiling fails silently before the monthly one is reached. Moving up a plan costs around R370 a month and stays under three percent of revenue at a thousand members, so this is an operational reminder rather than a commercial question.

**Needs cancelling in Paystack:** one test account was kept out of the database clear-out because it carries a live R49 subscription. Deleting the account would not have stopped Paystack charging the card. Once the subscription is cancelled the account can go.

**Watch from launch:** the build spec commits to tracking how many members hit the free cap and go quiet versus how many upgrade. If more than half go quiet, the volume cap is the wrong model. This is measured and visible on the admin page.

---

## 8. What would move the needle next

In order of what actually changes the business.

1. **Activation, and it is now measurable.** A signup who never sends a document is worth nothing. Two real members are on the system and neither has issued a document yet. That single number, signups who go on to send something, is the one to watch this week, and the campaign is what finally makes it a real measurement instead of a guess.
2. **The Meta domain verification.** Ten minutes of the product owner's time, and until it is done the campaign's reported results will understate what it is actually producing. Nothing else about the campaign is blocked.
3. **The accountant channel.** One accountant carries fifty to two hundred small businesses. The export is built and designed as a referral, and has never been sent to a real accountant. It is the cheapest route to volume that does not cost per click.
4. **The Members List.** Live and opt-in, with nobody listed since the clear-out. It is worth nothing to a customer until enough trades are on it to be worth searching, so it needs members before it needs promotion.

**The deliberate non-priority is more features.** The product does the job. In two days a working plumber and a live campaign produced four defects between them, every one found by use rather than by inspection, and that is a better build list than any internal guess. The constraint is not what KatisoBiz can do. It is that almost nobody knows it exists.
