# DigitalFlyer Growth
## Functional Specification & Test Map

Updated 2026-07-15. Supersedes the 2026-07-12 version — reflects the full Public Beta Polish Sprint (Sections 1–36 and the pre-launch hardening pass, 13.1–13.13), the email+password auth rewrite, the Standing 365 custom-page pilot, and **go-live**: Paystack is now switched to live mode and verified end-to-end with a real transaction. Production is `https://growth.digitalflyersa.co.za`.

A reference for walking through the complete built product — organized by *who's doing what* (prospect, applicant, live client, admin), not by build order.

---

## 1. What This Is

DigitalFlyer Growth is a growth-as-a-service platform for South African small businesses: a professional landing page, built and hosted for them, with lead capture, Meta ad tracking, and bundled access to the wider DigitalFlyer ecosystem (Marketplace listing, RE:Biz Nomads community). A business signs up (web or WhatsApp), answers a short guided flow, and gets a live page with no design or coding required.

---

## 2. Pricing Tiers

| Tier | Price | What's included | Payment |
|---|---|---|---|
| **Foundation** | Free 7 days, then R100/month | Business page, Marketplace listing, lead page, business profile, 1 digital asset/month, RE:Biz Nomads, BizUp | No card at signup — trial starts when onboarding finishes, converts automatically after 7 days |
| **Growth** | R180/month or R1,199/year | Everything in Foundation, plus campaign landing pages, performance tracking, marketing assets, monthly optimisation, growth reporting | Paystack, collected at the end of onboarding — **live mode, real transactions** |
| **Enterprise** | Coming soon | Full Meta + Google ad management | No live checkout yet |

**Founding Business:** the first 10 signups on Growth's *annual* plan lock in that price for life, plus 2 years of Enterprise access once it launches. Monthly Growth and Foundation are never eligible. A live counter on `/pricing` shows slots remaining.

---

## 3. Entry Channels

**Web** — `/pricing` → pick a tier → guided onboarding wizard.

**WhatsApp** — message the DigitalFlyer SA WhatsApp number directly. No tier choice offered here; every WhatsApp signup goes to Growth (monthly or annual, asked in the chat). No free-trial path via WhatsApp.

Both channels write to the exact same `growth_clients` table (`signup_channel` records which one, visible in `/admin`) and go through the same Paystack checkout — a client's experience after signup is identical regardless of which door they came in.

---

## 4. Web Onboarding Journey

Foundation gets 7 steps, Growth/Enterprise get 9 (two extra: ad tracking setup, payment). Progress auto-saves after each step — closing the tab and logging back in later resumes exactly where they left off.

1. **Business Info** — business name, contact email, call number, WhatsApp number (can be the same or different numbers)
2. **Business Profile** — province, industry, address, description, tagline, products/services, extra notes, Facebook/Instagram links, website URL (optional — shown on their page and their Marketplace listing if set)
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
4. Province → industry → address → description → tagline → products/services → notes (each its own message, optional ones skippable by replying "skip")
5. Brand color — numbered preset list (8 colors), not a hex code — a WhatsApp user typing a hex value reliably produces garbage, so this avoids that entirely. Secondary color always defaults to white.
6. Logo — send a photo, or skip
7. AI-drafted copy shown as text — reply YES to accept, or type replacement copy
8. Packages — one free-text message, or skip
9. **Payment link sent directly in the chat** (real Paystack link) — completing it activates the account exactly like the web flow

