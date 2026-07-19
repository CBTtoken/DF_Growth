# DigitalFlyer Growth
## Quick Sprint: Payment Channels, Near Me, and Pexels Caching

Internal document for Claude Code handoff. Prepared 18 July 2026 by Dewald Rosema. Three focused, independent items. WhatsApp Business number work is explicitly deferred until that number is verified and production ready, not part of this sprint.

**Standing instruction for this and every future sprint:** if a requirement in this document (or any future one) was informed by externally-sourced code or research, that code is reference material only, never paste it into the codebase. Verify the underlying claim, then implement in whatever way genuinely fits this stack.

---

## Priority Order

1. **Section 1 (Paystack payment channels).** Likely mostly an account-settings task with a short wait, do this first, it may not even need much code.
2. **Section 2 (Pexels caching fix).** Small, fast, independent.
3. **Section 3 (Near Me geo-location).** The largest of the three, but still a single-sprint scope.

---

## 1. Enable and Surface Additional Paystack Payment Channels

**Goal.** Make it as easy as possible for a customer without a credit card, but with a bank account, to pay, Instant EFT, Capitec Pay, and SnapScan, alongside the existing card option, on both the web and WhatsApp checkout paths.

**Confirmed from Paystack's own current documentation, verify against the live dashboard before starting:**
- Instant EFT (Paystack's underlying provider is Ozow) and Capitec Pay both require requesting activation via the Paystack dashboard (Settings, Pay by Bank), which triggers a KYC review, allow roughly 3 business days.
- SnapScan and Scan to Pay (QR) appear to already be generally available to South African merchants without that additional review, confirm current status in the dashboard.
- Standard transaction fees apply to all of these, no special surcharge.

**Build.**
1. Dewald requests EFT and Capitec Pay activation through the Paystack dashboard (not a Claude Code task, flagging here so it's not missed, this needs to happen in parallel with or before the rest of this section).
2. Claude Code confirms how the current checkout call (web onboarding's payment step and the WhatsApp payment link) is constructed, standard hosted checkout should surface every enabled channel automatically, but verify this is genuinely how the current implementation works rather than assuming it, some integration patterns restrict channels explicitly.
3. Update pre-checkout copy on both channels so people know card is not the only option. The web onboarding payment step and the WhatsApp payment-link message should mention that EFT, Capitec Pay, and SnapScan are available, not just imply card only. This is the actual "make sure it's clearly communicated" requirement, most of the real work here is messaging, not plumbing.
4. Once EFT and Capitec Pay clear their KYC review, confirm live on a real test transaction per channel before considering this done.

**Acceptance criteria.** A real customer reaches Paystack's checkout page and sees card, EFT, Capitec Pay, and SnapScan as selectable options, not just card. Pre-checkout copy on both web and WhatsApp mentions these options before the customer ever reaches Paystack's page.

---

## 2. Pexels Fetch Timing Fix

**Goal.** Confirm whether a client page without uploaded photos calls the Pexels API live during page render on a cache miss, and if so, move that fetch to onboarding time instead.

**Build.**
1. Verify current behaviour first. If Pexels is already fetched once and its URL stored at onboarding time, this section is already done, report back and stop.
2. If it's genuinely being called live at render time: at the point a client completes onboarding (or updates their industry) without having uploaded a photo, fetch the appropriate industry-matched Pexels photo once and store its URL directly on the client's record. Render always reads the stored URL, never calls Pexels live.
3. Handle the case where a client later uploads a real photo, the stored Pexels fallback URL should simply stop being used in favour of the real photo, no need to delete it.

**Acceptance criteria.** No live Pexels API call happens inside the render path for an existing client's page. A fresh signup without a photo still gets an appropriate stock image, fetched once at onboarding.

---

## 3. Near Me: Geo-Location Search and Sort for the Marketplace

**Goal.** Let a visitor to `/marketplace` sort and see results by actual distance from where they are, not just "Recently added" or "Most visited," so a hustle in Soweto shows up first for someone in Soweto.

### 3.1 First, verify the real starting point

Before estimating scope further, confirm: does the business address field in web onboarding (Business Profile step) already use Google Places autocomplete, the same way the Shop module's collection address does? If yes, real coordinates are likely already available or trivially captured from the place result, this section gets meaningfully smaller. If it's still a plain text field, that needs to change as part of this work.

### 3.2 Database

1. Enable the `postgis` extension on the Supabase project (built in, no new service).
2. Add a `geography(POINT)` column to the client record, storing latitude/longitude.
3. Build a Postgres function using PostGIS's `<->` nearest-neighbor operator (spatial-indexed, fast even at scale) that accepts a lat/long and returns clients ordered by distance.

### 3.3 Capturing coordinates

- **New signups**: capture real coordinates at the point the business address is entered, via Google Places autocomplete if that's confirmed as the address input method (Section 3.1), or via a geocoding call otherwise.
- **Existing clients**: a one-time backfill job, geocoding every existing stored address in a batch, similar in shape to the Legacy Reactivation staged batch-send pattern already built in this codebase, don't build this from scratch as something new.

### 3.4 Getting the visitor's own location

1. Primary: the browser's Geolocation API, with a clear, honest permission prompt explaining why ("to show hustles near you").
2. Fallback if permission is denied or unavailable: Vercel's own edge network provides IP-based geolocation via request headers automatically, no third-party lookup service needed.
3. Final fallback: the existing city filter stays exactly as it is, a visitor who wants to just pick a city manually always can.

### 3.5 Marketplace UI

1. Add "Near Me" as a new sort option alongside the existing "Recently added" and "Most visited."
2. Show an approximate distance on each card once a location is available (for example "3.2 km away").
3. Decide, and confirm with Dewald before finalising, whether "Near Me" becomes the new default sort when a location is available, or stays an opt-in choice alongside the existing defaults. Worth a real decision, not a silent default.

**Acceptance criteria.** A visitor who allows location access sees Marketplace results genuinely sorted by real distance, closest first. A visitor who denies it still gets a reasonable IP-based approximation. A visitor with neither can still use the existing city filter, unaffected.

---

## 4. Out of Scope This Sprint

- Any WhatsApp Business number work, explicitly deferred until that number is verified and production ready.
- Cash voucher (1Voucher/OTT) payment support, deferred per the decision in Section 1's review, revisit only with real evidence of demand from users with no bank account at all.
- Any change to the confirmed Paystack-as-single-standard architecture principle.

---

*Once these three ship, particularly the Paystack channel confirmation on a real transaction per channel, bring results back before deciding what's next.*
