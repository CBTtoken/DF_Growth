# DigitalFlyer Growth — Functional Spec & Roadmap Review

**Updated 18 July 2026 (post-launch build)**

A working summary for business review — what's live in production today, what's deliberately parked, and a ranked starting point for the next build cycle.

For the full detailed technical spec (every field, every step, every edge case), see [`PLATFORM_OVERVIEW.md`](PLATFORM_OVERVIEW.md) in this same folder — that file is the authoritative source of truth and updates with every build. This document is a condensed version of it, formatted for a business-side read rather than a build reference.

---

## ✅ New this week: Booking & Shop (core flow), a navigable dashboard, and the Founding Business offer retired

The first three sprints of two new revenue-bearing modules are live for Growth-tier-and-above clients: **Booking** (a real appointment/rental calendar with database-enforced double-booking prevention) and **Shop** (a product catalog and cart with atomic stock control, no overselling). Payment for a booking or order is still arranged directly between business and customer for now — real in-page Paystack checkout and live courier shipping are the next two build sprints, not yet started. The client dashboard has also been reorganized into navigable tabs instead of one long scrolling page, and — per Dewald's own call — the Founding Business / "Day One Business" annual-signup offer has been discontinued and removed everywhere a visitor could see it.

| | |
|---|---|
| **Status** | Live |
| **Functional areas shipped** | 30 |
| **Backlog candidates** | 7 |
| **Pricing** | Foundation R100/mo · Growth R180/mo or R1,199/yr |

---

## What's 100% in place (28 areas)

Everything below is built, deployed, and verified against the live production site.

| Area | What's there |
|---|---|
| **Pricing & tiers** | Foundation (free trial), Growth (monthly/annual) — Enterprise priced but not yet purchasable. Founding Business / Day One offer has been discontinued and removed. |
| **Web onboarding** | 7–9 step guided wizard, autosave/resume, AI-drafted landing copy, 10 real templates, optional city field |
| **WhatsApp onboarding** | Full signup-to-payment conversation, resumable, same data model as web |
| **Email + password login** | Real password auth, magic-link fallback, forgot/reset flow |
| **Public client pages** | Hero, about, services, packages, testimonials, gallery, map, reviews, lead form, cookie-gated Meta Pixel |
| **Custom pages (x2)** | Standing 365 (order flow, live payment, seller-side order dashboard) and RE:Biz Nomads |
| **Client dashboard** | Reorganized into navigable tabs (Overview, Your Page, Booking & Shop, Reviews & Testimonials, Marketing, Account) instead of one long scrolling page — template switching, photo/testimonial management, page-view analytics, social asset generator, leads, reviews management, orders, plan management |
| **Booking & Shop (core flow)** | Real-time appointment/rental booking with database-enforced double-booking prevention, and a product catalog + cart with atomic stock control (no overselling) — both live on Growth-and-above client pages. Payment is still arranged directly between business and customer for now; real in-page checkout and live courier shipping are the next two build sprints. |
| **Multi-account switcher** | One login owning more than one member account can switch between them from the dashboard |
| **Marketplace directory** | Redesigned text-forward cards (Google-Business-Profile style), search, industry filter, city filter, ratings badge on cards, "most visited" sort |
| **Admin panel** | Full client list, CSV export, Meta-help queue, signup channel visibility, Reactivation Batch view, Flagged Reviews queue, Events Queue |
| **Admin Danger Zone** | Deactivate/reactivate a page, or permanently delete an account |
| **Automated lifecycle emails** | Invite, welcome, trial reminders, nudges, lead notifications, order/fulfilment emails, OTP verification codes — house style throughout |
| **Meta Conversions API** | Server-side pixel tracking with consent gate, encrypted token storage, delivery status visible in dashboard |
| **Paystack — live mode** | Subscriptions and one-time checkout, both webhook-driven, idempotent on transaction reference |
| **Security hardening** | RLS + authorization audit, CSP/security headers, rate limiting on every public write, CI vulnerability gate |
| **Automated backups** | Weekly full database dump, independent of Supabase's own plan tier |
| **Scheduled jobs** | Daily trial reminders, daily onboarding nudges, weekly backup, staged reactivation sends — all via GitHub Actions |
| **Mobile pass** | Header, forms, order flow, template picker all verified against real narrow-viewport bugs; real hamburger nav menu replaces the earlier pattern of hiding nav items below 375px |
| **Photo & asset system** | Client uploads or Pexels stock fallback by industry, branded social image generation |
| **Domain & infrastructure** | `growth.digitalflyersa.co.za` **plus** the root domain and `www` both correctly redirecting to it — real DNS work this cycle to land correctly |
| **City taxonomy** | ~50 major South African cities/towns, powering onboarding, Marketplace, and List Your Event |
| **Page-view analytics** | Real, live, in the client dashboard — corrects the 15 July version of this doc, which said this wasn't built yet |
| **Legacy Reactivation** | A real outreach campaign, not just a build — 30 of 31 verified candidate businesses sent a real invitation email, 0% bounce/complaint rate. Address verification, bounce/complaint handling, suppression list, staged batch-send, admin visibility all built and used for real. |
| **Rate & Review** | Free reviewer accounts (OTP signup), Turnstile-protected review submission, public star rating + expandable review list on every business page, business owner reply/flag from the dashboard, admin moderation queue, fraud-signal flagging (shared email domain, repeat device, velocity), `AggregateRating` in SEO structured data |
| **List Your Event** | Genuinely free event-organiser accounts, full submission form, public browsable/searchable Events section, individual event pages with `Event` structured data for Google, a proper letterbox photo-banner treatment, Turnstile + system spam checks gating new submissions into a moderation queue, public "report this event," daily auto-archive of past events |
| **SEO infrastructure** | Dynamic sitemap (clients + events), Google Search Console verification, Google Analytics, corrected client-page titles, industry-specific structured data types |
| **Cascading admin delete** | Real delete respects every foreign-key relationship, including tables with no auto-cascade |

