# DigitalFlyer Growth, Claude Project Handoff & Knowledge Base

**Purpose of this document:** the single, self-contained brief for a fresh Claude working on DigitalFlyer Growth in a dedicated Claude Project. It captures what the product is, what has been built, where things stand, the non-negotiable rules, and how to work with Dewald. Upload this file (plus the attachments listed at the end) into the Project's knowledge, and paste the Instructions Block (last section) into the Project's custom instructions.

*Last updated: 26 July 2026.*

---

## 1. What DigitalFlyer Growth is

A growth-as-a-service platform for budget-sensitive South African small businesses. It gives a business a professional, conversion-optimised online page, AI-generated branded social media assets, a marketplace listing, reviews, and (for higher tiers) managed Meta ad campaigns with server-side conversion tracking. Sold as a monthly software-with-a-service product, not a traditional agency engagement.

- Runs as its own business, its own domain, its own codebase and infrastructure. Branded under the DigitalFlyer name but **technically separate** from DigitalFlyer SA (the existing platform) and RE:Biz Nomads.
- Live app domain: **growth.digitalflyersa.co.za**. Related domains: digitalflyer.co.za, digitalflyersa.co.za.
- Owner/operator: **Dewald Rosema** (see Section 8). Solo build; Claude writes all the code.

**Tiers (pricing directional, not final):** Foundation (page + brand kit + monthly assets, client posts manually, optional marketplace listing), Growth Engine (adds Meta CAPI tracking, weekly assets, managed campaign monitoring), Enterprise (adds custom multi-page build via DigitalFlyer SA, priority). Foundation has a real free 7-day trial (no card). Full strategy in `business-plan.md`.

---

## 2. Tech stack

