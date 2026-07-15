# DigitalFlyer Growth
## Functional Specification & Test Map

Updated 2026-07-15 (post-launch build). Supersedes the earlier same-day go-live version — adds the Marketplace directory, RE:Biz Nomads (a second custom-page instance), the multi-account switcher, and admin visibility/delete controls, all built and verified live after go-live. Production is `https://growth.digitalflyersa.co.za`.

A reference for walking through the complete built product — organized by *who's doing what* (prospect, applicant, live client, admin), not by build order.

---

## 1. What This Is

DigitalFlyer Growth is a growth-as-a-service platform for South African small businesses: a professional landing page, built and hosted for them, with lead capture, Meta ad tracking, and bundled access to the wider DigitalFlyer ecosystem (a real, searchable Marketplace directory, RE:Biz Nomads community). A business signs up (web or WhatsApp), answers a short guided flow, and gets a live page with no design or coding required.

---

## 2. Pricing Tiers

| Tier | Price | What's included | Payment |
|---|---|---|---|
| **Foundation** | Free 7 days, then R100/month | Business page, Marketplace listing, lead page, business profile, 1 digital asset/month, RE:Biz Nomads, BizUp | No card at signup — trial starts when onboarding finishes, converts automatically after 7 days |
| **Growth** | R180/month or R1,199/year | Everything in Foundation, plus campaign landing pages, performance tracking, marketing assets, monthly optimisation, growth reporting | Paystack, collected at the end of onboarding — **live mode, real transactions** |
| **Enterprise** | Coming soon | Full Meta + Google ad management | No live checkout yet |

**Day One Business:** the first 10 signups on Growth's *annual* plan lock in that price for life, plus permanent Enterprise access once it launches (for as long as they stay on the annual plan — not a time-limited window). Monthly Growth and Foundation are never eligible. A live counter on `/pricing` shows slots remaining. *(Corrected — an earlier version of this doc said "Founding Business" and "2 years of Enterprise access." Confirmed against the actual live pricing page copy: it already said "Day One Business" and "permanently" everywhere, this doc just hadn't caught up.)*

---

## 3. Entry Channels

**Web** — `/pricing` → pick a tier → guided onboarding wizard.

**WhatsApp** — message the DigitalFlyer SA WhatsApp number directly. No tier choice offered here; every WhatsApp signup goes to Growth (monthly or annual, asked in the chat). No free-trial path via WhatsApp.

Both channels write to the exact same `growth_clients` table (`signup_channel` records which one, visible in `/admin`) and go through the same Paystack checkout — a client's experience after signup is identical regardless of which door they came in.

---

## 4. Web Onboarding Journey

Foundation gets 7 steps, Growth/Enterprise get 9 (two extra: ad tracking setup, payment). Progress auto-saves after each step — closing the tab and logging back in later resumes exactly where they left off.

