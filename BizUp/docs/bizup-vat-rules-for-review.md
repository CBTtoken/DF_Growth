# BizUp, VAT and Tax Invoice Rules for Review

**For:** a South African accountant or tax practitioner
**From:** DigitalFlyer SA
**Prepared:** 27 July 2026
**What we are asking:** please tell us where we have got this wrong. This is a list of the rules we have built into software, written as plain statements so each one can be confirmed or corrected. We are not asking for advice on our own tax affairs.

---

## What the software is

BizUp is a tool for small and informal South African service businesses, mostly plumbers, electricians, mechanics and handymen. It lets them create a quote on a phone, send it by WhatsApp, turn it into an invoice, and record who has paid.

It is deliberately **not** an accounting package. It produces documents and tracks payment status. It does no bookkeeping, no ledgers, no VAT returns, and no financial statements. When a member needs books, they need you. Our job is to hand you clean data.

Most of our members will **not** be VAT vendors. A meaningful minority will be. The software has to be correct for both.

---

## How to review this

Each numbered item below is a rule the software already enforces. For each one, please mark it **correct**, **wrong**, or **needs nuance**, and tell us what it should say instead. You do not need to look at any code.

The items in **section 8 are where we are least confident** and would most value your view.

---

## 1. VAT registration status decides everything

**1.1** If the business has no VAT number on file, the document is titled **"Invoice"**, never "Tax Invoice".

**1.2** In that case no VAT is calculated, no VAT percentage is shown, and no VAT line appears anywhere on the document. The VAT fields are hidden entirely rather than shown as zero or greyed out.

**1.3** A small line is printed on those documents: *"Not a VAT vendor. No VAT charged."*

**1.4** If the business has a VAT number on file, the document is titled **"Tax Invoice"**, VAT is calculated at **15%** and shown as a separate line, and the supplier's name, address and VAT number are always printed.

**1.5** We store the VAT rate that applied **on the document itself** at the moment it was issued, rather than looking up a current rate when the document is later reprinted. If the national rate ever changes, every historical document still shows the rate that applied on the day.

## 2. VAT number checking

**2.1** We check the **format only**: 10 digits, beginning with 4. We do not verify against SARS and we never tell the member their number has been verified.

**2.2** When a member enters a VAT number for the first time, we show: *"From now on your invoices will include 15% VAT and will be titled Tax Invoice. Documents you have already issued will not change."*

**2.3** We record the date the VAT number was first entered, and never overwrite it afterwards.

## 3. How VAT is calculated

**3.1** Each line's total is quantity multiplied by the unit price excluding VAT, rounded to the nearest cent.

**3.2** The subtotal is the sum of those line totals.

**3.3** **VAT is calculated once, on the subtotal**, and rounded to the nearest cent. We do **not** calculate VAT per line and add those up.

**3.4** The total is the subtotal plus the VAT amount, never rounded again.

> We chose 3.3 so the document's own figures always add up. Calculating per line and summing can differ from the total by a cent or two on a long invoice. **Please confirm SARS has no objection to this method.**

## 4. The R5,000 threshold

Based on the **VAT inclusive** total of the document, and applied only to VAT vendors.

| Total including VAT | What we do |
|---|---|
| R50 or less | No formal tax invoice required. We still issue a normal document. |
| More than R50, up to R5,000 | Abridged tax invoice. The customer's address and VAT number are optional. |
| More than R5,000 | Full tax invoice. The customer's legal name and physical address become **required** before the document can be issued, and we prompt for their VAT number. |

**4.1** When a vendor's running total crosses R5,000 while they are still building the document, we show a notice and reveal the extra customer fields. We block **issuing**, not editing, so they are never stuck mid-job.

**4.2** On a full tax invoice we print: the words "Tax Invoice", the supplier's name, address and VAT number, the customer's name and address, the customer's VAT number where they are a vendor, a unique serial number, the date of issue, a description of the services, the quantity or volume, and the value of the supply plus the VAT amount plus the total.

## 5. Timing

**5.1** We understand a tax invoice must be issued **within 21 days** of the supply. We show a gentle reminder on unissued drafts older than 14 days. We do not block anything.

**5.2** We understand the same 21 day window applies to correcting the particulars of an invoice under **section 20(1B)**.

## 6. Quotes

**6.1** For a VAT vendor, a quote leads with the **VAT inclusive** total.

> Our understanding is that **section 65 of the VAT Act** requires a quoted price for a taxable supply to either include VAT or show both figures. **Please confirm.**

## 7. Correcting and cancelling

We deliberately support only three actions, and no others.

**7.1 The details are wrong but the amount is right.** Same invoice number, same issue date, same amounts. Only the customer's name, address, VAT number or the wording of the description can change. Quantities, prices and totals cannot. We keep the original and the corrected version, and require a written reason. We understand this to be a **section 20(1B)** correction of particulars.

**7.2 The customer is not paying at all.** We issue a **credit note for the full invoice amount** and mark the invoice cancelled.

**7.3 The amount was wrong.** We issue a **credit note for the full original amount**, then create a **new invoice** with a new number.

**7.4** We do **not** support debit notes. An increase in value is handled as a full credit plus a new invoice.

**7.5** We do **not** support partial credit notes. Always the full amount, plus a new invoice if needed.

**7.6** An issued document is never deleted, never renumbered, and its amounts are never changed. Drafts have no number and can be deleted freely.

**7.7** Invoice numbers run in an unbroken sequence per business per year, in the format INV-2026-0001. A number is assigned at the moment of issuing, never when a draft is created, so abandoned drafts leave no gaps. Credit notes have their own unbroken sequence.

## 8. Where we are least confident

**8.1 The turnover tracker.** We track a **rolling twelve month** total of invoices issued, meaning any consecutive twelve month period rather than the financial year. We show two markers:

- Crossing **R120,000**: *"You can now choose to register for VAT with SARS. This is optional."*
- Crossing **R2.3 million**: *"You must register for VAT with SARS within 21 business days."*

**Please confirm both thresholds, the rolling twelve month basis, and the 21 business day wording.** We have built these so they can be changed without new software, because we expect SARS to move them.

**8.2 Financial year end.** We capture this separately, defaulting to **February**, and use it **only** to group reports into "this tax year" and "last tax year". It never resets the rolling twelve month tracker above. **Is February the right default** for sole proprietors and small businesses, and is it correct that these two periods should never be conflated?

**8.3 Is 7.3 defensible?** Cancelling an invoice in full and issuing a new one, rather than issuing a debit or partial credit note, is much simpler for a non-accountant to understand. **Is there any circumstance where this would cause you or SARS a problem?**

**8.4 Retention.** We intend to keep all invoices, credit notes and supporting records for **at least 5 years**. **Is 5 years right, and does the clock start from the date of the document or from the end of the tax year?**

**8.5 What have we missed?** Is there a rule that applies to a small service business issuing tax invoices that does not appear anywhere above?

## 9. What we never claim

For your comfort, we have instructed internally that BizUp is never described as "SARS compliant" or "guaranteed compliant". We say "SARS-ready documents".

Every report and our terms of service carry: *"BizUp helps you produce compliant documents but you remain responsible for your own tax affairs. Complex cases should go to a tax practitioner or SARS."*

---

## Thank you

If it is easier to mark this up and send it back, please do. If anything here is wrong we would far rather know now, while it is a change to some software, than after a member has sent a few hundred documents.

**Contact:** Dewald Rosema, DigitalFlyer SA, info@digitalflyer.co.za