- **Next.js (App Router), v16.x** on **Vercel**. NOTE: this is a newer Next than most training data; check `node_modules/next/dist/docs/` before assuming APIs. Vercel function region is **Frankfurt (fra1)**, co-located with Supabase for latency.
- **Tailwind CSS v4** (CSS `@theme`, not a JS config). Gotcha: `@apply` cannot reference another custom component class, only real utilities.
- **Supabase**: Postgres + Auth + Storage. Access via `@/lib/supabase/{client,server,admin}`. The admin client uses the `sb_secret_...` key. RLS is on; some tables (e.g. `book_orders`) do not grant DELETE to the API role, so deletes there must run as owner via the SQL Editor.
- **Paystack**: payments (subscriptions + one-time book orders). Webhook at `src/app/api/webhooks/paystack/route.ts`, keyed for idempotency on the Paystack transaction reference.
- **Resend**: transactional + campaign email via `@/lib/email/resend` (`sendEmail`). Custom sending domain still pending DNS; watch `RESEND_FROM_EMAIL`.
- **Meta Pixel + Conversions API (CAPI)**: two layers, per-client (`src/lib/meta/capi.ts`, reads each client's own pixel + encrypted token) and DigitalFlyer-own (`src/lib/meta/digitalflyer-capi.ts`, the platform's own pixel `974569028893466` + env token). Consent-gated browser pixel via `PixelConsentGate` / `MetaPixelScript`.
- **Anthropic SDK** for AI copy generation (`src/lib/ai/`). Always strip ```json fences before JSON.parse on LLM output.
- **Others**: Pexels (stock images), ScreenshotOne (real page screenshots), Cloudflare Turnstile (bot protection on reviews), GA4 (gtag), Sentry (errors).
- **Auth model**: email + password, plus magic-link for first login. `/login`, `/set-password`, `/forgot-password`, `/reset-password`.
- **Env/keys**: never inline secrets into shell commands (leaks into permission allowlists); source them. `APP_ENCRYPTION_KEY` (HMAC + encrypt), `CRON_SECRET`, Paystack/Resend/Supabase/Meta keys, `NEXT_PUBLIC_DIGITALFLYER_META_PIXEL_ID`, `DIGITALFLYER_META_CAPI_ACCESS_TOKEN`.

---

## 3. What is built (feature inventory)

- **Public site**: home/pricing (`/pricing` is the real home page; `/` redirects to it), how-it-works, FAQ, marketplace, shop, events, agents, legal pages.
- **Signup + onboarding**: self-serve tier signup (`startCheckout`), guided wizard (business info, brand kit + logo + colour, AI-drafted copy, services, packages, template pick, Meta connect). Foundation is a no-card trial; paid tiers pay at the end of the wizard.
- **Client landing pages**: 10 templates (Classic Conversion + 9 "anchored" templates with a token system in `src/lib/templates/anchors.ts`, distinct heroes, fonts, card recipes, spacing, section layouts). Plus hand-built **custom pages**: Buffelskop, HelpLift, Standing 365 (the book).
- **Marketplace** (`/marketplace`): real businesses, "Near me" geo sort, rating only (no fake stats, verified badge deferred). Reviews via OTP + Turnstile.
- **Reviews**: reviewer accounts, OTP email verification, submission + public display on business pages.
- **Booking & Shop**: core flows built (Sprint 1-3). **Transactional payments not yet built** (see Section 5).
- **Agents / referral programme**: referral cookie + attribution + commission ledger. JozyMee is the first agent.
- **Reactivation**: 29 previously-lapsed businesses reactivated with 30-day free Growth + nudge emails (July 2026).
- **Email system**: Resend send + real unsubscribe (HMAC tokens) + suppression fields (`email_unsubscribed_at/bounced_at/complained_at`) + bounce/complaint webhook + staged batch send with bounce auto-stop.
- **Onboarding nudge**: bounded 3-touch sequence chasing unfinished signups, stops on finish/unsubscribe/bounce (`src/app/api/cron/onboarding-nudge`).
- **Crons**: daily fan-out, trial reminders, onboarding nudge, expire events, refresh screenshots. Vercel Cron / GitHub Actions, `CRON_SECRET`-gated.
- **Admin**: full data view, CSV export, reactivation batch view, orders.
- **Meta ad campaigns (live)**: see Section 4.

---

## 4. Meta ad campaigns (live, and the model to reuse for members)

DigitalFlyer runs its own Meta campaigns as a live rehearsal for the future member offering. Two are live (launched 25-26 July 2026), both on ad account **Digital Flyer (979705365794025)**, pixel **Growth_DigitalFlyer SA `974569028893466`**:

1. **Signups (Leads objective)**: optimises for `CompleteRegistration` on website signup. Client pixel + server CAPI, deduped by a shared `event_id` threaded through the thank-you page `?ev=`.
2. **Standing 365 book (Sales objective)**: optimises for `Purchase` (value-based) on the book's Shop checkout. Server `Purchase` fires from the Paystack webhook (event_id = Paystack reference), browser `Purchase` on the order-success screen, `InitiateCheckout` when checkout starts. Standing 365's `meta_pixel_id` is set to the DF pixel so its consent gate loads it.

**The full playbook is in `docs/meta-ads-playbook.md`** (Parts A-G signups, Part H product sales), including every gotcha and the automation blueprint. This is the curriculum for eventually offering Meta campaign management to members (automate / step-by-step / done-for-them).

---

## 5. What is pending / next

- **Booking/Shop transactional payments (deferred "Sprint 4")**: member chooses (a) their **own Paystack** account (preferred, DF is software-only, no fee, seller is merchant of record) or (b) **DF integrated split** via Paystack subaccounts at a **flat 7% all-in** (DF absorbs Paystack's fee out of the 7%). Liability sits on the **seller** via terms. Path choice lives in the member back office. Detailed terms + chargeback policy deliberately deferred. See `project_booking_shop_payments_approach` memory.
- **Sprint 5** Bob Go live shipping, **Sprint 6** WhatsApp order/booking notifications (both parked ~1 week from 26 July), **Sprint 7** production hardening (only after 4-6).
- **Template redesign**: Batch 1 done (Feature Grid / Step-by-Step / Multi-Product got distinct new heroes; Dark Mode was already rebuilt). Batch 2 (Left-Split, Social-Proof, Vibrant-Geo body sections) and Batch 3 (Single-Action, Storyteller, App-Dashboard polish) still to do.
- **Deletion-warning emails**: columns exist (`deletion_warning_14d/5d_sent_at`); needs a "pause comp account when trial_ends_at passes with no subscription" step first. Nothing due for deletion before ~mid-Sept.
- **Member queries/notifications (built 26 July 2026)**: enquiries now email a notification (a homepage "Get in touch" emails DigitalFlyer with a Support-tab link; a member page lead already emails the member), and the member dashboard has lead management, a "X new" count + per-lead "New" badge, one-tap Email/Call/WhatsApp quick-reply, and a "Mark as handled" toggle (`leads.handled_at`). WhatsApp notifications deferred to the Sprint 6 pass.

---

## 6. Absolute standing rules (do not break)

These are hard rules from Dewald, several learned the hard way:

- **No em dashes, ever**, in any DigitalFlyer content, copy, email, or page. Use commas or restructure. Strip them from any ported text.
- **"Marketplace", never "directory" or "listing"** for the platform, anywhere.
- **Correspondence voice**: "DigitalFlyer SA". Open with **"Good day {name},"**, never "Hi there". No em dashes.
- **Never email an unsubscribed/bounced/complained business.** Non-renewed or unsubscribed businesses are permanently deleted after 60 days (POPIA), guarded and confirmed per run, never an unattended auto-delete.
- **Never trigger real email/SMS to invented test addresses** (caused a real Supabase bounce-rate warning). Use Dewald's own `+alias` addresses for tests.
- **Verify a new DB column exists live before pushing code that queries it** (a missing column once caused an outage). Hand SQL to Dewald inline to run, then confirm.
- **Always paste SQL inline**, never "the query above".
- **Idempotency** keys on the provider's transaction reference, never a name/slug derived from user data.
- **Strip ```json fences** before JSON.parse on LLM output.
- **Secrets**: source env vars in commands, never inline literal secret values.
- **Confirm before destructive actions** (deleting data, dropping tables, force pushes). Look at what you are deleting first.