1. **Business Info** — business name, contact email, call number, WhatsApp number (can be the same or different numbers)
2. **Business Profile** — province, industry, address, **city/town** (new — optional, a curated list of ~50 major South African cities/towns plus "Other," powers the Marketplace's city filter), description, tagline, products/services, extra notes, Facebook/Instagram links, website URL (optional — shown on their page and their Marketplace listing if set)
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
4. Province → industry → address → description → tagline → products/services → notes (each its own message, optional ones skippable by replying "skip"). *City is web-only for now — a ~50-option list doesn't translate well to a WhatsApp numbered reply; a WhatsApp signup can add their city later from the dashboard, same as template selection already works.*
5. Brand color — numbered preset list (8 colors), not a hex code — a WhatsApp user typing a hex value reliably produces garbage, so this avoids that entirely. Secondary color always defaults to white.
6. Logo — send a photo, or skip
7. AI-drafted copy shown as text — reply YES to accept, or type replacement copy
8. Packages — one free-text message, or skip
9. **Payment link sent directly in the chat** (real Paystack link) — completing it activates the account exactly like the web flow

A conversation that goes idle and resumes later continues from the last completed step, no restart (keyed on Meta's Business-Scoped User ID, not phone number — a WhatsApp user can change how their number appears in webhooks after adopting a username). Landing page template is always "Classic Conversion" for WhatsApp signups — changeable from the dashboard afterward, same as any other client.

---

## 6. Account Access & Auth

Rewritten from a magic-link-only flow to real email+password login, keeping magic links as the account-creation and password-reset mechanism:

- **First login** (from an invite/signup email) lands on `/auth/callback`, which establishes the session and — if no password is set yet — routes to `/set-password` before anything else.
- **Return visits** use `/login` with email+password. If the account predates this rewrite (no password ever set), `/login` transparently falls back to sending a fresh magic link instead of failing.
- **Forgot password** (`/forgot-password` → `/reset-password`) is a standard reset-link flow, kept distinct from the first-time `/set-password` step so a genuinely new user isn't told to "reset" a password they never set.
- Every account-lifecycle email (invite, magic link, password reset, welcome) follows house style.
- **Multi-account switcher (new):** one login can now own more than one `growth_client` account (e.g. a member with both a standard business page and a custom page like Standing 365 or RE:Biz Nomads). Logging in normally lands on whichever account was most recently created; a small switcher on the dashboard (only visible once a login owns 2+ accounts) lets you jump between them, remembered via a cookie. Verified live with disposable test accounts before shipping.

---

## 7. The Public Client Page (`/[slug]`)

*(Corrected from an earlier version of this doc, which incorrectly wrote this as `/g/[slug]` — the real route has no `/g/` prefix.)*

What a visitor sees, varies by chosen template but always includes:

- **Hero** — business name, logo/initials, tagline, headline, CTA, social links (Facebook/Instagram/website icons)
- **About** — AI-drafted or client-written
- **Our Story** — the "additional notes" field shown verbatim, never AI-touched (guarantees specific facts like a founding year survive intact)
- **Services** — checklist or plain list depending on template
- **Packages** — if any were added, with "Most Popular" highlight at exactly 3
- **Testimonials** — real ones the client has added
- **Photo Gallery** — if 2+ photos exist
- **Location** — address + embedded Google Map
- **Lead Form** — name/email/phone; on success reveals the business's own contact details as a faster option; triggers an email to the business owner and a Meta CAPI "Lead" event
- **Cookie consent banner** — equally-weighted Accept/Reject shown before the Meta Pixel fires (server-side CAPI tracking is unaffected either way); choice remembered 180 days
- **Footer** — "Manage this page" link back to the owner's dashboard, Privacy Policy, Terms

Rate-limited (5 submissions per 10 minutes per visitor) against lead-form spam.

---

## 8. Custom Pages — a Reusable Page Type

`landing_pages.page_type` (`template` vs `custom`) and `custom_page_key` let a member's page be a fully hand-built, freeform layout instead of the standard template system, registered in a small lookup table (`src/lib/custom-pages/registry.tsx`) the same way template pages are. Two real instances exist today, both under `dewald@digitalflyer.co.za`:

### Standing 365 (`/standing365`)
A book's dedicated page — hero, about, 12-month framework, order flow, closing. Real order flow: Standard (R299 + R75 delivery, quantity selector) and Personalised (R385 + R75 delivery, recipient name + gift message) editions, one-time Paystack checkout, success/failure return banner, JSON-LD `Book` schema for SEO. **Seller-side order visibility**: any member on a `custom` page type gets an **Orders** section on their own dashboard (buyer details, delivery address, personalisation, quantity, batch-number + fulfilment tracking, own emails) — built generically, not admin-only, so it extends to any future member with an order-taking page. Confirmed live end-to-end: real order → Paystack live charge → webhook write → dashboard visibility → status emails.

### RE:Biz Nomads (`/rebiz`)
A membership-community page, content pasted from the existing `rebiz.digitalflyer.co.za` page and laid out fresh. Brand-blue hero band (not a bespoke palette — this one is explicitly part of the membership itself, not a standalone product), a real contact form (reuses the same `LeadForm` every templated page already has — submissions land in the dashboard's Leads list), and links to both the private Deal Room and public Facebook groups.

Both prove the mechanism works for a real "member requests an additional custom page" feature — see Backlog for the remaining architecture work (today one member = one routable page; true dual-page support per member isn't built yet).

---

## 9. The Client Dashboard (`/dashboard`)

- **Header** — View your page, Edit your page, Log out
- **Account switcher (new)** — only visible once a login owns 2+ `growth_client` accounts; see Section 6
- **Profile completeness banner** — nudges toward missing description/address/photos
- **Change template** — swap any time, live preview first
- **Photo gallery** — upload or Pexels search, set hero photo
- **Leads** — every form submission, name/email/phone/timestamp
- **Orders** *(custom pages only, e.g. Standing 365, RE:Biz)* — buyer/delivery/personalisation detail, batch + fulfilment tracking
- **Your Package** (account/plan) — current tier, features included, upgrade/cancel
- **Platform Features** — shows what a higher tier unlocks, even if locked
- **Testimonials** — add one, auto-generates a shareable social image
- **Asset style** — pick the default visual style for generated social images
- **Generate social assets** — pick a content type (special offer, before/after, etc.), pick a photo from the gallery, generates a downloadable branded image
- **Meta ad tracking** *(Growth/Enterprise)* — paste Pixel/Ad Account IDs, encrypted token entry, recent CAPI delivery status
- **Search & ad platform verification** — Google Search Console / Facebook domain verification meta tags
- **Also available to you** — Marketplace (automatic inclusion, links to their website URL if set) and RE:Biz Nomads (free, one-click join link)

`/dashboard/edit` mirrors the core onboarding fields as standalone editable cards — every save is live immediately, no publish step.

---

## 10. Marketplace Directory (`/marketplace`) — new

A real, browsable, searchable directory of every published, active member page — not just the abstract concept of Marketplace inclusion.

- **Search box** — matches business name, tagline, and description.
- **Industry filter** — reuses the same fixed taxonomy as onboarding.
- **City filter** — the full curated city list (see Section 4), so it's usable immediately even before most members have set a city.
- **Sort** — most-recently-added first. There's no page-view tracking anywhere in the platform yet, so "most visited" isn't possible today — see Backlog.
- **Cards show a real photo thumbnail** — each member's actual hero photo (same resolution order as their real page: explicit hero photo selection first, else first uploaded gallery photo), or their logo/initials on their own brand color if they haven't uploaded a photo yet. Deliberately not a live iframe embed of the real page (unlike the homepage's "See It In Action" sample previews) — that technique only works there because those specific sample routes have a deliberately loosened clickjacking header; widening that to every real client page, or scaling dozens of live iframes as the directory grows, isn't a good trade.
- Linked from the main site header (desktop only, to protect the mobile header layout) and every page footer.

---

## 11. Admin Panel (`/admin`)

Allowlisted by email (`ADMIN_EMAILS`), no separate role system. Lists every client with plan/status/Meta-connection state and signup channel (Web/WhatsApp), a highlighted "needs Meta setup help" queue, per-client detail pages, and CSV export.

**Danger Zone (new)**, on each client's detail page (`/admin/clients/[id]`):
- **Make page inactive / Reactivate** — reversible toggle, reuses the existing "cancelled" status value self-serve cancel already writes, so every place that already checks for an active page (the public route, the Marketplace listing) honors it immediately.
- **Delete permanently** — a real delete, confirmed with a browser prompt before it runs. Cascades through every related table via existing foreign keys, plus an explicit cleanup of `whatsapp_conversations` (the one table without cascade-on-delete). Does not touch Supabase Storage files (logo/photos/generated assets) or the linked login — a login can own more than one account now (see Section 6), so deleting it here would be wrong.

Built after two leftover test signups ("ABC Group") were found cluttering the live Marketplace with no way to remove them short of a direct database query — both have since been deleted using this feature.

---

## 12. Ecosystem Access

- **DigitalFlyer SA Marketplace** — automatic inclusion for every paid membership, no request step, now with a real browsable directory page (Section 10). Listing links to the client's website URL if they've set one.
- **RE:Biz Nomads** — free, bundled, one click to a live private Facebook group, plus its own dedicated info page (Section 8) with links to both the private Deal Room and public groups. No payment gate anywhere in this flow (audited).
- **BizUp** — bundled feature line on every tier; the standalone product itself is a separate future build (its own repo/Supabase project, per the ecosystem's federated architecture) — not part of Growth's own codebase.

---

## 13. Automated Emails

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

All copy follows house style: "DigitalFlyer SA," no em dashes, "Good day {name}," not "Hi there."

---

## 14. Security & Production Hardening

- **RLS coverage audit** across every table, plus a recurring class of bug fixed twice (`beta_events`, then `book_orders`): RLS being *enabled* on a table doesn't grant `service_role` access — a separate `GRANT` is required. All tables now confirmed granted.
- **Server-side authorization audit** — every mutation re-checked for IDOR (a client acting on another client's data via a guessable ID).
- Security headers + Content-Security-Policy sitewide, with narrowly-scoped exceptions for same-origin preview iframes (`/sample`, `/preview`) and the Google Maps embed (`frame-src`).
- Rate limiting on every public write surface (signup, lead capture, onboarding steps, AI copy drafting, custom-page orders).
- `npm audit` wired into CI, fails the build on high/critical findings.
- Source maps / build output audited for accidental secret exposure.
- Meta Pixel cookie-consent gate; WhatsApp conversation state persistence verified under real message gaps.
- Real bug found and fixed live: a Server Component page passed an `onChange` handler to a form element (the Marketplace's original filter design) — React can't serialize event handlers across the server/client boundary, producing a 500 on every load. Fixed before most users would have hit it; a reminder that any future filter/interactive UI on a Server Component page needs either a real form submit or an explicit client component.

---

## 15. Go-Live Status

**Paystack is live.** Live secret/public keys, live subscription plans (Foundation, Growth Monthly, Growth Annual), and the live webhook URL are all configured and verified — confirmed via a real end-to-end checkout that reached `checkout.paystack.com` showing the correct live price.

Not yet live-mode (low urgency, no live checkout button exists for it yet): Enterprise's Paystack plan.

**Known live gap:** `NEXT_PUBLIC_WHATSAPP_NUMBER` was found to be missing from Vercel's production environment (present locally, never added to production) — every WhatsApp CTA button that depends on it (RE:Biz Nomads' "Message us," the dashboard's Enterprise upsell) has been silently invisible in production. Fix given to Dewald; **not yet confirmed as applied**.

---

## 16. Behind the Scenes (not visible, but worth knowing during testing)

- **Rate limiting** — signup (5/10min per IP), lead capture (5/10min per IP), every onboarding step (20/min per account), AI copy drafting specifically (5/10min per account, stricter since it costs real API money), custom-page orders (10/10min per IP). In-memory, resets on a cold server start — fine at current scale, not a distributed guarantee.
- **Meta Pixel consent** — never fires before explicit Accept.
- **Idempotency** — every Paystack webhook branch (subscription signup, orders) keyed on transaction reference, not business name, so duplicate events and same-name businesses can't collide.
- **Founding-slot / concurrency safety** — stress-tested, 30 concurrent same-name signups all succeed with unique slugs.
- **Automated backups** — weekly full database dump via GitHub Actions, independent of Supabase's own plan tier.
- **Automated cron jobs** (GitHub Actions, not Vercel Cron) — daily trial reminders, daily onboarding nudges, weekly backup. *(Repo secrets `SITE_URL`/`CRON_SECRET`/`SUPABASE_DB_URL` should be spot-checked that `SITE_URL` reflects the current production domain — not yet re-confirmed since the domain was fixed.)*

---

## 17. Known Limitations / Explicitly Out of Scope

- Enterprise tier has no live checkout yet.
- Full Facebook Page OAuth connection — needs Meta App Review, not buildable yet.
- Google Ads management — entirely unscoped, everything built so far is Meta-only.
- Lighthouse LCP on throttled mobile still measures ~2.3s warm (target 1.5s) — root cause not found, parked.
- **Uptime monitoring** (UptimeRobot) — instructions were given to Dewald earlier; **still not confirmed as actually set up.**
- **Error monitoring** (Sentry or equivalent) — **still not built.** Vercel's own function logs are the only visibility today.
- `NEXT_PUBLIC_WHATSAPP_NUMBER` missing from Vercel production — see Section 15.
- Meta ad-asset size/spec compliance for generated social images not yet verified against real campaign requirements.
- The 3 "See It In Action" pages on `/pricing` are honestly-labeled sample businesses, not real clients — swap in real ones once you have permission-granted examples.
- Bolt's new composable component library (`Bolt_Templates` repo) — reviewed, deliberately parked for a future session.
- No page-view/analytics tracking anywhere in the platform yet — needed before any "most visited" or performance-ranking feature can exist for members or the Marketplace.
- One member = one routable page today. Standing 365 and RE:Biz Nomads prove the custom-page mechanism, but a member having a standard page *and* a separate additional page needs real routing-layer work, not yet designed.

---

## 18. Backlog — Candidates For The Next Build

Re-ordered now that the Marketplace directory is live. Worth a business-side pass to rank against actual priorities.

1. **Uptime + error monitoring.** Confirm UptimeRobot is actually active; add a lightweight error monitor (Sentry or similar) — cheap insurance now that real customer money is flowing through the system. Explicitly asked about this sprint and confirmed still open.
2. **Member-facing analytics / page-view tracking.** Needed both as its own dashboard feature (a member seeing how their page is performing) and as the ranking signal for the Marketplace's future "most visited" mode. Lightweight to start (a counter + increment), can grow into real analytics later.
3. **Main page + additional custom page architecture.** Today a member has exactly one routable page. Standing 365 and RE:Biz Nomads proved the custom-page mechanism works (twice now, both under one login via the account switcher), but true dual-page support per member needs real routing-layer work, not yet designed.
4. **Enterprise tier live checkout.** Pricing card already exists ("Coming soon"); needs the actual plan, checkout wiring, and feature scope defined.
5. **Real "See It In Action" sample pages.** Swap the 3 honestly-labeled placeholder businesses on `/pricing` for real, permission-granted client pages once there are enough live members to choose from.
6. **Meta ad-asset spec compliance pass.** Verify generated social images actually meet Meta's real campaign size/format requirements before a client relies on them for paid ad spend.
7. **Mobile performance root-cause.** The ~2.3s warm LCP on throttled mobile was parked without a root cause — worth a dedicated pass once there's less launch-critical work competing for attention.

Small, near-zero-effort item worth closing out regardless of sprint priority: add `NEXT_PUBLIC_WHATSAPP_NUMBER` to Vercel production and redeploy (Section 15).

---

## 19. Suggested Test Checklist

- [ ] Web signup, Foundation (no card, 7-day trial)
- [ ] Web signup, Growth monthly — **real live payment**
- [ ] Web signup, Growth annual (check Day One Business banner if slots remain)
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
- [ ] **Admin Danger Zone: deactivate a test page, confirm it 404s and drops off the Marketplace, reactivate, confirm it returns**
- [ ] **Marketplace: search, industry filter, city filter, clear filters, photo thumbnails render correctly**
- [ ] **Account switcher: an account with 2+ growth_client logins can switch between them from the dashboard**
- [ ] Standing 365: order flow (both editions, quantity), return banner, dashboard Orders visibility, batch/shipped emails
- [ ] RE:Biz Nomads: contact form submission, both Facebook group links
- [ ] Login: email+password, forgot-password reset, first-time set-password
- [ ] Mobile pass on every screen above, including the header on narrow viewports

---

## 20. Technical Foundation (brief, for context)

- **Frontend/backend:** Next.js (App Router), deployed on Vercel
- **Database/auth/storage:** Supabase (Postgres, email+password + magic-link auth, file storage for logos/photos/generated assets)
- **Payments:** Paystack — **live mode** — subscriptions (self-serve cancel/upgrade) and one-time checkout (custom-page orders), both webhook-driven
- **AI:** Anthropic Claude, drafts landing page copy during onboarding (web and WhatsApp)
- **Ad tracking:** Meta Conversions API (server-side, encrypted token) plus a consent-gated client-side Meta Pixel
- **Messaging:** Meta WhatsApp Cloud API, signed webhook, conversation state in `whatsapp_conversations`
- **Images:** Pexels API as an industry-matched stock photo fallback when a client hasn't uploaded their own
- **Automation:** GitHub Actions for trial-expiry reminders, onboarding nudges, and weekly automated database backup
