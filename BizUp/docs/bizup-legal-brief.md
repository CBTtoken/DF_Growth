# BizUp, Scoping Brief for Legal Review

**For:** a South African attorney with POPIA and consumer/tax experience
**From:** DigitalFlyer SA
**Prepared:** 27 July 2026
**Purpose:** define the scope of work so the attorney is not paid to work out what is needed. This document is a description of the product and the gaps, not a legal opinion, and it is not drafted by a lawyer.

---

## 1. What is being launched

BizUp is a new module of the DigitalFlyer SA platform. It lets a small or informal South African business (plumber, electrician, mechanic, handyman) create a quote on a phone, send it to their customer by WhatsApp or email, convert it to an invoice, and record who has paid. It calculates VAT according to whether the business is a registered VAT vendor.

It is **not** an accounting package. It produces documents and tracks payment status. It does no bookkeeping, no ledgers, no payroll and no VAT returns.

- Sold standalone from R49 per month, and bundled with existing DigitalFlyer Growth subscriptions.
- Runs at `bizup.digitalflyer.co.za`, on the same infrastructure as DigitalFlyer Growth.
- Payments taken through Paystack.

## 2. Why this needs review, and why existing documents are not enough

Everything DigitalFlyer has built until now holds data about **its own customers**, the businesses that subscribe.

BizUp is the first product that stores personal information about **the customers of those businesses**, who are third parties DigitalFlyer has no relationship or contract with, and who never agreed to anything with DigitalFlyer. A plumber using BizUp will store his customers' names, physical addresses, phone numbers, email addresses and a record of work done at their homes.

That changes DigitalFlyer's role in law. Our understanding, for the attorney to confirm or correct:

- The **member** (the plumber) is the **responsible party** for their own customer data.
- **DigitalFlyer is the operator**, processing that data only on the member's instruction.
- POPIA section 20 and 21 require this relationship to be governed by a **written** agreement.

There is a second reason: BizUp produces **tax documents**. Invoices, tax invoices and credit notes carry SARS record-keeping obligations and a real risk of a member relying on the tool and blaming us for the result.

### Current state of our documents

We have reviewed our live terms of service and privacy policy. Concretely:

- Neither contains **any** operator clause or reference to POPIA section 21.
- Neither states a **data retention period** of any kind.
- The privacy policy names Supabase, Vercel and Paystack as sub-processors. It does not name **Resend** (our email provider), which is already in use.
- The privacy policy does name an Information Officer.

So this is an addition to existing documents, not a rewrite of them.

---

## 3. Terms of service, seven additions requested

**3.1 Operator clause.** That DigitalFlyer processes the member's customer data only on the member's instruction, will not use it for any other purpose, will not sell or share it, and will apply reasonable security measures. Required in writing by POPIA section 21. **This is the clause we most want drafted rather than adapted from a template.**

**3.2 Not tax advice.** BizUp is an assistive tool. The member remains responsible for their own tax affairs, for the accuracy of what they invoice, and for their own VAT registration status. Complex cases go to a tax practitioner or SARS.

**3.3 Accuracy of VAT status.** The member warrants that any VAT number they enter is real and current, and accepts that entering one causes the system to add 15% VAT to their documents and to title them "Tax Invoice".

**3.4 Retention, and how it interacts with cancellation.** Financial records are kept for at least 5 years as required by SARS, and this survives cancellation of the subscription. See section 5 below, which is the one place our existing policy actively conflicts.

**3.5 Export on exit.** What a departing member receives (all documents as PDFs plus a spreadsheet of every document) and how long they have to collect it.

**3.6 Document delivery.** That DigitalFlyer is not liable for a customer failing to receive or read a document, nor for non-payment by the member's customers.

**3.7 Banking details.** That the member is responsible for the accuracy of the banking details they enter. DigitalFlyer prints what it is given.

---

## 4. Privacy policy, five additions requested

**4.1** A plain statement that BizUp stores the member's customers' names and contact details, why it does so, and that DigitalFlyer acts as operator rather than owner of that data.

**4.2** What DigitalFlyer staff can and cannot see. This must be stated accurately, see section 6 below, which sets out precisely what is and is not true.

**4.3** The 5-year financial retention period, and that it overrides our standard deletion timeline.

**4.4** Sub-processors named: **Supabase** (hosting and database), **Resend** (email), **Vercel** (application hosting), **Paystack** (payments), and the PDF rendering service if we end up using an external one (currently we intend to render in-house, specifically so that banking details are never sent to a third party).

**4.5** Information Officer details and how to lodge a complaint, including with the Information Regulator. Partly present already; needs checking against the above.

---

## 5. A conflict in our own policy that needs resolving

This is the item we would most like a clear answer on.

**Our current standing policy** is that non-renewed or unsubscribed businesses are permanently deleted after 60 days, on POPIA grounds.

**That cannot apply to BizUp financial records.** SARS requires invoices, credit notes and supporting records to be kept for at least 5 years.

Our understanding is that POPIA permits retention where another law requires it, so there is no conflict in law, only in our own internal policy, and the resolution is a documented 5-year retention exception for BizUp financial records while personal marketing data (contact preferences, email history) continues to follow the 60-day rule.

**We would like this position confirmed or corrected**, and specifically: does the member's *customer's* personal information sitting inside a tax invoice fall under the SARS retention requirement, or does it need to be treated separately from the financial record it is part of? We do not think it can be separated in practice, since a tax invoice is legally required to carry the customer's name and address.

---

## 6. Our security position, stated honestly

We want the privacy policy to describe this accurately rather than favourably. What is actually true:

- **Banking details are encrypted at rest.** They are decrypted at one point only, when a document is being generated, and every decryption is written to an audit log.
- **We are not able to claim zero-knowledge encryption**, because our own server must decrypt banking details in order to print them on an invoice.
- **Customer names and contact details are not encrypted.** They are protected by database access controls and by our own code, not mathematically. A database administrator at DigitalFlyer could technically read them.

The external claim we propose is: *"Your client list and banking details are encrypted, and our support team cannot see them."*

**We would like this sentence specifically reviewed.** The second half is true of our support process and our built screens. The first half is not fully true of the client list. We would rather publish a weaker sentence that is completely accurate than a stronger one we cannot defend, and we would like help landing on the right wording.

---

## 7. Marketing claims we have already ruled out

For the attorney's awareness, we have instructed internally that the following are **never** to be used about BizUp:

- "SARS compliant" or "guaranteed compliant". We say "SARS-ready documents".
- Any claim that a VAT number has been verified with SARS. We check the format only (10 digits beginning with 4) and tell the member to check it against their own VAT 103 certificate.

Please flag anything else in this brief that we should not be saying.

---

## 8. What we need back, and when

1. A drafted **operator clause** meeting POPIA section 21.
2. Drafted or marked-up wording for the other six terms additions and five privacy additions.
3. A **confirmation or correction** of the retention position in section 5.
4. A **review of the security sentence** in section 6.

**Timing:** the software is being built now. Nothing goes live to a real member without this, so it is the critical path to launch rather than a follow-up item.

**Contact:** Dewald Rosema, DigitalFlyer SA, info@digitalflyer.co.za
