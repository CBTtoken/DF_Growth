# DigitalFlyer Growth — Functional Spec & Roadmap Review

**Updated 15 July 2026 (post-launch build)**

A working summary for business review — what's live in production today, what's deliberately parked, and a ranked starting point for the next build cycle.

For the full detailed technical spec (every field, every step, every edge case), see [`PLATFORM_OVERVIEW.md`](PLATFORM_OVERVIEW.md) in this same folder — that file is the authoritative source of truth and updates with every build. This document is a condensed version of it, formatted for a business-side read rather than a build reference.

---

## ✅ Go-live confirmed, plus a real post-launch build cycle

Paystack switched to live mode — live keys, live subscription plans, live webhook — verified end-to-end with a real checkout that reached a genuine Paystack payment page at the correct price. Since go-live, a real Marketplace directory, a second custom-page instance (RE:Biz Nomads), a multi-account switcher, and admin visibility/delete controls have all shipped and been verified live.

| | |
|---|---|
| **Status** | Live |
| **Functional areas shipped** | 23 |
| **Backlog candidates** | 7 |
| **Pricing** | Foundation R100/mo · Growth R180/mo or R1,199/yr |

---

## What's 100% in place (23 areas)

Everything below is built, deployed, and verified against the live production site.

| Area | What's there |
|---|---|
| **Pricing & tiers** | Foundation (free trial), Growth (monthly/annual), Founding Business slots — Enterprise priced but not yet purchasable |
| **Web onboarding** | 7–9 step guided wizard, autosave/resume, AI-drafted landing copy, 10 real templates, now including an optional city field |
| **WhatsApp onboarding** | Full signup-to-payment conversation, resumable, same data model as web |
| **Email + password login** | Real password auth, magic-link fallback for pre-existing accounts, forgot/reset flow |
| **Public client pages** | Hero, about, services, packages, testimonials, gallery, map, lead form, cookie-gated Meta Pixel |
| **Custom pages (x2)** | Standing 365 (order flow, live payment, seller-side order dashboard) and RE:Biz Nomads (contact form, Facebook group links) — a reusable page type, not a one-off |
| **Client dashboard** | Template switching, photo/testimonial management, social asset generator, leads, orders, plan management |
| **Multi-account switcher** | A login owning more than one member account can switch between them from the dashboard — needed the moment a second custom page existed under one login |
| **Marketplace directory** | Real browsable/searchable page — search box, industry filter, city filter, photo-thumbnail cards, sorted by recently-added |
| **Admin panel** | Full client list, CSV export, Meta-help queue, signup channel visibility |
| **Admin Danger Zone** | Deactivate/reactivate a page, or permanently delete an account — closes a real gap found when leftover test accounts had no removal path |
| **Automated lifecycle emails** | Invite, welcome, trial reminders, nudges, lead notifications, order/fulfilment emails — house style throughout |
| **Meta Conversions API** | Server-side pixel tracking with consent gate, encrypted token storage, delivery status visible in dashboard |
| **Paystack — live mode** | Subscriptions and one-time checkout, both webhook-driven, idempotent on transaction reference |
| **Security hardening** | RLS + authorization audit, CSP/security headers, rate limiting on every public write, CI vulnerability gate |
| **Automated backups** | Weekly full database dump, independent of Supabase's own plan tier |
| **Scheduled jobs** | Daily trial reminders, daily onboarding nudges, weekly backup — all via GitHub Actions |
| **Mobile pass** | Header, forms, order flow, template picker all verified against real narrow-viewport bugs |
| **Photo & asset system** | Client uploads or Pexels stock fallback by industry, branded social image generation, now also powering Marketplace card thumbnails |
| **Ecosystem identity groundwork** | `digitalflyer_member_ref` in place on every client — ready for future cross-product account matching |
| **Domain & infrastructure** | `growth.digitalflyersa.co.za`, SSL, correct redirect config, custom-domain routing |
| **City taxonomy** | ~50 major South African cities/towns, powering both onboarding and the Marketplace filter |
| **RE:Biz Nomads info page** | Dedicated, real content, real contact form, both Facebook group links |
| **Cascading admin delete** | Real delete respects every foreign-key relationship, including a table with no auto-cascade — verified against two real leftover test accounts |

---

## Backlog — next build candidates (7 items)

Re-ordered now that the Marketplace directory is live and no longer on this list.

1. **Uptime + error monitoring** — confirm UptimeRobot is actually active; add a lightweight error monitor (Sentry or similar). Directly asked about and confirmed still open — not done yet.
2. **Member-facing analytics** — page-view tracking, both as its own dashboard feature and as the future ranking signal for "most visited" in the Marketplace.
3. **Main page + additional custom page architecture** — today one member = one routable page. Two real custom-page instances now exist (both under one login, via the account switcher), proving the mechanism twice — true dual-page-per-member support still needs real routing-layer design.
4. **Enterprise live checkout** — pricing card exists as "Coming soon"; needs the real plan, checkout wiring, and feature scope defined.
5. **Real client showcase** — swap the 3 placeholder "See It In Action" sample pages for real, permission-granted member pages.
6. **Meta ad-asset compliance pass** — verify generated social images actually meet Meta's real campaign size/format requirements.
7. **Mobile performance root-cause** — ~2.3s warm LCP on throttled mobile (target 1.5s), parked without root cause.

**Small, near-zero-effort item, not really "backlog":** `NEXT_PUBLIC_WHATSAPP_NUMBER` is missing from Vercel's production environment — every WhatsApp CTA button that depends on it has been silently invisible live. Fix given; needs Vercel env var + redeploy, then a quick confirmation pass.

---

## Known limitations (explicitly out of scope, for now)

- Full Facebook Page OAuth — blocked on Meta App Review, not buildable yet.
- Google Ads management — entirely unscoped; everything built so far is Meta-only.
- No page-view/analytics tracking anywhere in the platform yet (see Backlog #2).
- Uptime monitoring status unconfirmed; error monitoring not built (see Backlog #1).
- Bolt's newer composable template library — reviewed, deliberately parked.

---

*Source of truth: [`docs/PLATFORM_OVERVIEW.md`](PLATFORM_OVERVIEW.md) in the DigitalFlyer Growth repository. This page is a formatted summary of that document for business review — the repo file is authoritative and updates with every build.*