---

## 7. Key decisions & context worth knowing

- **Vercel region** moved to Frankfurt (co-located with Supabase) for latency; earlier was Cape Town.
- **Buffelskop commission override**: Natasha's referral honoured at 40% (not standard 25%); needs a manual ledger correction when Buffelskop's trial converts (~2026-08-01).
- **Standing 365** is Dewald's own book, sold via its own Shop (DF keeps 100%, manual flat-rate R75 shipping). Standard R299/copy, personalised R385, + R75 delivery.
- **HelpLift** rebuilt on a new Supabase project (2026-07-21), live at helplift.vercel.app.
- Home page + marketplace + shop/events were reskinned from Bolt designs (bold gradient heroes, floating preview cards); "make it genuinely distinct, not boring" is the bar.
- **GoTrue latent bug**: admin `/users?email=` returns ALL users; always exact-match in code, never trust `users[0]`.
- **Supabase RETURNING**: `.insert().select()` fails RLS on new projects unless the inserter can also SELECT the new row.

---

## 8. Who Dewald is, and how to work with him

- **Dewald Rosema**, product owner. **Non-technical**: he does not read or write code and does not want to. He drives decisions and tests everything.
- **Explain in plain language.** For any dashboard task (Vercel, Supabase, Paystack, Meta Ads Manager, Events Manager), give **click-by-click, one-step-at-a-time** guidance, and ask for a screenshot rather than assuming. Do not use shorthand.
- **He often grants full autonomy** ("do what you need to, you know what I'm after"). When he does, act and deliver; verify your own work (typecheck, lint, build) rather than asking him to check code.
- **Confirm destructive or outward-facing actions** before doing them.
- He values momentum and honesty. Give a recommendation, not a survey of options. Flag risks plainly. Celebrate real wins briefly.
- Cashflow matters: sales/signups fund the memberships and the ads. Keep that commercial reality in view.

---

## 9. How this Claude Project should operate

- This is a **companion/advisory Project in Claude home** (claude.ai), not the coding harness. It will not have direct file/repo access unless you connect the GitHub repo or upload files. So:
  - For **code changes**, the actual editing still happens in the coding tool (Claude Code) against the repo. This Project's job is planning, guidance, marketing help, dashboard walk-throughs, drafting copy/emails, campaign strategy, and answering "where are we / how does X work".
  - Keep answers grounded in the attached docs. If a fact is not in them, say so rather than guessing, and ask Dewald or defer to a code check.
- **Marketing assistance** this Project can own: ad copy, campaign structure, audience/creative strategy, email/nudge copy (in the DigitalFlyer SA voice, no em dashes), reading campaign results and recommending tweaks, and the member Meta-management offering design.
- When a task needs real code or DB changes, say so and hand it to the coding session with a clear spec.

---

## 10. Attachments to add to the Project knowledge

Upload these alongside this handoff:
1. **This file** (`CLAUDE_PROJECT_HANDOFF.md`) — the master brief.
2. **`docs/meta-ads-playbook.md`** — the full Meta campaign playbook (signups + product sales + automation blueprint).
3. **`docs/business-plan.md`** — the strategy, tiers, positioning, go-to-market.
4. **`README.md`** and **`AGENTS.md`** — repo setup + the Next.js version note.
5. Optionally connect the **GitHub repo** (`CBTtoken/DF_Growth`) if the Project supports it, for live code context.

---

## Instructions Block (paste into the Claude Project's custom instructions)

> You are the product and marketing partner for **DigitalFlyer Growth**, a growth-as-a-service platform for South African small businesses (professional pages, AI social assets, marketplace, reviews, booking/shop, managed Meta ads). You work with **Dewald Rosema**, the non-technical owner. Read the attached `CLAUDE_PROJECT_HANDOFF.md` first, it is the source of truth for state, architecture, and rules; then `meta-ads-playbook.md` and `business-plan.md`.
>
> **How to work:** Explain in plain language, never assume coding knowledge. For any dashboard task (Vercel, Supabase, Paystack, Meta Ads Manager/Events Manager), give click-by-click, one-step-at-a-time guidance and ask for a screenshot. Give a clear recommendation, not a survey. Flag risks honestly. Confirm before anything destructive or outward-facing. You are an advisory Project, not the coding tool, so when a task needs real code or database changes, say so and write a clear spec to hand to the coding session rather than pretending to edit files.
>
> **Absolute rules (never break):** No em dashes, ever, in any content, copy, email, or page. Call the platform a "marketplace", never a "directory" or "listing". Correspondence voice is "DigitalFlyer SA", opening "Good day {name},", never "Hi there". Never email an unsubscribed/bounced business. Never send test messages to invented addresses (use Dewald's own +alias). Confirm before deleting data.
>
> **What you own:** ad copy and campaign strategy, audience/creative recommendations, reading campaign results and suggesting tweaks, email/nudge copy, the member Meta-management offering, and answering "where are we / how does X work" from the attached knowledge. Keep the commercial reality in view: sales and signups fund the memberships and the ad spend.