---

## Backlog — next build candidates (7 items)

Re-ordered now that List Your Event Sprint 2, Marketplace ratings/sort, the real mobile nav menu, and Booking/Shop's core flow are all live.

1. **Booking & Shop, Sprints 4-7** — real in-page Paystack payment collection, live Bob Go courier shipping (blocked on Dewald signing up for a real Bob Go account), WhatsApp booking reminders and cancel/reschedule handling, and a final production-readiness pass before either module goes live to a real paying client.
2. **Uptime + error monitoring** — confirm UptimeRobot is actually active; add a lightweight error monitor (Sentry or similar). Still open.
3. **BizUp ecosystem spec alignment** — correct BizUp's own build spec to match the real federated architecture and register it in the ecosystem's master doc. Pure documentation/schema work, already scoped, not started.
4. **Main page + additional custom page architecture** — true dual-page-per-member support still needs real routing-layer design.
5. **Enterprise live checkout** — pricing card exists as "Coming soon"; needs the real plan, checkout wiring, and feature scope defined.
6. **Real client showcase** — swap the 3 placeholder "See It In Action" sample pages for real, permission-granted member pages.
7. **Meta ad-asset compliance pass** — verify generated social images actually meet Meta's real campaign size/format requirements.

**Correction to an earlier version of this doc:** the `NEXT_PUBLIC_WHATSAPP_NUMBER` item logged here previously was a wrong root cause. RE:Biz Nomads never should have had a WhatsApp CTA at all (membership is bundled with a paid plan, not a WhatsApp inquiry) and has been fixed to link to `/pricing` instead; the one remaining WhatsApp-dependent surface already uses a `mailto:` fallback because DigitalFlyer's own WhatsApp Business number is pending Meta's approval, not a missing env var. Nothing outstanding here.

---

## Recommended UI/UX improvements

Grounded in real friction points from this cycle's build, not a generic wishlist — full detail in `PLATFORM_OVERVIEW.md` Section 23.

1. ~~Mobile nav is quietly dropping a whole section.~~ **Done.** A real hamburger menu now covers Marketplace, Events, and Log in/Dashboard on mobile, replacing the earlier pattern of hiding each new nav item.
2. **Three near-identical OTP entry screens** now exist across different account types with duplicated markup — worth consolidating into one shared component before a fourth one gets built.
3. **No cross-visibility between a person's different account types** — a visitor can be a business owner, a reviewer, and an event organiser all under one email today, with zero shared view across them. Not urgent, worth a lightweight surface as this accumulates.
4. ~~Reviews aren't visible on Marketplace cards yet.~~ **Done.** A ratings badge now appears on Marketplace cards once a business has published reviews.
5. **The letterbox photo-banner technique built for events should become the house default** for any future feature that turns an arbitrary user photo into a full-width banner, rather than re-solving the same crop problem from scratch each time.

---

## Known limitations (explicitly out of scope, for now)

- Full Facebook Page OAuth — blocked on Meta App Review, not buildable yet.
- Google Ads management — entirely unscoped; everything built so far is Meta-only.
- Uptime monitoring status unconfirmed; error monitoring not built.
- Bolt's newer composable template library — reviewed, deliberately parked.
- Recurring/multi-session events — a single multi-day event works; several distinct sessions per listing does not, not scoped.
- Booking & Shop payment collection is manual (business and customer arrange it directly) and there's no live courier shipping yet — both are upcoming build sprints, not scoped out permanently.

---

*Source of truth: [`docs/PLATFORM_OVERVIEW.md`](PLATFORM_OVERVIEW.md) in the DigitalFlyer Growth repository. This page is a formatted summary of that document for business review — the repo file is authoritative and updates with every build.*
