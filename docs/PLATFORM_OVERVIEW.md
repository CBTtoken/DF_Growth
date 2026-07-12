# DigitalFlyer Growth
## Functional Specification & Test Map

Updated 2026-07-12. Supersedes the 2026-07-11 version of this file — reflects everything built through the full `GROWTH_COMBINED_BUILD_SPEC_CLAUDE.md` (Parts 1 and 2, all 36 sections), not just Sprint-era scope. Production is `https://growth.digitalflyersa.co.za`.

A reference for walking through the complete built product — organized by *who's doing what* (prospect, applicant, live client, admin), not by build order.

---

## 1. What This Is

DigitalFlyer Growth is a growth-as-a-service platform for South African small businesses: a professional landing page, built and hosted for them, with lead capture, Meta ad tracking, and bundled access to the wider DigitalFlyer ecosystem (Marketplace listing, RE:Biz Nomads community). A business signs up (web or WhatsApp), answers a short guided flow, and gets a live page with no design or coding required.

---

## 2. Pricing Tiers

| Tier | Price | What's included | Payment |
|---|---|---|---|
| **Foundation** | Free 7 days, then R100/month | Business page, Marketplace listing, lead page, business profile, 1 digital asset/month, RE:Biz Nomads, BizUp | No card at signup — trial starts when onboarding finishes, converts automatically after 7 days |
| **Growth** | R180/month or R1,199/year | Everything in Foundation, plus campaign landing pages, performance tracking, marketing assets, monthly optimisation, growth reporting | Paystack, collected at the end of onboarding |
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
9. *(Growth/Enterprise only)* **Payment** — Paystack checkout, redirects back once paid

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

## 6. The Public Client Page (`/g/[slug]`)

What a visitor sees, varies by chosen template but always includes:

- **Hero** — business name, logo/initials, tagline, headline, CTA, social links (Facebook/Instagram/website icons)
- **About** — AI-drafted or client-written
- **Our Story** — the "additional notes" field shown verbatim, never AI-touched (guarantees specific facts like a founding year survive intact)
- **Services** — checklist or plain list depending on template
- **Packages** — if any were added, with "Most Popular" highlight at exactly 3
- **Testimonials** — real ones the client has added
- **Photo Gallery** — if 2+ photos exist
- **Location** — address + embedded map
- **Lead Form** — name/email/phone; on success reveals the business's own contact details as a faster option; triggers an email to the business owner and a Meta CAPI "Lead" event
- **Cookie consent banner** — equally-weighted Accept/Reject shown before the Meta Pixel fires (server-side CAPI tracking is unaffected either way); choice remembered 180 days
- **Footer** — "Manage this page" link back to the owner's dashboard, Privacy Policy, Terms

Rate-limited (5 submissions per 10 minutes per visitor) against lead-form spam.

---

## 7. The Client Dashboard (`/dashboard`)

- **Header** — View your page, Edit your page, Log out
- **Profile completeness banner** — nudges toward missing description/address/photos
- **Change template** — swap any time, live preview first
- **Photo gallery** — upload or Pexels search, set hero photo
- **Leads** — every form submission, name/email/phone/timestamp
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

## 8. Admin Panel (`/admin`)

Allowlisted by email (`ADMIN_EMAILS`), no separate role system. Lists every client with plan/status/Meta-connection state and signup channel (Web/WhatsApp), a highlighted "needs Meta setup help" queue, per-client detail pages, and CSV export.

---

## 9. Ecosystem Access

- **DigitalFlyer SA Marketplace** — automatic inclusion for every paid membership, no request step. Listing links to the client's website URL if they've set one.
- **RE:Biz Nomads** — free, bundled, one click to a live private Facebook group. No payment gate anywhere in this flow (audited).

---

## 10. Automated Emails

