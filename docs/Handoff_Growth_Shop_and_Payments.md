# CLAUDE CODE HANDOFF: GROWTH SHOP AND PAYMENTS

**Prepared for Dewald Rosema | 2 August 2026**

**Two sprints. Hand over Sprint 1, take the report, then hand over Sprint 2. Do not run them together.**

---

## CONTEXT

Growth gives members a lead generation page and a shop. The page is good. The shop is not: products appear as small cards with no product page and no proper storefront, so there is nothing for Google to index, nothing to share in WhatsApp, and nothing that reads as a real shop to a buyer.

The target member is a solo operator in South Africa selling low-value items, often R80 to R500. Most of their buyers are on a phone, on mobile data, and have never bought from them online before. The buyer's decision is mostly about trust: is this a real business and will the thing actually arrive.

**Design for that buyer.** Not for a fashion brand with a photographer.

Two constraints that shape everything:

- **Most members do not have a payment gateway yet.** The shop must work fully without one. This is the normal case, not the fallback.
- **Most members do not have a courier account yet.** Same.

---

# SPRINT 1: THE SHOP

## 1.1 What to build

**A storefront.** The member's shop as a proper page, connected to their existing landing page by a menu item that only appears if they have products. It must feel like part of their site, using their theme, not a generic Growth page.

**A product page for every product.** Its own URL, its own title, its own description, its own images. This is the most valuable part of this sprint. It is what gets indexed, what gets sent in a WhatsApp message, and what converts.

**Featured products on the landing page.** A short row, three items, with a link to the full shop.

Do not call these "most popular". There is no sales data on day one. The member chooses which products to feature, and if they have not chosen, fall back to most recently added. Once real order data exists, offer an automatic option, not before.

## 1.2 The product page

- Product name, price in Rand, description, multiple images with the first as the main
- Stock status if the member tracks stock, otherwise nothing
- Variants where the member has set them, for example size or colour
- Delivery and collection options in plain words
- One clear buy action
- The business name and contact, so the page stands on its own when it arrives as a link with no other context
- Correct metadata: title, description, `og:image` using the product image, `og:locale` `en_ZA`, canonical URL, and product structured data so it can appear properly in search results

Phone first. Light. A buyer on mobile data must see the product and the price without waiting.

## 1.3 Checkout

**Guest checkout. No account creation to buy anything, ever.** Requiring a buyer to register is the single biggest conversion killer for this market.

Collect only: name, contact number, email if they want a receipt, delivery address if delivery is selected.

Two paths, decided by whether the member has connected a gateway:

**Gateway connected:** the buyer pays. Order recorded as paid. Member notified. Buyer sees confirmation.

**No gateway connected:** the order is recorded as unpaid and awaiting the member. The buyer sees a clear message that the seller will contact them to arrange payment, with the expected timeframe. The member gets an email with the full order and it appears in their dashboard.

**Do not publish the member's banking details on the site or in the buyer confirmation.** The member arranges payment directly. Publishing account details invites impersonation and there is no way to police it.

Both paths must feel finished to the buyer. The no-gateway path is the common case and must not read as broken or half-built.

## 1.4 The member's dashboard

Orders list with status: new, paid, unpaid, fulfilled, cancelled. The member can mark an order paid and mark it fulfilled, add a note, and see the buyer's details.

Product management: add, edit, images, price, stock, variants, feature or unfeature, publish or unpublish.

Everything a member can do here must be doable by a member, unaided, on a phone. Assume no technical ability.

## 1.5 Delivery, before Bob Go exists

Member sets, per shop: collection only, flat rate delivery, free over a threshold, or quote on request. Applied at checkout.

Bob Go live rates come in Sprint 2 and only for members who have connected it.

## 1.6 Out of scope for Sprint 1

Gateway connection UI, Bob Pay integration, Bob Go integration, discount codes, abandoned cart, reviews and ratings, wishlists, buyer accounts, multi-currency, subscriptions, marketplace-wide search across members.

## 1.7 Acceptance criteria, Sprint 1

1. A shop with products renders as a storefront in the member's own theme, and the menu item appears only when products exist.
2. Every product has its own URL and page, with correct metadata and a correct link preview showing the product image.
3. Featured products show on the landing page, member-chosen, falling back to most recent.
4. A buyer can complete a purchase with no account, on a phone, in under a minute.
5. With no gateway connected, the order records, the member is emailed, the order appears in the dashboard, and the buyer sees a clear finished confirmation.
6. With a gateway connected, payment completes and the order records as paid.
7. No banking detail appears anywhere on a public page or buyer email.
8. A member can add a product with images and variants from a phone without help.
9. Pages load quickly on a slow mobile connection.
10. Growth, KatisoBiz, The Board, The Desk and moxiemag.co.za all behave exactly as before. Verify `robots.txt` and headers directly.

