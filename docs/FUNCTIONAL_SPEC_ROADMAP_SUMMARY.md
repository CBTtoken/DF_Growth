# DigitalFlyer Growth — Functional Spec & Roadmap Review

**Updated 15 July 2026**

A working summary for business review — what's live in production today, what's deliberately parked, and a ranked starting point for the next build cycle.

For the full detailed technical spec (every field, every step, every edge case), see [`PLATFORM_OVERVIEW.md`](PLATFORM_OVERVIEW.md) in this same folder — that file is the authoritative source of truth and updates with every build. This document is a condensed version of it, formatted for a business-side read rather than a build reference.

---

## ✅ Go-live confirmed, 15 July 2026

Paystack switched to live mode — live keys, live subscription plans, live webhook — verified end-to-end with a real checkout that reached a genuine Paystack payment page at the correct price. Foundation, Growth (monthly & annual), and WhatsApp signup are all real, revenue-generating flows today.

| | |
|---|---|
| **Status** | Live |
| **Functional areas shipped** | 19 |
| **Backlog candidates** | 8 |
| **Pricing** | Foundation R100/mo · Growth R180/mo or R1,199/yr |

---

## What's 100% in place (19 areas)

Everything below is built, deployed, and verified against the live production site.

| Area | What's there |
|---|---|
| **Pricing & tiers** | Foundation (free trial), Growth (monthly/annual), Founding Business slots — Enterprise priced but not yet purchasable |
| **Web onboarding** | 7–9 step guided wizard, autosave/resume, AI-drafted landing copy, 10 real templates |
| **WhatsApp onboarding** | Full signup-to-payment conversation, resumable, same data model as web |
| **Email + password login** | Rewritten this sprint — real password auth, magic-link fallback for pre-existing accounts, forgot/reset flow |
| **Public client pages** | Hero, about, services, packages, testimonials, gallery, map, lead form, cookie-gated Meta Pixel |
| **Standing 365 pilot** | First custom-page member instance — full order flow, live payment, seller-side order dashboard |
| **Client dashboard** | Template switching, photo/testimonial management, social asset generator, leads, orders, plan management |
| **Admin panel** | Full client list, CSV export, Meta-help queue, signup channel visibility |
| **Marketplace & RE:Biz Nomads** | Bundled on every paid tier, no payment gate — no browsable directory page yet (see backlog) |
| **Automated lifecycle emails** | Invite, welcome, trial reminders, nudges, lead notifications, order/fulfilment emails — house style throughout |
| **Meta Conversions API** | Server-side pixel tracking with consent gate, encrypted token storage, delivery status visible in dashboard |
| **Paystack — live mode** | Subscriptions and one-time checkout, both webhook-driven, idempotent on transaction reference |
| **Security hardening** | RLS + authorization audit, CSP/security headers, rate limiting on every public write, CI vulnerability gate |
| **Automated backups** | Weekly full database dump, independent of Supabase's own plan tier |
| **Scheduled jobs** | Daily trial reminders, daily onboarding nudges, weekly backup — all via GitHub Actions |
| **Mobile pass** | Header, forms, order flow, template picker all verified against real narrow-viewport bugs this sprint |
| **Photo & asset system** | Client uploads or Pexels stock fallback by industry, branded social image generation |
| **Ecosystem identity groundwork** | `digitalflyer_member_ref` in place on every client — ready for future cross-product account matching |
| **Domain & infrastructure** | `growth.digitalflyersa.co.za`, SSL, correct redirect config, custom-domain routing |

---

## Backlog — next build candidates (8 items)

Ordered by how directly each one compounds on what's already live — worth a business pass to re-rank against actual priorities.

1. **Marketplace directory + search** — a real browsable/searchable page for member businesses: search box, industry & province filters, card grid. Buildable on existing data, no new search infrastructure needed at current scale.
2. **Member-facing analytics** — page-view tracking, both as its own dashboard feature and as the future ranking signal for "most visited" in the Marketplace.
3. **Main page + additional custom page** — today one member = one routable page. Standing 365 proved the custom-page mechanism; true dual-page support needs real routing-layer design.
4. **Uptime + error monitoring** — confirm UptimeRobot is actually active; add a lightweight error monitor now that real customer payments are flowing.
5. **Enterprise live checkout** — pricing card exists as "Coming soon"; needs the real plan, checkout wiring, and feature scope defined.
6. **Real client showcase** — swap the 3 placeholder "See It In Action" sample pages for real, permission-granted member pages.
7. **Meta ad-asset compliance pass** — verify generated social images actually meet Meta's real campaign size/format requirements.
8. **Mobile performance root-cause** — ~2.3s warm LCP on throttled mobile (target 1.5s), parked without root cause, worth revisiting once launch settles.

---

## Known limitations (explicitly out of scope, for now)

- Full Facebook Page OAuth — blocked on Meta App Review, not buildable yet.
- Google Ads management — entirely unscoped; everything built so far is Meta-only.
- No page-view/analytics tracking anywhere in the platform yet (see Backlog #2).
- No public Marketplace directory/search page yet (see Backlog #1).
- Bolt's newer composable template library — reviewed, deliberately parked.

---

*Source of truth: [`docs/PLATFORM_OVERVIEW.md`](PLATFORM_OVERVIEW.md) in the DigitalFlyer Growth repository. This page is a formatted summary of that document for business review — the repo file is authoritative and updates with every build.*