| Trigger | Email |
|---|---|
| Account created (web or WhatsApp) | Supabase Auth invite — sets up login |
| Returning user, `/login` | Magic sign-in link |
| Onboarding finished, page goes live | "Your page is live!" welcome |
| Foundation trial, 2 days left | Reminder + convert-to-paid link |
| Foundation trial expired, no payment | "Trial ended, page paused" + reactivate link |
| Signed up 3-4 days ago, still incomplete/thin | Nudge to finish onboarding |
| New lead on a client's page | Notification to the business owner |

All copy follows house style: "DigitalFlyer SA," no em dashes, "Good day {name}," not "Hi there."

---

## 11. Behind the Scenes (not visible, but worth knowing during testing)

- **Rate limiting** — signup (5/10min per IP), lead capture (5/10min per IP), every onboarding step (20/min per account), AI copy drafting specifically (5/10min per account, stricter since it costs real API money). In-memory, resets on a cold server start — fine at current scale, not a distributed guarantee.
- **Meta Pixel consent** — never fires before explicit Accept.
- **Idempotency** — Paystack webhook keyed on transaction reference, not business name, so duplicate events and same-name businesses can't collide.
- **Founding-slot / concurrency safety** — stress-tested, 30 concurrent same-name signups all succeed with unique slugs.

---

## 12. Known Limitations / Explicitly Out of Scope

- Enterprise tier has no live checkout yet.
- Full Facebook Page OAuth connection — needs Meta App Review, not buildable yet.
- Google Ads management — entirely unscoped, everything built so far is Meta-only.
- Lighthouse LCP on throttled mobile still measures ~2.3s warm (target 1.5s) — root cause not found, parked.
- Uptime monitoring (Better Stack/UptimeRobot) never set up.
- Meta ad-asset size/spec compliance for generated social images not yet verified against real campaign requirements.
- The 3 "See It In Action" pages on `/pricing` are honestly-labeled sample businesses, not real clients — swap in real ones once you have permission-granted examples.
- Bolt's new composable component library (`Bolt_Templates` repo) — reviewed, deliberately parked for a future session.

---

## 13. Suggested Test Checklist

- [ ] Web signup, Foundation (no card, 7-day trial)
- [ ] Web signup, Growth monthly
- [ ] Web signup, Growth annual (check Founding Business banner if slots remain)
- [ ] Full onboarding wizard, every step, including skipping every optional field
- [ ] Template switch, before and after publishing
- [ ] WhatsApp signup, full conversation, real message (once number verifies)
- [ ] Lead form submission on a live client page → check dashboard + owner email
- [ ] Cookie consent banner — Accept vs Reject, confirm Pixel network activity differs
- [ ] Dashboard: photo upload, testimonial add, social asset generation, template change
- [ ] Edit-your-page live-save behavior
- [ ] Trial-to-paid conversion link
- [ ] Cancel / upgrade flow
- [ ] Admin panel: client list, CSV export, "needs Meta help" flag, signup channel column
- [ ] Marketplace/RE:Biz Nomads links from both `/pricing` and `/dashboard`
- [ ] Mobile pass on every screen above (this was flagged early as a top priority)

---

## 14. Technical Foundation (brief, for context)

- **Frontend/backend:** Next.js (App Router), deployed on Vercel
- **Database/auth/storage:** Supabase (Postgres, magic-link auth, file storage for logos/photos/generated assets)
- **Payments:** Paystack (subscriptions, self-serve cancel/upgrade, webhook-driven status updates)
- **AI:** Anthropic Claude, drafts landing page copy during onboarding (web and WhatsApp)
- **Ad tracking:** Meta Conversions API (server-side, encrypted token) plus a consent-gated client-side Meta Pixel
- **Messaging:** Meta WhatsApp Cloud API, signed webhook, conversation state in `whatsapp_conversations`
- **Images:** Pexels API as an industry-matched stock photo fallback when a client hasn't uploaded their own
- **Automation:** daily cron for trial-expiry reminders and onboarding nudges; weekly automated database backup