---

# SPRINT 2: PAYMENTS AND COURIER

## 2.1 Bob Pay integration

New gateway integration alongside the existing Paystack support.

Bob Pay is Bob Group's South African gateway. Relevant facts, all published by them and worth re-verifying at build time:

- Sole proprietors can apply as individuals with ID, proof of residential address and proof of bank account. **No CIPC registration required.** This is why it is the recommended option for Growth members.
- Applications are typically reviewed in two to three business days.
- No monthly or setup fee, per-transaction pricing only.
- Supports cards, manual and instant EFT, PayShap, Capitec Pay, Absa Pay, Nedbank Direct EFT, Scan to Pay.
- **No recurring subscription support yet.** Growth and KatisoBiz membership billing stays on Paystack. Bob Pay is for member product sales only.
- Off-site gateway: the buyer is redirected to Bob Pay, and a webhook confirms the result.

Implement create-payment, redirect, webhook confirmation and refund. Verify payment status against their API on webhook receipt rather than trusting the webhook payload alone.

## 2.2 The connect-your-gateway flow

In the member dashboard, one section: online payments.

**Present one recommendation, not a menu.** Recommend Bob Pay, with Paystack offered as the alternative for members who already have an account. Do not present two equal choices.

For a member with no gateway, show a short checklist in plain language: what documents they need, roughly how long approval takes, a link to apply, and what to do when approved. No jargon.

For a member with an account, one field to connect it, a test that confirms the connection works, and a clear connected state.

**Never route a member's customer payments through a DigitalFlyer account.** Not by default, not as a convenience, not for anyone. If a member has no gateway, the shop uses the no-gateway path from Sprint 1.

## 2.3 Credential storage

Members will be pasting API keys into Growth.

- Encrypted at rest, never written to logs, never returned to the browser after saving, never included in any export.
- The member can revoke and replace a key themselves.
- Show only the last few characters once saved.

This is the one place credentials are stored in the estate. Treat it accordingly.

## 2.4 Bob Go connection

Same pattern as payments: a checklist for members without an account, a connect flow for members with one.

Per Bob Go's own reply, DigitalFlyer will not be a listed sales channel. Members generate an API key through their unique channel identifier and connect via the API handler module.

**Three questions are outstanding with Bob Go and Dewald is waiting on answers.** Build what you can and flag anything that depends on them:

1. Whether an authorisation flow exists so members approve a connection rather than pasting a token by hand
2. Whether tokens expire and what the renewal path is
3. Whether a webhook can be registered on a member's account pointing at a DigitalFlyer endpoint, routed on `account_id`

**Token expiry is the dangerous unknown.** If tokens expire silently, member checkouts stop quoting and nobody finds out until a buyer complains. Whatever you build, detect a failing connection and surface it to the member in the dashboard rather than failing quietly.

Also unresolved: the Bob Go API channel carries a crown icon indicating a paid tier. Bob Go has removed that limitation for Dewald's own API requirements, but it is not confirmed whether it is lifted for members connecting to DigitalFlyer. **Do not assume it is.** Flag it in the report.

Once connected, use Bob Go for live delivery rates at checkout, waybill creation from a paid order, and tracking status on the order.

## 2.5 Acceptance criteria, Sprint 2

1. A Bob Pay payment completes end to end in sandbox, including webhook confirmation verified against their API.
2. A refund initiated from the dashboard reaches Bob Pay correctly.
3. The payments section presents Bob Pay as the recommendation with Paystack as the alternative, and a member with neither sees a plain-language checklist.
4. A connected gateway is testable from the dashboard and shows a clear connected state.
5. No credential is ever returned to the browser, written to a log, or included in an export.
6. A member can revoke and replace their own key.
7. No payment path exists that routes member sales through a DigitalFlyer account.
8. A connected Bob Go account returns live rates at checkout, and a failing connection is surfaced to the member rather than failing silently.
9. Everything from Sprint 1 still passes.

---

## WHAT YOU DECIDE VERSUS WHAT NEEDS DEWALD

**You decide:** storefront and product page design within the member's theme, URL structure, order state machine, how credentials are encrypted, dashboard layout.

**Stop and ask Dewald:**
- Anything that would require routing member payments through a DigitalFlyer account
- Anything Bob Go's unanswered questions block
- Anything requiring a new paid service
- Anything that would change behaviour for existing members with live shops

---

## HOW TO REPORT BACK

One report per sprint. What was built, every criterion pass or fail, the header check output, anything blocked by Bob Go's outstanding answers, and anything you had to assume.

Flag clearly in the Sprint 2 report whether the Bob Go crown-icon limitation applies to members, because Dewald needs to chase it if unresolved.
