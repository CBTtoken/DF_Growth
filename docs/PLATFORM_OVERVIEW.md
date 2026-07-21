# DigitalFlyer Growth
## Functional Specification & Test Map

Updated 2026-07-18. Supersedes the 2026-07-17 version — adds the first three sprints of the new Booking & Shop modules (Section 25): real-time appointment/rental booking and a product catalog + cart, both live on Growth-and-above pages today with core functionality working (double-booking prevention, atomic stock control), though payment collection is still a manual arrangement between business and customer until Sprint 4 (Paystack Subaccounts) ships. Also reflects two other changes this cycle: the client dashboard (Section 9) is now organized into navigable tabs instead of one long scrolling page, and the Founding Business / "Day One Business" annual-plan offer has been discontinued and removed from every user-facing surface (it's no longer running, not merely hidden).

Prior update, 2026-07-17: adds four full feature areas built and verified live since 2026-07-15 — Legacy Reactivation (a real outreach campaign, not just a build), Rate & Review, List Your Event, and a dedicated SEO/search infrastructure pass. Also corrects two stale claims from that version (page-view tracking is live, not "not built"; the root domain now redirects to the `growth` subdomain, not just the subdomain alone). Production is `https://growth.digitalflyersa.co.za`, with `https://digitalflyersa.co.za` and `https://www.digitalflyersa.co.za` both live and redirecting to it.

A reference for walking through the complete built product — organized by *who's doing what* (prospect, applicant, live client, admin, reviewer, event organiser), not by build order.

---

## 1. What This Is

DigitalFlyer Growth is a growth-as-a-service platform for South African small businesses: a professional landing page, built and hosted for them, with lead capture, Meta ad tracking, and bundled access to the wider DigitalFlyer ecosystem (a real, searchable Marketplace directory, a public Rate & Review system, a free Events section, RE:Biz Nomads community). A business signs up (web or WhatsApp), answers a short guided flow, and gets a live page with no design or coding required.

---

## 2. Pricing Tiers

| Tier | Price | What's included | Payment |
|---|---|---|---|
| **Foundation** | Free 7 days, then R100/month or R900/year (annual option added 2026-07-19) | Business page, Marketplace listing, lead page, business profile, 1 digital asset/month, RE:Biz Nomads, BizUp | No card at signup — trial starts when onboarding finishes, converts automatically after 7 days. The billing cycle chosen at signup (`billing_cycle`) is the source of truth at charge time — the trial-conversion link reads it from the account, not from the URL |
| **Growth** | R180/month or R1,199/year | Everything in Foundation, plus campaign landing pages, performance tracking, marketing assets, monthly optimisation, growth reporting, Booking & Shop (Section 25) | Paystack, collected at the end of onboarding — **live mode, real transactions** |
| **Enterprise** | Coming soon | Full Meta + Google ad management | No live checkout yet |

**Founding Business / "Day One Business" offer has been discontinued.** It previously locked in the annual Growth price for life for the first 10 annual signups. Dewald made the call to end it now that the tier lineup and feature set are settled — removed from `/pricing`, the tier cards, the bottom CTA, and the WhatsApp onboarding copy. No live counter, no references anywhere a visitor can see.

Rate & Review and List Your Event (Sections 14–15) sit outside this tier structure entirely — reviewer accounts and event-organiser accounts are free, standalone, and open to anyone, not comped Growth memberships.

---

## 3. Entry Channels

**Web** — `/pricing` → pick a tier → guided onboarding wizard.

**WhatsApp** — message the DigitalFlyer SA WhatsApp number directly. No tier choice offered here; every WhatsApp signup goes to Growth (monthly or annual, asked in the chat). No free-trial path via WhatsApp.

Both channels write to the exact same `growth_clients` table (`signup_channel` records which one, visible in `/admin`) and go through the same Paystack checkout — a client's experience after signup is identical regardless of which door they came in.

---

## 4. Web Onboarding Journey

Foundation gets 7 steps, Growth/Enterprise get 9 (two extra: ad tracking setup, payment). Progress auto-saves after each step — closing the tab and logging back in later resumes exactly where they left off.

1. **Business Info** — business name, contact email, call number, WhatsApp number (can be the same or different numbers)
2. **Business Profile** — province, industry, address, city/town (a curated list of ~50 major South African cities/towns plus "Other," powers the Marketplace's city filter and List Your Event's city field), description, tagline, products/services, extra notes, Facebook/Instagram links, website URL
3. **Brand Kit** — primary/secondary color pickers (with live contrast-safety preview), logo upload
4. **Photos** — upload business photos (or pull stock photos by industry via Pexels), one can be set as the hero background
5. **Template** — visual picker across 10 real, live-rendered layouts (plus the original "Classic Conversion" layout as the default for pre-existing clients) — changeable any time later
6. **Landing Copy** — Claude drafts a headline/subheadline/about/services block from what's been captured so far; the client accepts it as-is or edits freely. Never invents facts not supplied (dates, awards, customer counts) — verified guardrail.
7. **Packages** — up to 3 optional packages/specials/discounts with name, price, description
8. *(Growth/Enterprise only)* **Ad Tracking** — "I already have a Meta Pixel/Ad Account" (enter IDs with format help) or "I need help" (flags for admin follow-up, page still goes live)
9. *(Growth/Enterprise only)* **Payment** — real Paystack checkout, redirects back once paid

Finishing triggers: page goes live, a Day-0 "your page is live" email, and (Foundation) the 7-day trial clock starts.

---

## 5. WhatsApp Onboarding Journey

A single back-and-forth conversation, same underlying data as the web flow, adapted for chat:

1. Business name
2. Contact email
3. Billing: reply 1 (monthly) or 2 (annual) — **account is created here**, invite email sent
4. Province → industry → address → description → tagline → products/services → notes (each its own message, optional ones skippable by replying "skip"). City is web-only for now — a WhatsApp signup can add their city later from the dashboard, same as template selection already works.
5. Brand color — numbered preset list (8 colors), not a hex code — a WhatsApp user typing a hex value reliably produces garbage, so this avoids that entirely. Secondary color always defaults to white.
6. Logo — send a photo, or skip
7. AI-drafted copy shown as text — reply YES to accept, or type replacement copy
8. Packages — one free-text message, or skip
9. **Payment link sent directly in the chat** (real Paystack link) — completing it activates the account exactly like the web flow

A conversation that goes idle and resumes later continues from the last completed step, no restart (keyed on Meta's Business-Scoped User ID, not phone number). Landing page template is always "Classic Conversion" for WhatsApp signups — changeable from the dashboard afterward.

---

## 6. Account Access & Auth

Real email+password login, with magic links as the account-creation and password-reset mechanism:

- **First login** (from an invite/signup email) lands on `/auth/callback`, which establishes the session and — if no password is set yet — routes to `/set-password` before anything else.
- **Return visits** use `/login` with email+password. If the account predates this rewrite (no password ever set), `/login` transparently falls back to sending a fresh magic link instead of failing.
- **Forgot password** (`/forgot-password` → `/reset-password`) is a standard reset-link flow, kept distinct from the first-time `/set-password` step.
- Every account-lifecycle email (invite, magic link, password reset, welcome) follows house style.
- **Multi-account switcher:** one login can own more than one `growth_client` account (e.g. a member with both a standard business page and a custom page like Standing 365 or RE:Biz Nomads). A small switcher on the dashboard (only visible once a login owns 2+ accounts) lets you jump between them, remembered via a cookie.
- **Standing pattern for every new account type built since (Rate & Review's reviewer accounts, List Your Event's organiser accounts): OTP-code email confirmation, not a clickable link.** Adopted after a real incident — Zoho Mail's automatic link-scanning was consuming single-use confirmation tokens before the real recipient ever clicked, silently breaking every clickable-link confirmation. A 6-digit code has no link for a scanner to consume. Every future account/verification flow on this platform should default to OTP unless there's a specific reason not to.

---

## 7. The Public Client Page (`/[slug]`)

What a visitor sees, varies by chosen template but always includes:

- **Hero** — business name, logo/initials, tagline, headline, CTA, social links (Facebook/Instagram/website icons)
- **About** — AI-drafted or client-written
- **Our Story** — the "additional notes" field shown verbatim, never AI-touched
- **Services** — checklist or plain list depending on template
- **Packages** — if any were added, with "Most Popular" highlight at exactly 3
- **Testimonials** — real ones the client has added
- **Photo Gallery** — if 2+ photos exist
- **Location** — address + embedded Google Map
- **Reviews** (new, Section 14) — star rating and count, expandable full review list, "leave a review" CTA — folded into the same per-template dynamic section-numbering every other section uses
- **Booking & Shop** (new, Section 25) — for Growth-and-above clients with either module switched on: a live availability calendar with a sticky checkout drawer, and/or a product grid with cart/checkout. Rendered unconditionally across every template (not template-curated content like Packages), gated purely on the client's own `booking_enabled`/`shop_enabled` flags.
- **Lead Form** — name/email/phone; on success reveals the business's own contact details as a faster option; triggers an email to the business owner and a Meta CAPI "Lead" event
- **Cookie consent banner** — equally-weighted Accept/Reject shown before the Meta Pixel fires; choice remembered 180 days
- **Footer** — "Manage this page" link back to the owner's dashboard, Privacy Policy, Terms, "Secure payment via Paystack" trust badge (accurate site-wide since real subscription billing runs through Paystack)

Every page also ships **`LocalBusiness` JSON-LD** (Section 16) and, once it has published reviews, **`AggregateRating`** folded into that same schema block. Rate-limited (5 submissions per 10 minutes per visitor) against lead-form spam.

---

## 8. Custom Pages — a Reusable Page Type

`landing_pages.page_type` (`template` vs `custom`) and `custom_page_key` let a member's page be a fully hand-built, freeform layout instead of the standard template system. Three real instances exist today:

### Standing 365 (`/standing365`)
A book's dedicated page — hero, about, 12-month framework, order flow, closing. Real order flow: Standard (R299 + R75 delivery, quantity selector) and Personalised (R385 + R75 delivery, recipient name + gift message) editions, one-time Paystack checkout, success/failure return banner, JSON-LD `Book` schema for SEO. **Seller-side order visibility**: any member on a `custom` page type gets an **Orders** section on their own dashboard.

### RE:Biz Nomads (`/rebiz`)
A membership-community page. Brand-blue hero band, a real contact form (reuses the same `LeadForm` every templated page already has), and links to both the private Deal Room and public Facebook groups.

### Buffelskop (`/buffelskop`)
A real client's premium product page (sundried chilli powder) — its own bulk-pricing and contact-request flow, unrelated to the generic Shop module.

**Booking now reaches custom pages too (2026-07-18):** custom pages render through their own component tree, separate from `ClientLandingPageView.tsx` — Booking data was being fetched but never actually threaded through, a real gap found when Dewald tested real booking slots on Standing 365 and nothing showed. `CustomPageProps` now carries `bookingEnabled`/`bookableUnits`/`bookingRules`; Standing 365 renders `BookingSection` with them (same no-op-until-switched-on gate as the standard template path), verified end-to-end against a real "Meeting requests" slot including real time-slot generation from its actual operating hours. RE:Biz Nomads and Buffelskop receive the same props but don't render Booking today — free to opt in later with no further plumbing needed.

All three prove the mechanism works for a real "member requests an additional custom page" feature — see Backlog for the remaining architecture work (today one member = one routable page; true dual-page support per member isn't built yet).

---

## 9. The Client Dashboard (`/dashboard`)

**Organized into navigable tabs, not one long scrolling page.** `DashboardTabs.tsx` is a lightweight client-side tab wrapper (local `useState`, no URL/hash routing) — every section below is the exact same component as before, just grouped into tabs instead of stacked sequentially. Built this cycle after the page had grown to ~15 sequential sections and become hard to navigate.

- **Header** — View your page, Edit your page, Log out
- **Account switcher** — only visible once a login owns 2+ `growth_client` accounts; see Section 6

**Overview tab** — Profile completeness banner (nudges toward missing description/address/photos), Page-view analytics (total views plus a 7-day daily breakdown, own dedicated card).

**Your Page tab** — Change template (swap any time, live preview first), Photo gallery (upload or Pexels search, set hero photo).

**Booking & Shop tab** *(Growth-and-above, only shown once either module is switched on — Section 25)* — Booking setup (bookable units, operational rules, calendar view) and/or Shop inventory (product/coupon CRUD, single or CSV bulk upload), both surfaced here rather than as a 16th flat section.

**Reviews & Testimonials tab** — Reviews (Section 14): every review left on the member's page including flagged ones, reply publicly once (editable after), flag a review for admin review without being able to delete or edit it directly. Testimonials: add one, auto-generates a shareable social image. Leads: every lead-form submission, name/email/phone/timestamp. Orders *(custom pages only, e.g. Standing 365, RE:Biz)*: buyer/delivery/personalisation detail, batch + fulfilment tracking.

**Marketing tab** — Meta ad tracking *(Growth/Enterprise)*: paste Pixel/Ad Account IDs, encrypted token entry, recent CAPI delivery status. Search & ad platform verification: Google Search Console / Facebook domain verification meta tags. Asset style + Generate social assets: pick the default visual style, pick a content type and a gallery photo, generates a downloadable branded image.

**Account tab** — Your Package (account/plan): current tier, features included, upgrade/cancel. Platform Features: shows what a higher tier unlocks, even if locked. Also available to you: Marketplace, Events (list a free event with the same login, Section 15), and RE:Biz Nomads.

`/dashboard/edit` mirrors the core onboarding fields as standalone editable cards — every save is live immediately, no publish step.

---

## 10. Marketplace Directory (`/marketplace`)

A real, browsable, searchable directory of every published, active member page.

- **Search box** — matches business name, tagline, and description.
- **Industry filter** — reuses the same fixed taxonomy as onboarding.
- **City filter** — the full curated city list.
- **Sort** — "Recently added" (default), "Most visited" (ranking by real `page_views` data, Section 9, batched per client rather than N+1 queried), or "Near me" (added 2026-07-21). "Near me" is **opt-in only** — picking it triggers the browser's location permission prompt (never on page load); if denied or unavailable it falls back to Vercel's IP-geolocation request headers, and if neither resolves it silently no-ops (existing filters unaffected). Results reorder nearest-first with a real distance badge per card ("3.2 km away"); businesses without stored coordinates keep their order at the end rather than disappearing. Backed by PostGIS: a `geography(point)` column on `growth_clients` with a GIST spatial index and a `nearest_active_clients()` SQL function using the `<->` nearest-neighbor operator. Coordinates are captured at write time by geocoding the business address via OpenStreetMap Nominatim (free, no API key — no new paid Places dependency) on both onboarding paths (web wizard Step 2 and WhatsApp), two-tier: full address first, city-centroid fallback, with a placeholder guard so entries like "Online" or digits-only never mis-place a business. Existing clients were backfilled the same way (26 of 37 active clients got coordinates; the rest have no usable address or city on record).
- **Cards** — redesigned from an earlier flat-colour-block layout to a text-forward, Google-Business-Profile-style card (icon/name/category doing the work, not a colour standing in for content) after real feedback that a wall of colour blocks read as dull and repetitive. Shows a real photo thumbnail when one exists (same resolution order as the real page: explicit hero selection, then first gallery photo), or the text-forward fallback otherwise. A small `★ 4.5 (12)` ratings badge appears once a business has at least one published review (Section 14) — omitted entirely rather than showing a zero score.
- **Cross-links to Events** — a "Browse Events instead" link in the search hero, now a cross-sell rather than a mobile-reachability workaround, since the real mobile nav menu (Section 23) covers that.
- Linked from the main site header (desktop) and every page footer.

**Real data bug found and fixed live this cycle:** a batch of industry-taxonomy corrections applied via manual REST calls accidentally left literal `%20`/`%26` URL-encoding in several businesses' `industry` values, silently breaking their Marketplace filter matching. Caught and corrected; worth remembering as a general lesson — any manual data-correction pass over this table needs to verify the actual stored bytes, not just that the request returned success.

---

## 11. Admin Panel (`/admin`)

Allowlisted by email (`ADMIN_EMAILS`), no separate role system. Lists every client with plan/status/Meta-connection state and signup channel (Web/WhatsApp), a highlighted "needs Meta setup help" queue, per-client detail pages, and CSV export.

**Danger Zone**, on each client's detail page (`/admin/clients/[id]`): deactivate/reactivate (reversible), delete permanently (cascades through every related table, confirmed with a browser prompt).

**New admin surfaces this cycle:**
- **Reactivation Batch** (`/admin/reactivation`) — visibility into the Legacy Reactivation outreach campaign (Section 13): per-business address-verification status, send status, bounce/complaint flags.
- **Flagged Reviews** (`/admin/reviews`) — the Rate & Review moderation queue (Section 14), with a flagged-count badge on the main admin nav matching the existing Support-inbox badge pattern.
- **Events Queue** (`/admin/events`) — List Your Event's own moderation queue (Section 15), same badge pattern.

---

## 12. Ecosystem Access

- **DigitalFlyer SA Marketplace** — automatic inclusion for every paid membership, real browsable directory (Section 10).
- **RE:Biz Nomads** — free, bundled, one click to a live private Facebook group, plus its own dedicated info page. No payment gate anywhere in this flow (audited).
- **BizUp** — bundled feature line on every tier; the standalone product itself is a separate future build (its own repo/Supabase project, per the ecosystem's federated architecture) — not part of Growth's own codebase. A cross-project spec-alignment pass (correcting BizUp's own build spec to match the actual Phase 1 federated architecture, and registering it in the ecosystem's master doc) was scoped in an earlier planning session but hasn't been started — see Backlog.

---

## 13. Legacy Reactivation (Outreach Campaign)

Not a member-facing feature — an admin-run campaign to re-invite a specific list of pre-existing South African small businesses (candidates gathered before this platform existed) onto Growth, free of charge to run, using real infrastructure built this cycle:

- **Address verification pass** — syntax check plus a real MX-record lookup per candidate email, using DNS-over-HTTPS (raw DNS lookups are blocked in some sandboxed environments this project has been built in, DoH avoids that entirely and is the safer default going forward for any future email-validation work).
- **Bounce/complaint webhook handling** — a dedicated endpoint marks a candidate as suppressed on a real bounce or spam complaint, so no further sends ever go to that address.
- **Staged batch-send script** — sends in small batches with a pause threshold, rather than one uncontrolled blast, so a real problem (a bad batch, an unexpected bounce spike) is caught early rather than after every recipient has already been emailed.
- **Real unsubscribe link**, honored by the suppression list the same way a bounce is.
- **Admin Reactivation Batch view** (`/admin/reactivation`, Section 11) — per-business status visibility for the whole pipeline.
- **Runbook** — `docs/GROWTH_LEGACY_REACTIVATION_RUNBOOK.md` documents the full manual process for running a future batch.

**Real result, not just a build:** 30 of 31 verified candidate businesses received a real invitation email, with a 0% bounce/complaint rate on the actual send. The remaining 1 was excluded by the address-verification pass before sending.

**Real bug found and fixed before the live send:** a set of manual industry-taxonomy corrections applied to 7 reactivation businesses left literal `%20`/`%26` URL-encoding in the database (same class of bug as Section 10's Marketplace fix) — caught and corrected before any email went out referencing that data.

---

## 14. Rate & Review

A public star-rating and review system on every business's page, built around the same OTP-first account philosophy as the rest of this cycle's new account types.

**Account model** — `reviewer_accounts`, a genuinely new, lightweight account type separate from `growth_clients`, keyed directly on `auth.uid()`. Signup is email + password + a 6-digit OTP code (no clickable link — see Section 6). One review per verified account per business.

**Public display** — star rating and total count visible immediately, no click required; "no reviews yet" state never renders as a zero score. Expandable full review list, most recent first, showing the reviewer's first name only (never full name or email). Folded into the per-template dynamic section-numbering system, same as every other section (Section 7) — always present, since a business with zero reviews still needs the "be the first" call-to-action.

**Submission** — Cloudflare Turnstile on the form, verified server-side against Cloudflare's own `siteverify` endpoint (never trusting the client-produced token alone). New reviewer and returning reviewer share one combined signup-or-login-and-review flow — leaving a review is the actual user journey, account creation/login is incidental to that.

**Business dashboard** (Section 9) — a business owner can reply publicly to any review once (editable after posting), and can flag a review for admin review, but can never delete or edit one directly — a human admin makes the actual removal call.

**Fraud signals** (checked at submission, flag for admin review, never auto-block):
1. Reviewer's email domain matches the business owner's own contact-email domain (excluding common public webmail providers, where a match is meaningless).
2. The same hashed device/network fingerprint (a SHA-256 hash of the submitting IP — never the raw address stored) has already left a review for this same business under a different account.
3. Unusual review velocity — 5+ reviews on one business inside a 15-minute window.

Flagging is modeled as state *orthogonal* to publication status, not a status transition — a flagged review stays publicly visible until an admin actually removes it. This was a deliberate design correction: if flagging had hidden a review immediately, a business could unilaterally unpublish any review just by flagging it, which is exactly the removal power the spec explicitly says businesses must never have.

**Admin moderation queue** (`/admin/reviews`, Section 11) — every flagged review (business-flagged or system-flagged) lands here for a human decision: keep/dismiss the flag, or remove the review permanently.

**SEO** — `AggregateRating` folded into each business's existing `LocalBusiness` JSON-LD once it has published reviews (Section 16), the mechanism Google uses to show star ratings directly in search results.

---

## 15. List Your Event

A genuinely free, standalone Events section — anyone, not just existing Growth members, can list an event, no cost, ever, not a funnel into a paid tier. Sits alongside the Marketplace directory.

**Account model** — `event_organizers`, mirroring `reviewer_accounts`' shape: free signup (email + password + OTP), or an existing Growth business owner can list an event through their existing login with zero extra steps — an `event_organizers` row is created transparently on first use, keyed to their existing session.

**Submission form** (`/events/new`) — event name, type (workshop/market/community/fundraiser/sports/arts & culture/other), description, start date+time (required) and end date+time (optional — a single event can span multiple days this way, confirmed working via real UAT), location (city + optional address), up to 5 photos, contact details (person's name, email, phone, WhatsApp), social links, a plain-text ticket-info field, and an optional booking-link URL shown as a "Book now" button. Cloudflare Turnstile on every submission path (new organiser, returning organiser, logged-in Growth business owner), verified server-side.

**Spam/quality gate (Sprint 2)** — a lightweight system check at submission time (URLs in the event name, 3+ URLs in the description, excessive repeated characters, a small keyword blocklist, or a thin listing with no description and no photos) routes a flagged submission to `status = 'pending_review'` instead of publishing immediately, with `flagged_by = 'system'` and a reason recorded. This is different from Rate & Review's flagging model on purpose: a review that's already been publicly visible must never be unilaterally hidden by the business it's about, so flagging there is orthogonal to publication status — but a brand-new event that's never been seen by anyone yet costs nothing to hold for a quick human check, so flagging it *does* gate publication here.

**Public Events section** (`/events`) — search, city filter, event-type filter, sorted soonest first. Past events automatically drop out of the browse view once their date (or end date, for multi-day events) passes, retained in the database rather than deleted. A daily GitHub Actions cron job (`expire-events.yml`) formally transitions past published events to `status = 'expired'` — purely data tidiness, since the browse page's own query filter already hides them regardless.

**Individual event pages** (`/events/[id]`) — dedicated, shareable, with `Event` JSON-LD structured data (name, start/end date, location, description) so Google can render date and location directly in search results for queries like "markets this weekend in [city]." The header uses a letterbox banner treatment when a photo exists — the real image always shown in full via `object-contain`, backed by a blurred/darkened copy of itself filling the rest of the frame (the same technique Spotify/YouTube use for an arbitrary user image that has to become a banner) — and a safe text-only header when there isn't one. This replaced an earlier `object-cover` crop that mangled non-landscape images (a real UAT test using a promotional graphic lost its own text to the crop). A collapsed "Report this event" link lets any visitor flag an already-published event (`flagged_by = 'public'`) without changing its status — the same orthogonal-flag pattern as Rate & Review, since this event has already been seen publicly.

**Admin moderation queue** (`/admin/events`, Section 11) — two sections: pending-review submissions (publish or remove) and flagged-but-published events (keep/dismiss the flag, or remove), same pattern as Rate & Review's `/admin/reviews`.

Full field-by-field spec: `docs/GROWTH_LIST_YOUR_EVENT_BUILD_SPEC_CLAUDE.md`.

---

## 16. SEO & Search Infrastructure

A dedicated pass this cycle, on top of what already existed per-page:

- **`/sitemap.xml`** — dynamic, lists every active client page and every still-upcoming published event, regenerated per request.
- **`/robots.txt`** — already existed, confirmed correct.
- **Google Search Console verification** — verification file served at the site root.
- **Google Analytics (GA4)** — installed via `next/script` with `afterInteractive` (the officially recommended Next.js pattern), gated on an env var so it's a safe no-op until configured, matching how every other third-party script on this site loads.
- **Client page titles** — corrected from a bare business name to `{Business Name} | {Industry} in {City}`, giving Google real context for unbranded local search instead of relying entirely on the site-wide title template.
- **`LocalBusiness` JSON-LD** — `@type` mapped from the business's actual industry to a specific Schema.org subtype (e.g. `HomeAndConstructionBusiness`, `FoodEstablishment`) via the existing industry taxonomy, rather than the generic `LocalBusiness` fallback every page previously shipped regardless of what kind of business it was. Gains `AggregateRating` once a business has published reviews (Section 14).
- **`Event` JSON-LD** on every individual event page (Section 15).

**Real CSP bugs found and fixed live during this pass** (a recurring class of bug this project has now hit three times — Turnstile, Google Analytics, and earlier the Google Maps embed): a strict Content-Security-Policy silently blocks any new third-party script with zero console error and zero network request, extremely hard to diagnose without directly reading the CSP config. Any future third-party script addition should check `next.config.ts`'s `cspDirectives` function first, not last.

**Real incident, found and fixed via a real UAT test, not caught in review:** `NEXT_PUBLIC_TURNSTILE_SITE_KEY` was set locally but never actually added to Vercel's Production environment — since this class of variable is baked into the client bundle at build time, the Turnstile widget silently never rendered for any real visitor in production (confirmed: the widget's own `render()` call throws when given `undefined` as a site key). Fixed by adding the variable to Vercel and redeploying; verified via a real end-to-end review submission afterward. Worth remembering as a general lesson: a `NEXT_PUBLIC_`-prefixed variable existing in `.env.local` proves nothing about whether it's actually live — always confirm directly against the deployed site, not just against local config.

---

## 17. Automated Emails

| Trigger | Email |
|---|---|
| Account created (web or WhatsApp) | Supabase Auth invite — sets up login |
| Returning user, no password set | Magic sign-in link (fallback from `/login`) |
| Password reset requested | Reset-password link |
| Onboarding finished, page goes live | "Your page is live!" welcome |
| Foundation trial, 2 days left | Reminder + convert-to-paid link |
| Foundation trial expired, no payment | "Trial ended, page paused" + reactivate link |
| Signed up 3-4 days ago, still incomplete/thin | Nudge to finish onboarding |
| New lead on a client's page | Notification to the business owner |
| Order placed / batch assigned / shipped (Standing 365, RE:Biz) | Order confirmation, then two fulfilment-status emails |
| Reviewer/event-organiser signup | 6-digit OTP code (not a link — Section 6) |
| Legacy Reactivation invite | Real one-time outreach send (Section 13) |

All copy follows house style: "DigitalFlyer SA," no em dashes, "Good day {name}," not "Hi there."

---

## 18. Security & Production Hardening

- **RLS coverage audit** across every table, including the new Rate & Review and List Your Event tables — every new table's RLS was paired with an explicit `grant` to `service_role` in the same migration that created it, a lesson learned the hard way earlier in this project (RLS being enabled doesn't grant service-role access on its own).
- **Server-side authorization audit** — every mutation re-checked for IDOR.
- Security headers + Content-Security-Policy sitewide, with narrowly-scoped exceptions for same-origin preview iframes, the Google Maps embed, Cloudflare Turnstile, and Google Analytics/Tag Manager (Section 16).
- Rate limiting on every public write surface, including the new review-submission, reviewer-login, event-submission, and event-organiser-OTP endpoints.
- `npm audit` wired into CI, fails the build on high/critical findings.
- Real bug found and fixed live: a Server Component page passed an `onChange` handler to a form element — fixed before most users would have hit it.
- **Host-header-injection near-miss, caught before it shipped:** an early attempt to fix an unreliable `NEXT_PUBLIC_SITE_URL` by deriving a redirect origin from the `Host`/`X-Forwarded-Host` request headers was reverted before merging — those headers are attacker-controllable, so any future auth-critical redirect URL must be hardcoded or otherwise validated, never read from a request header.

---

## 19. Go-Live Status

**Paystack is live.** Live secret/public keys, live subscription plans, and the live webhook URL are all configured and verified.

Not yet live-mode: Enterprise's Paystack plan (no live checkout button exists for it yet).

**Domain, resolved this cycle:** `growth.digitalflyersa.co.za` plus the root `digitalflyersa.co.za` and `www.digitalflyersa.co.za` (both redirecting to the `growth` subdomain) are all live, correctly configured in Vercel, and DNS-verified. This took real back-and-forth to land — old conflicting A/CNAME records at the DNS host, and Xneelo's own DNS servers requiring a trailing dot on CNAME target values that the earlier attempt omitted, were both found and corrected.

**Correction to an earlier version of this doc:** `NEXT_PUBLIC_WHATSAPP_NUMBER` was previously logged here as a "missing env var, just needs Vercel + redeploy" gap. That was wrong on investigation. The real state: RE:Biz Nomads never should have had a WhatsApp "join" CTA at all — membership comes bundled with a paid Growth/Foundation plan, not a separate WhatsApp inquiry, and its signup page has now been fixed to match `Closing.tsx`'s existing `/pricing` link. Separately, `PlatformFeatures.tsx` already moved off this env var to a `mailto:` fallback, because the actual blocker there is that DigitalFlyer's own WhatsApp Business number is still pending Meta's approval — not a missing config step. No outstanding WhatsApp CTA gap remains.

**Hosting plan tier, checked 2026-07-18:** Supabase is on the Free plan — checked directly, real usage is nowhere near any real ceiling (Database 29MB/500MB, Storage 3MB/1GB, Egress 78MB), no urgency to upgrade on capacity grounds. **Vercel is currently on the Hobby plan**, whose terms of service restrict it to personal, non-commercial projects — this app processes real Paystack transactions and real customer data, which makes it commercial by any definition, and Vercel does monitor for and can suspend a Hobby project it flags as commercial use. This is a compliance risk, not a capacity one (every Vercel usage metric checked was under ~11% of its Hobby-tier limit). Dewald confirmed he'll upgrade to Vercel Pro.

---

## 20. Behind the Scenes (not visible, but worth knowing during testing)

- **Rate limiting** — in-memory, resets on a cold server start — fine at current scale, not a distributed guarantee.
- **Meta Pixel consent** — never fires before explicit Accept.
- **Idempotency** — every Paystack webhook branch keyed on transaction reference, not business name.
- **Founding-slot / concurrency safety** — stress-tested, 30 concurrent same-name signups all succeed with unique slugs.
- **Automated backups** — weekly full database dump via GitHub Actions, independent of Supabase's own plan tier.
- **Automated cron jobs** (GitHub Actions, not Vercel Cron) — daily trial reminders, daily onboarding nudges, weekly backup.
- **DNS-over-HTTPS, not raw DNS lookups, for any server-side domain/email validation** — raw DNS is blocked in at least one environment this project has been built in; DoH avoids the whole class of failure and should be the default for any future work needing it (Section 13's address-verification pass already does this correctly).

---

## 21. Known Limitations / Explicitly Out of Scope

- Enterprise tier has no live checkout yet.
- Full Facebook Page OAuth connection — needs Meta App Review, not buildable yet.
- Google Ads management — entirely unscoped, everything built so far is Meta-only.
- **Client-page cache-MISS latency, root cause found and partially fixed (2026-07-18)** — corrects the earlier "root cause not found, parked" note on this line. Profiled live on production: every client page ([clientSlug]) took ~1.7-1.8s TTFB on a cache miss (`X-Vercel-Cache: MISS`), the real driver behind the "~2.3s warm LCP" number. Root cause: the actual critical path had 4 sequential Supabase round trips, not 1 — `generateMetadata` and the page component each ran their own client lookup, and `ClientLandingPageView.tsx` plus `ReviewsSection.tsx` each ran a separate reviews query on top of that for overlapping data. Collapsed into one embedded Postgrest query per function; measured before/after on production: **~1.7-1.8s → ~1.0-1.2s** on a genuine miss, roughly 35-40% faster. A cache HIT was already fast (~100-150ms) and is unaffected. **Fully closed 2026-07-19:** the remaining live Pexels call inside the render path was moved to write time — a `fallback_photo_url` column on `growth_clients` is populated once at onboarding save (web + WhatsApp), the render path just reads it, and all existing clients were backfilled.
- **Uptime monitoring** — confirmed live via UptimeRobot (corrects earlier versions of this doc, which said this was unconfirmed).
- **Error monitoring** (Sentry) — the code is fully wired (`src/sentry.server.config.ts`, `src/sentry.edge.config.ts`, `src/instrumentation-client.ts`, `withSentryConfig` in `next.config.ts`) but was never activated — `NEXT_PUBLIC_SENTRY_DSN` has no real value set, so `Sentry.init()` safely no-ops on every request, same "ships dark, activates on a real credential" pattern GA4 already uses. Corrects earlier versions of this doc, which said this "still not built" — it's built, just not switched on.
- Meta ad-asset size/spec compliance for generated social images not yet verified against real campaign requirements.
- The 3 "See It In Action" pages on `/pricing` are honestly-labeled sample businesses, not real clients.
- One member = one routable page today — Standing 365 and RE:Biz Nomads prove the custom-page mechanism, not dual-page-per-member support.
- **Recurring / multi-session events** — a single multi-day event works today; multiple distinct sessions across different days/times for one listing would need a real recurring-event model, not scoped.
- **BizUp ecosystem spec alignment** — a cross-project documentation-correction pass was scoped in an earlier planning session (correcting BizUp's own build spec to match the real federated Phase 1 architecture) but never started.
- **Booking & Shop payment collection is still manual** (Section 25) — a booking or order confirms immediately, but the business and customer arrange payment directly between themselves; in-page Paystack Subaccount checkout is Sprint 4, not yet built.
- **Booking & Shop have no live courier shipping** (Section 25) — Shop orders are collection/self-arranged delivery only; real Bob Go rate quoting and waybill generation is Sprint 5, blocked on Dewald signing up for a real Bob Go account.
- **Booking & Shop have no WhatsApp notifications yet** (Section 25) — booking reminders and CANCEL/RESCHEDULE-by-WhatsApp are Sprint 6, not yet built.

---

## 22. Backlog — Candidates For The Next Build

Re-ordered to reflect what's actually still open after this cycle's work.

1. **Activate Sentry.** Uptime monitoring is confirmed live (UptimeRobot). Error monitoring's code is already fully wired and shipping dark — just needs a real `NEXT_PUBLIC_SENTRY_DSN` (and `SENTRY_ORG`/`SENTRY_PROJECT`/`SENTRY_AUTH_TOKEN` for readable stack traces) from a Sentry account Dewald creates.
2. **BizUp ecosystem spec alignment.** Correct BizUp's own build spec to match the real Phase 1 federated architecture and register it in the ecosystem's master doc — pure documentation/schema work, no live testing needed, already scoped in an earlier planning session.
3. **Main page + additional custom page architecture.** Today a member has exactly one routable page. Standing 365 and RE:Biz Nomads proved the custom-page mechanism works, but true dual-page support per member needs real routing-layer work, not yet designed.
4. **Enterprise tier live checkout.** Pricing card already exists ("Coming soon"); needs the actual plan, checkout wiring, and feature scope defined.
5. **Real "See It In Action" sample pages.** Swap the 3 honestly-labeled placeholder businesses on `/pricing` for real, permission-granted client pages.
6. **Meta ad-asset spec compliance pass.** Verify generated social images actually meet Meta's real campaign size/format requirements.
7. **Mobile performance root-cause.** The ~2.3s warm LCP on throttled mobile was parked without a root cause.
8. **Booking & Shop, Sprints 4-7 (Section 25).** Paystack Subaccount payment integration, live Bob Go courier shipping (blocked on Dewald's own Bob Go account signup), WhatsApp notifications/reminders, and the full production-readiness checklist — the core booking/shop mechanics (double-booking prevention, atomic stock control) are already live; these sprints add real payment and shipping on top.

---

## 23. Recommended UI/UX Improvements

Grounded in real friction points and patterns actually observed while building this cycle, not a generic wishlist.

1. ~~The mobile header nav is quietly dropping a whole section.~~ **Done.** `MobileNavMenu.tsx` replaced the pattern of hiding each new nav item (first Marketplace, then Events) with a real hamburger menu — Marketplace, Events, and Log in/Dashboard all reachable on mobile now, with "See pricing" staying always-visible outside the menu as the one CTA worth never hiding.
2. **Three near-identical OTP entry screens now exist** (reviewer signup, event-organiser signup, and the pattern is likely to repeat for any future account type), each hand-built inside its own form component with duplicated markup and copy. Worth factoring into one shared `OtpEntryForm` component before a fourth one gets built — guarantees consistent copy/behaviour and removes the duplication.
3. **No cross-visibility between a person's different account types.** A visitor can now be a Growth business owner, a reviewer, and an event organiser, all under the same email, but each is a fully separate silo today (separate account tables, no shared "my activity" view). Not urgent, but worth a lightweight "you're also a reviewer/organiser" surface somewhere (e.g. the dashboard) as more of these account types accumulate, so the "one login system across the platform" pitch is actually visible to the person experiencing it, not just true in the schema.
4. ~~Reviews and page-view analytics aren't surfaced anywhere outside the individual dashboard yet.~~ **Done.** Marketplace cards now show a ratings badge once a business has published reviews (Section 14), and a "Most visited" sort option uses real `page_views` data (Section 9/10).
5. **The letterbox banner treatment built for List Your Event (Section 15) should be the house default, not a one-off.** Any future feature that needs to turn an arbitrary user-uploaded photo into a full-width banner will hit the exact same problem List Your Event's first version did (an `object-cover` crop mangling non-landscape images) unless it deliberately reaches for the same blurred-backdrop-plus-`object-contain` pattern. Worth extracting into a shared component the next time this need comes up, rather than re-solving it from scratch.
6. **Loading states across the newer forms are text-only** ("Publishing…", "Submitting…" on the button itself) with no skeleton or spinner treatment. Fine at current scale and consistent with the rest of the platform, but worth a shared lightweight spinner component if the number of long-running form submissions keeps growing.

---

## 24. Suggested Test Checklist

- [ ] Web signup, Foundation (no card, 7-day trial)
- [ ] Web signup, Growth monthly — **real live payment**
- [ ] Web signup, Growth annual
- [ ] Full onboarding wizard, every step, including skipping every optional field, including city
- [ ] Template switch, before and after publishing
- [ ] WhatsApp signup, full conversation, real message
- [ ] Lead form submission on a live client page → check dashboard + owner email
- [ ] Cookie consent banner — Accept vs Reject, confirm Pixel network activity differs
- [ ] Dashboard: photo upload, testimonial add, social asset generation, template change
- [ ] Edit-your-page live-save behavior, including city
- [ ] Trial-to-paid conversion link
- [ ] Cancel / upgrade flow
- [ ] Admin panel: client list, CSV export, "needs Meta help" flag, signup channel column
- [ ] Admin Danger Zone: deactivate a test page, confirm it 404s and drops off the Marketplace, reactivate, confirm it returns
- [ ] Marketplace: search, industry filter, city filter, clear filters, photo thumbnails render correctly
- [ ] Account switcher: an account with 2+ growth_client logins can switch between them from the dashboard
- [ ] Standing 365: order flow (both editions, quantity), return banner, dashboard Orders visibility, batch/shipped emails
- [ ] RE:Biz Nomads: contact form submission, both Facebook group links
- [ ] Login: email+password, forgot-password reset, first-time set-password
- [ ] **Rate & Review: leave a review as a new reviewer (real Turnstile solve, real OTP code), as a returning reviewer, as an already-logged-in business owner; business reply; business flag action; admin moderation queue keep/remove**
- [ ] **List Your Event: submit an event as a new organiser, existing organiser, and already-logged-in business owner; browse/search/filter; individual event page with photos (confirm letterbox banner, not a crop); event with no photos (confirm text-only header)**
- [ ] **Booking: book a slot on a client page, confirm it disappears from availability immediately, confirm two simultaneous attempts on the same slot can't both succeed; dashboard calendar/setup; SAST time display correct regardless of visitor's own timezone**
- [ ] **Shop: add to cart, checkout, confirm stock decrements and can't go negative under a simulated concurrent purchase; CSV bulk upload with a deliberately malformed row (confirm per-row error, valid rows still import); coupon apply**
- [ ] **Dashboard tabs: every tab loads its existing content correctly, Booking & Shop tab only appears once a module is enabled for that client**
- [ ] Mobile pass on every screen above, including the header on narrow viewports

---

## 25. Booking & Shop Modules

Two optional, revenue-bearing capabilities for Growth-tier-and-above clients, each living primarily on a single client's own page. Full build spec: `docs/GROWTH_BOOKING_SHOP_MODULES_CLAUDE.md`.

**Growth-tier gating, made explicit (2026-07-18):** Booking & Shop are listed as a named Growth-tier feature ("Booking & Shop Tools") on the `/pricing` Growth card, not Foundation's — previously the two modules were only described in a separate section below the pricing cards, without making clear which tier actually included them. A Foundation client still sees the "Booking & Shop" dashboard tab (so the feature is discoverable, not hidden), but it renders a locked upsell card (`BookingShopUpsell.tsx`) with an "Upgrade To Growth" CTA instead of the real tool, reusing the same pattern `PlatformFeatures.tsx` already established for Enterprise-only features.

**Cross-client Shop directory (`/shop`), added 2026-07-18:** a real public page, "Shop Now," listing products from every Growth client with Shop switched on and their account active — search by title/description, card grid, each card linking to `#shop` on that client's own page (checkout still happens there, this page is discovery only, same relationship Marketplace has to individual client pages). This is the smaller of two things once flagged as a separate future product ("Stoep Marketplace" — a fully independent cross-client storefront with its own checkout) — that bigger version remains unbuilt and is not what this page is. Linked from the header (desktop + mobile menu) and footer next to Marketplace, with a cross-link from `/marketplace` and vice versa. A **Featured** section above the real product grid carries one hardcoded entry today — Standing 365 (Section 8) — linking straight to its own real, working order flow rather than being migrated onto the generic Shop system, a deliberate choice: Standing 365's checkout already handles live payment and edition-specific fields (recipient name, gift message) the generic Shop module doesn't have, so duplicating it as a `shop_products` row would trade a working checkout for a currently-unpaid stub one for no real benefit. No client has Shop switched on with real products yet, so this page is correctly empty of real listings at the time of writing — verified live with a temporary throwaway product.

**Booking** — a real-time appointment/rental/capacity-slot calendar. A business owner defines bookable units (e.g. a chair, a room, a rental item) and operational rules (hours, price overrides) from the dashboard; visitors see live availability on the public page and place a hold directly, no back-and-forth messaging. Double-booking on a mutually-exclusive resource is blocked at the database level with a Postgres exclusion constraint (`btree_gist` on the reservation's time range) — a slot someone else just took can never be booked by a second person, verified live under a real concurrent-hold race test. Capacity-type units (allowed to overlap up to a set number of simultaneous bookings) are checked in application code instead, a deliberate, lower-severity exception. Hold expiry (10 minutes) is enforced actively at both the availability-read and hold-creation steps, not just by a cron sweep, so correctness never depends on cron timing landing on schedule. Also reaches custom pages now, not just the standard template path (Section 8). **Heading/CTA copy is type-aware (2026-07-18)**, not a hardcoded "Book Now": a time-slot appointment reads "Book Now" / "Confirm Booking", a day/night rental reads "Check Availability" / "Reserve Your Stay", a capacity-limited unit reads "Reserve Your Spot" / "Reserve Now" — follows whichever unit the visitor has selected, since one client can mix unit types.

**Shop** — a product catalog and cart. Products are added one at a time or via CSV bulk upload (with per-row error reporting so one bad row doesn't block the rest), each with a single default variant for now — full size/colour variant-picker UI was a deliberate scope reduction, flagged rather than silently dropped. Stock is decremented atomically via a dedicated Postgres RPC function (`decrement_variant_stock`) rather than a read-then-write pair, so two simultaneous purchases of the last unit can never both succeed — this is the codebase's first-ever use of a real Postgres function, needed because supabase-js's plain `.update()` can't reference a column's own current value in its SET clause.

**What's shipped (Sprints 1-3):** schema + RLS, the core booking flow (availability, holds, dashboard setup/calendar), and the core shop flow (CSV upload, product/coupon CRUD, cart/checkout, atomic stock). Both render on the public client page (Section 7) and have their own dashboard tab (Section 9), gated on the client's own `booking_enabled`/`shop_enabled` flags — Growth tier and above only.

**What's not yet built (Sprints 4-7, see Backlog):**
- **Payment** — a booking or order confirms immediately as `unpaid`; the business and customer arrange payment directly today. Real in-page Paystack Subaccount checkout (so funds route to the client's own bank account, not DigitalFlyer's) is Sprint 4. **Design decisions locked in with Dewald (2026-07-18), ready to build:** self-serve connection from the client's own dashboard (same trust level as every other money flow in this app, no admin approval step) — a business enters their bank account + branch code, Paystack's own Resolve Account Number API shows the real account holder name back before submitting as the fraud guard; and DigitalFlyer takes **no commission** on Booking/Shop sales — it's bundled into the Growth subscription, the business keeps 100% minus only Paystack's own standard processing fee.
- **Live courier shipping** — Shop orders are collection/self-arranged delivery only. Real Bob Go rate quoting, order sync, and waybill generation is Sprint 5, blocked on Dewald signing up for a real Bob Go account to get API keys (no public pricing exists to plan against without one).
- **WhatsApp notifications** — booking reminders and CANCEL/RESCHEDULE handled by WhatsApp reply are Sprint 6.
- **Production readiness pass** — Sprint 7: liability/cancellation disclosures before payment collection begins, full test-mode walkthrough against a real Paystack Subaccount and Bob Go sandbox account before either module goes live to a real paying client.

---

## 26. Technical Foundation (brief, for context)

- **Frontend/backend:** Next.js (App Router), deployed on Vercel
- **Database/auth/storage:** Supabase (Postgres, email+password + magic-link + OTP auth, file storage for logos/photos/generated assets/event photos)
- **Payments:** Paystack — **live mode** — subscriptions (self-serve cancel/upgrade) and one-time checkout (custom-page orders), both webhook-driven. Booking/Shop payment collection is still manual pending Sprint 4 (Section 25).
- **AI:** Anthropic Claude, drafts landing page copy during onboarding (web and WhatsApp)
- **Ad tracking:** Meta Conversions API (server-side, encrypted token) plus a consent-gated client-side Meta Pixel
- **Bot protection:** Cloudflare Turnstile (Rate & Review and, from Sprint 2, List Your Event)
- **Messaging:** Meta WhatsApp Cloud API, signed webhook, conversation state in `whatsapp_conversations`
- **Images:** Pexels API as an industry-matched stock photo fallback when a client hasn't uploaded their own
- **Analytics:** Google Analytics (GA4), plus first-party page-view tracking in `page_views`
- **Automation:** GitHub Actions for trial-expiry reminders, onboarding nudges, weekly automated database backup, and the Legacy Reactivation staged batch-send
- **CSV parsing:** `papaparse`, client-side, for Shop's bulk product upload (Section 25)
