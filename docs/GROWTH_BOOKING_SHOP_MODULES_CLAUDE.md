# DigitalFlyer Growth
## Booking and Shop Modules, Build Spec v1

Internal document for Claude Code handoff. Prepared 14 July 2026 by Dewald Rosema. Adds two new optional capabilities to Growth: real-time booking/scheduling and a product shop, both scoped to a single Growth client's own page, not a cross-client marketplace. Stoep Marketplace remains a separate, later build, nothing here depends on it or feeds into it.

**Sequencing.** This is new work, sequenced after the Public Beta Polish Sprint's launch-blocking items (authentication shift, security hardening) are done. It does not need to wait for every non-blocking item in that sprint, but should not compete with those specific items for priority.

---

## 1. What This Adds

A Growth client can optionally switch on Booking (real-time appointment, daily rental, or capacity scheduling) or Shop (a product catalog with South African courier checkout) for their own page. Both are single-tenant, everything scoped to that one client's own business, no shared search or discovery across other Growth clients. Lives entirely inside Growth's existing codebase and Supabase project, no new product, no new repo.

**Confirmed tech stack, unchanged:** Next.js App Router, TypeScript, Vercel, Supabase, Paystack, Meta WhatsApp Cloud API (Growth's existing integration), Claude API, GitHub.

**Tier gating.** Available to Growth tier and above, not Foundation. Foundation stays the simple entry tier; Booking and Shop are premium, revenue-bearing capabilities, consistent with how Growth already differentiates tiers. Confirm before building if this should be broader.

---

## 2. Payment Architecture, a Scoped, Deliberate Change

**This is new.** Growth's earlier confirmed decision was no in-platform client payment collection, the product was lead generation only, and the misleading "Secure Payment via Paystack" badge was removed from client pages specifically because that capability didn't exist. Booking and Shop change that, deliberately and only for these two features.

**Confirmed scope of the change.**
- The existing Packages/lead-gen flow is unchanged. A client's Packages section still displays offers and routes to an enquiry, no checkout, no payment. Do not touch that flow as part of this spec.
- Booking and Shop are single-event payments (a booking confirms once, an order settles once), which is exactly the shape Paystack Subaccounts are built for, instant settlement is a feature here, not a problem.

**Build.**
- Add a `client_subaccounts` table, storing each Growth client's Paystack Subaccount code, linked to their `growth_clients` record.
- A client who has connected a Subaccount gets Booking and Shop payments routed directly to their own Paystack balance, standard subaccount fee split. A client without one has those payments route through the platform account as a fallback, consistent with the fallback pattern already used elsewhere.
- **Confirm current South African Subaccount fee structure against Paystack's live documentation before building this**, don't assume rates from training data on something this specific and money-related.
- The "Secure Payment via Paystack" badge, removed from client pages earlier for good reason, can now correctly reappear specifically on any client page where Booking or Shop is active, since real payment collection genuinely exists there now. Do not add it back anywhere else.

---

## 3. Booking Module

### 3.1 Core model: Bookable Units

Everything scheduled, a salon chair, a rental room, a desk slot, is a Bookable Unit, tracked through the same underlying tables regardless of type, keeps this simple rather than three parallel systems.

**Client setup, three resource types:**
- **Time-slot driven**: fixed-duration appointments (salon, property viewing).
- **Day/night calendar driven**: overnight check-in/check-out (short-stay rental).
- **Capacity driven**: open shared limits (desks, event space).

**Operational rules per client**: operating hours, buffer intervals between bookings, minimum advance-booking window, base pricing with date-range overrides for holidays or promotions.

### 3.2 Customer booking flow

1. Visitor opens the client's page, sees a real-time availability calendar for whichever bookable units are configured.
2. Selecting a slot triggers an availability check before proceeding.
3. Selected slot holds for 10 minutes while the visitor completes details and payment.
4. Unpaid holds release automatically after 10 minutes back to the public calendar.
5. Successful payment converts the hold to a confirmed booking.

### 3.3 Notifications, reuse Growth's existing WhatsApp integration

Use Growth's own WhatsApp Cloud API integration, the same one already built for WhatsApp onboarding, don't stand up a second integration.
- Instant booking confirmation via WhatsApp.
- Automated reminders ahead of the booking (timing configurable per client, for example 2 hours ahead for an appointment, 24 hours ahead for a rental check-in).
- Visitors can reply "CANCEL" or "RESCHEDULE" as plain text to update their own booking.

### 3.4 Dashboard addition

- A calendar view (day/week/month toggle) added to the client dashboard, only visible once Booking is switched on, bookings colour-coded by status.
- Setup uses simple radio-button questions, "Are you renting space by the day, or booking appointments by the hour?", not a settings-menu wall.
- A price-override table for date-range-specific pricing.

### 3.5 Public page addition

- A booking calendar section appears on the client's public page, only if Booking is active, mobile-first, large tappable date blocks, unavailable dates greyed out.
- Upfront price breakdown next to the calendar.
- Sticky bottom checkout drawer on mobile with the booking summary and "Confirm & Pay" button.

### 3.6 Production readiness

- All timestamps stored in South African Standard Time (SAST) consistently.
- A scheduled job clears expired, unpaid holds every 60 seconds.
- Booking confirmation states clearly that service delivery and any related liability rest with the business owner, not DigitalFlyer.
- Clients can set their own cancellation and terms policy, shown to the visitor before payment.

---

## 4. Shop Module

### 4.1 Client setup for Shop

A Growth client with Shop enabled gets a shop section on their own existing page, not a separate storefront URL, this stays part of their one page, not a second destination. They provide a physical collection address (required for courier pickup) and, per Section 2, optionally connect a Paystack Subaccount.

### 4.2 Bulk inventory upload

- Clients drop a CSV into the dashboard, parsed client-side before upload.
- Maps: product title, SKU, base price, variant descriptors (size, colour), stock quantity, and physical package details (weight in kg, length, width, height in cm), required per SKU for accurate courier rates.
- Valid rows commit in small batches, invalid or duplicate rows are skipped without stalling the upload and shown back as clear per-row errors (for example, "Row 14: missing item weight").

### 4.3 Shop display

- Products display within the client's own page in a dedicated Shop section, not indexed into any shared cross-client search or directory, this is that one business's own catalog only.
- Page views and completed sales tracked per product, the top 3 best-performing items surface automatically at the top of that client's own Shop section.

### 4.4 Checkout and South African shipping

- Visitor adds items to cart, enters a South African delivery address.
- Live shipping rates fetched from the Bob Go API (docs: https://api-docs.bob.co.za/bobgo), quoting from South African couriers plus Pargo Point and Bob Box Locker pickup.
- Checkout shows shipping tiers transparently (economy, express, locker pickup) before payment.
- On successful payment, Bob Go's fulfilment webhook fires, generating a waybill and scheduling courier collection, tracking updates push to the buyer via WhatsApp (Section 3.3's integration).

### 4.5 Dashboard and page UI

- Dashboard: Inventory, Shipping, Payments, Coupons as sub-sections under the Shop area, only visible once enabled. Drag-and-drop CSV upload with a live progress meter. A clear badge showing whether a Subaccount is connected or payments are on the platform fallback.
- Collection address field uses Google Maps autocomplete to prevent bad courier pickups.
- Public Shop section: mobile-first, top 3 popular items highlighted, standard grid below with image, title, price, variant selector, and a clear call-to-action.

### 4.6 Data access rules

- Public visitors can view active listings, prices, and shipping options without logging in. Draft items, disabled variants, and private metrics are never publicly visible.
- A client can only read, edit, or delete their own Shop's inventory, coupons, and orders, enforced server-side on every request, RLS is the last line of defence, not the only one.

### 4.7 Production readiness

- Stock quantity updates run as atomic transactions during checkout to prevent overselling during concurrent purchases.
- Checkout endpoints carry the same rate-limiting pattern already applied elsewhere in Growth.
- Checkout screens state clearly that product quality, accuracy, and fulfilment are the client's responsibility, not DigitalFlyer's.

---

## 5. Data Model Additions

New tables inside Growth's existing Supabase project, each linked to `growth_clients`:

- `bookable_units`, `booking_operational_rules`, `reservations` (Booking module)
- `shop_products`, `shop_product_variants`, `shop_coupons`, `shop_orders` (Shop module)
- `client_subaccounts` (shared, Section 2)

RLS on every one from the start, isolating each client's data from every other client, same pattern already used throughout Growth.

---

## 6. Sprint Order

1. **Schema and RLS**, Section 5's tables, isolated and tested before any UI work.
2. **Booking core flow**, Sections 3.1 to 3.5.
3. **Shop core flow**, Sections 4.1 to 4.5, without live shipping yet.
4. **Payment integration**, Section 2's Subaccount routing, connected to both modules.
5. **Bob Go logistics**, Section 4.4's live shipping and fulfilment webhook, Shop only.
6. **WhatsApp notifications**, Section 3.3, extended to Shop's order and shipping updates.
7. **Production readiness**, Sections 3.6 and 4.7, both checklists run through before either module goes live to real clients.

---

## 7. Out of Scope

- Stoep Marketplace itself, a separate, later build, entirely unrelated codebase.
- Any cross-client search, discovery, or shared directory, everything here stays scoped to one client's own page.
- Any change to the existing Packages/lead-gen enquiry flow, Section 2 confirms that stays untouched.
- Any change to Foundation tier's included features, Booking and Shop are Growth tier and above only, per the confirmed default in Section 1.
- A public developer API for embedding calendars externally, not part of this scope, revisit only if there's real demand once the core modules are live.

---

*Once this ships and is tested, particularly the Subaccount payment routing in Section 2, bring results back before deciding what's next.*