A conversation that goes idle and resumes later continues from the last completed step, no restart (keyed on Meta's Business-Scoped User ID, not phone number — a WhatsApp user can change how their number appears in webhooks after adopting a username). Landing page template is always "Classic Conversion" for WhatsApp signups — changeable from the dashboard afterward, same as any other client.

---

## 6. Account Access & Auth

Rewritten this sprint from a magic-link-only flow to real email+password login, keeping magic links as the account-creation and password-reset mechanism:

- **First login** (from an invite/signup email) lands on `/auth/callback`, which establishes the session and — if no password is set yet — routes to `/set-password` before anything else.
- **Return visits** use `/login` with email+password. If the account predates this rewrite (no password ever set), `/login` transparently falls back to sending a fresh magic link instead of failing.
- **Forgot password** (`/forgot-password` → `/reset-password`) is a standard reset-link flow, kept distinct from the first-time `/set-password` step so a genuinely new user isn't told to "reset" a password they never set.
- Every account-lifecycle email (invite, magic link, password reset, welcome) follows house style and was rewritten for tone this sprint.

---

## 7. The Public Client Page (`/g/[slug]`)

What a visitor sees, varies by chosen template but always includes:

- **Hero** — business name, logo/initials, tagline, headline, CTA, social links (Facebook/Instagram/website icons)
- **About** — AI-drafted or client-written
- **Our Story** — the "additional notes" field shown verbatim, never AI-touched (guarantees specific facts like a founding year survive intact)
- **Services** — checklist or plain list depending on template
- **Packages** — if any were added, with "Most Popular" highlight at exactly 3
- **Testimonials** — real ones the client has added
- **Photo Gallery** — if 2+ photos exist
- **Location** — address + embedded Google Map (live — CSP `frame-src` fixed this sprint after being silently broken sitewide)
- **Lead Form** — name/email/phone; on success reveals the business's own contact details as a faster option; triggers an email to the business owner and a Meta CAPI "Lead" event
- **Cookie consent banner** — equally-weighted Accept/Reject shown before the Meta Pixel fires (server-side CAPI tracking is unaffected either way); choice remembered 180 days
- **Footer** — "Manage this page" link back to the owner's dashboard, Privacy Policy, Terms

Rate-limited (5 submissions per 10 minutes per visitor) against lead-form spam.

---

## 8. Standing 365 — Custom Page Pilot (`/standing365`)

A new page *type*, not a one-off: `landing_pages.page_type` (`template` vs `custom`) and `custom_page_key` let a member's page be a fully hand-built, freeform layout instead of the standard template system, registered in a small lookup table (`src/lib/custom-pages/registry.tsx`) the same way template pages are. Standing 365 is the first real instance, built for Dewald's own account, and doubles as the working proof for a future "request a custom page" member feature.

- Full custom editorial page (hero, about, 12-month framework, order flow, closing) — hand-built, not composed from the generic template sections.
- **Order flow**: Standard (R299 + R75 delivery, quantity selector) and Personalised (R385 + R75 delivery, one recipient name + up to 500-character gift message per order) editions. Real one-time Paystack checkout (separate code path from the subscription-based signup checkout), success/failure return banner, JSON-LD `Book` schema for SEO.
- **Seller-side order visibility**: any member on a `custom` page type gets an **Orders** section on their own dashboard (buyer details, delivery address, personalisation, quantity), scoped to their account — batch-number assignment and "mark as shipped" trigger their own emails to the buyer. Built generically, not admin-only, so it extends automatically to any future member with a custom order-taking page.
- Confirmed live end-to-end: real order → Paystack live charge → webhook write → dashboard visibility → status-change emails.

---

## 9. The Client Dashboard (`/dashboard`)

- **Header** — View your page, Edit your page, Log out
- **Profile completeness banner** — nudges toward missing description/address/photos
- **Change template** — swap any time, live preview first (preview iframe CSP bug fixed this sprint)
- **Photo gallery** — upload or Pexels search, set hero photo
- **Leads** — every form submission, name/email/phone/timestamp
- **Orders** *(custom pages only, e.g. Standing 365)* — buyer/delivery/personalisation detail, batch + fulfilment tracking
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

## 10. Admin Panel (`/admin`)

Allowlisted by email (`ADMIN_EMAILS`), no separate role system. Lists every client with plan/status/Meta-connection state and signup channel (Web/WhatsApp), a highlighted "needs Meta setup help" queue, per-client detail pages, and CSV export.

---

## 11. Ecosystem Access

- **DigitalFlyer SA Marketplace** — automatic inclusion for every paid membership, no request step. Listing links to the client's website URL if they've set one. *(No directory/search page yet for a visitor to actually browse this — see Backlog.)*
- **RE:Biz Nomads** — free, bundled, one click to a live private Facebook group. No payment gate anywhere in this flow (audited).
- **BizUp** — bundled feature line on every tier; the standalone product itself is a separate future build (its own repo/Supabase project, per the ecosystem's federated architecture) — not part of Growth's own codebase.

---

## 12. Automated Emails

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
| Standing 365 order placed / batch assigned / shipped | Order confirmation, then two fulfilment-status emails |

All copy follows house style: "DigitalFlyer SA," no em dashes, "Good day {name}," not "Hi there."

---

## 13. Security & Production Hardening (this sprint)

- **RLS coverage audit** across every table, plus a recurring class of bug fixed twice (`beta_events`, then `book_orders`): RLS being *enabled* on a table doesn't grant `service_role` access — a separate `GRANT` is required. All tables now confirmed granted.
- **Server-side authorization audit** — every mutation re-checked for IDOR (a client acting on another client's data via a guessable ID).
- Security headers + Content-Security-Policy sitewide, with narrowly-scoped exceptions for same-origin preview iframes (`/sample`, `/preview`) and the Google Maps embed (`frame-src`) — both were silently broken before this sprint's audit caught them.
- Rate limiting on every public write surface (signup, lead capture, onboarding steps, AI copy drafting, Standing 365 orders).
- `npm audit` wired into CI, fails the build on high/critical findings.
- Source maps / build output audited for accidental secret exposure.
- Meta Pixel cookie-consent gate; WhatsApp conversation state persistence verified under real message gaps.

---

## 14. Go-Live Status (2026-07-15)

**Paystack is live.** Live secret/public keys, live subscription plans (Foundation, Growth Monthly, Growth Annual), and the live webhook URL are all configured and verified — confirmed via a real end-to-end checkout that reached `checkout.paystack.com` showing the correct live price, stopped before payment. Webhook signature validation confirmed reachable and correctly rejecting invalid signatures.

Not yet live-mode (low urgency, no live checkout button exists for it yet): Enterprise's Paystack plan.

---

## 15. Behind the Scenes (not visible, but worth knowing during testing)

- **Rate limiting** — signup (5/10min per IP), lead capture (5/10min per IP), every onboarding step (20/min per account), AI copy drafting specifically (5/10min per account, stricter since it costs real API money), Standing 365 orders (10/10min per IP). In-memory, resets on a cold server start — fine at current scale, not a distributed guarantee.
- **Meta Pixel consent** — never fires before explicit Accept.
- **Idempotency** — every Paystack webhook branch (subscription signup, book orders) keyed on transaction reference, not business name, so duplicate events and same-name businesses can't collide.
- **Founding-slot / concurrency safety** — stress-tested, 30 concurrent same-name signups all succeed with unique slugs.
- **Automated backups** — weekly full database dump via GitHub Actions, independent of Supabase's own plan tier.
- **Automated cron jobs** (GitHub Actions, not Vercel Cron) — daily trial reminders, daily onboarding nudges, weekly backup. *(Repo secrets `SITE_URL`/`CRON_SECRET`/`SUPABASE_DB_URL` should be spot-checked that `SITE_URL` reflects the current production domain.)*

---

## 16. Known Limitations / Explicitly Out of Scope

- Enterprise tier has no live checkout yet.
- Full Facebook Page OAuth connection — needs Meta App Review, not buildable yet.
- Google Ads management — entirely unscoped, everything built so far is Meta-only.
- Lighthouse LCP on throttled mobile still measures ~2.3s warm (target 1.5s) — root cause not found, parked.
- **Uptime monitoring** (UptimeRobot) — instructions were provided; not confirmed as actually set up. Worth a quick check before treating this as covered.
- **Error monitoring** (Sentry or equivalent) — not built. Vercel's own function logs are the only visibility today.
- Meta ad-asset size/spec compliance for generated social images not yet verified against real campaign requirements.
- The 3 "See It In Action" pages on `/pricing` are honestly-labeled sample businesses, not real clients — swap in real ones once you have permission-granted examples.
- Bolt's new composable component library (`Bolt_Templates` repo) — reviewed, deliberately parked for a future session.
- No page-view/analytics tracking anywhere in the platform yet — flagged as a real gap this sprint, needed before any "most visited" or performance-ranking feature can exist for members.
- No public Marketplace directory/search page — members are *included* in the Marketplace concept, but there's no page today where a visitor can actually browse or search member businesses.

---

## 17. Backlog — Candidates For The Next Build

Roughly ordered by how directly they compound on what's already live, not by strict priority — worth a business-side pass to actually rank them.

1. **Marketplace directory + search** (`/marketplace`). Search box + industry filter (existing fixed taxonomy) + province filter, card grid of published member pages. Buildable on Postgres full-text search — no new search infrastructure needed at current scale. First version ranks by recently-added rather than "most visited," since there's no view-tracking yet (see #2). Sized similarly to one of this sprint's larger sections — a single focused build, not multi-week.
2. **Member-facing analytics / page-view tracking.** Needed both as its own dashboard feature (a member seeing how their page is performing) and as the ranking signal for #1's future "most visited" mode. Lightweight to start (a counter + increment), can grow into real analytics later.
3. **Main page + additional custom page architecture.** Today a member has exactly one routable page. Standing 365 proved the *custom page* mechanism works, but a member having a standard page *and* a separate custom page (e.g. a landing page plus a dedicated order page) needs real routing-layer work, not yet designed. Explicitly deferred this sprint pending business scoping.
4. **Uptime + error monitoring.** Two small, standard operational additions — UptimeRobot confirmation and a lightweight error monitor (Sentry or similar) — cheap insurance now that real customer money is flowing through the system.
5. **Enterprise tier live checkout.** Pricing card already exists ("Coming soon"); needs the actual plan, checkout wiring, and feature scope defined.
6. **Real "See It In Action" sample pages.** Swap the 3 honestly-labeled placeholder businesses on `/pricing` for real, permission-granted client pages once there are enough live members to choose from.
7. **Meta ad-asset spec compliance pass.** Verify generated social images actually meet Meta's real campaign size/format requirements before a client relies on them for paid ad spend.
8. **Mobile performance root-cause.** The ~2.3s warm LCP on throttled mobile was parked without a root cause — worth a dedicated pass once there's less launch-critical work competing for attention.

---

## 18. Suggested Test Checklist

- [ ] Web signup, Foundation (no card, 7-day trial)
- [ ] Web signup, Growth monthly — **real live payment**
- [ ] Web signup, Growth annual (check Founding Business banner if slots remain)
- [ ] Full onboarding wizard, every step, including skipping every optional field
- [ ] Template switch, before and after publishing
- [ ] WhatsApp signup, full conversation, real message
- [ ] Lead form submission on a live client page → check dashboard + owner email
- [ ] Cookie consent banner — Accept vs Reject, confirm Pixel network activity differs
- [ ] Dashboard: photo upload, testimonial add, social asset generation, template change
- [ ] Edit-your-page live-save behavior
- [ ] Trial-to-paid conversion link
- [ ] Cancel / upgrade flow
- [ ] Admin panel: client list, CSV export, "needs Meta help" flag, signup channel column
- [ ] Marketplace/RE:Biz Nomads links from both `/pricing` and `/dashboard`
- [ ] Standing 365: order flow (both editions, quantity), return banner, dashboard Orders visibility, batch/shipped emails
- [ ] Login: email+password, forgot-password reset, first-time set-password
- [ ] Mobile pass on every screen above, including the header on narrow viewports

---

## 19. Technical Foundation (brief, for context)

- **Frontend/backend:** Next.js (App Router), deployed on Vercel
- **Database/auth/storage:** Supabase (Postgres, email+password + magic-link auth, file storage for logos/photos/generated assets)
- **Payments:** Paystack — **live mode** — subscriptions (self-serve cancel/upgrade) and one-time checkout (Standing 365 orders), both webhook-driven
- **AI:** Anthropic Claude, drafts landing page copy during onboarding (web and WhatsApp)
- **Ad tracking:** Meta Conversions API (server-side, encrypted token) plus a consent-gated client-side Meta Pixel
- **Messaging:** Meta WhatsApp Cloud API, signed webhook, conversation state in `whatsapp_conversations`
- **Images:** Pexels API as an industry-matched stock photo fallback when a client hasn't uploaded their own
- **Automation:** GitHub Actions for trial-expiry reminders, onboarding nudges, and weekly automated database backup
