# GROWTH_CONSOLIDATED_SPRINT_BUILD_SPEC_CLAUDE.md

## 0. How To Work This Document

This is one complete sprint, not a queue of separate files. Work through it top to bottom in the order given in Section 6. Do not wait until the entire document is finished to check in.

- **Stop and prompt Dewald whenever a decision, confirmation, or piece of information is actually required to proceed** (see Section 2, several items there need a real answer before the affected work can start).
- **Prompt Dewald when each numbered part is complete** (Part A, then Part B), not just at the very end, so he has visibility as this moves rather than one big reveal.
- If something in this document turns out to already be built, or built differently than described here, report that back rather than silently overwriting it or silently assuming it's fine.

## 1. Context

DigitalFlyer Growth is live in production at `growth.digitalflyersa.co.za`, Paystack in live mode, real transactions flowing. Uptime monitoring is confirmed active. This document merges the next operational sprint with the new Agent Referral programme build into a single, complete handoff, plus a short reconciliation pass against decisions made in earlier planning sessions that may not have made it into the live build.

## 2. Verification & Reconciliation Pass, Do This First

Before starting new build work, confirm the status of the following. Several of these were decided or fixed in earlier sessions and should already be live, this is a confirmation pass, not a rebuild, unless something below turns out not to actually be the case, in which case treat it as urgent and report back immediately.

### 2.1. Likely already fixed, confirm with a quick regression check
- **Account data cross-contamination bug.** Previously, one authenticated session could display another client's dashboard data, traced to invite-link session handling and Row Level Security. The subsequent email/password auth rewrite and the RLS/authorization audit both directly target this area and are confirmed live. Run the original regression test: log out fully, open a fresh invite link for account A, confirm A's data loads, then without logging out, open a fresh invite link for account B in the same browser, confirm B's data loads, not A's. This was a data privacy issue, confirm it explicitly rather than assuming.
- **Social image generation pipeline bug.** Previously, generated Facebook/Instagram assets could fail silently with invalid URLs. The current live platform overview states branded social image generation is not only live but now also powers real Marketplace card thumbnails, which would not work reliably if this bug were still present. Generate one asset of each available content type and confirm each produces a valid, viewable, downloadable image, and that a deliberately broken case (invalid source image) shows a clear error rather than failing silently.

### 2.2. Needs a direct answer, real discrepancy found
- **"Founding Business" vs "Day One Business."** An earlier planning session confirmed a decision to rename this from "Founding Business" to "Day One Business" across all user-facing copy, keeping underlying field names unchanged. The current live platform still uses "Founding Business" everywhere, including the pricing page and the counter. **Confirm with Dewald: was this rename decision reversed, or did it not make it into the build?** Do not rename anything until this is confirmed, all existing marketing content and documentation currently uses "Founding Business" too.
- **Founding Business Enterprise access window.** An earlier planning session corrected this explicitly: Founding/Day One members get **permanent** Enterprise access for as long as they maintain the annual plan, not a 2-year window. The current live functional spec still documents "2 years of Enterprise access once it launches." **Confirm with Dewald which is actually correct**, then check whether the underlying billing logic matches. This is a real promise to paying members, worth getting right before Enterprise has a live checkout to test it against.

### 2.3. Worth a quick check, lower stakes
- **Marketplace URL field.** An earlier session confirmed a decision to split "Website URL" (client-facing) from a separate, admin-only "Marketplace URL" field. The current live overview describes the Marketplace listing linking to the client's own website URL, with no mention of a separate admin-managed field. Confirm which behaviour is actually live, this affects whether admin has independent control over Marketplace listing links.

## 3. Part A: Operational Fixes & Foundations

### 3.1. RE:Biz Nomads should not have a WhatsApp CTA
RE:Biz Nomads' page currently has a "Message us" WhatsApp CTA. This was not the intended design, WhatsApp is reserved specifically as a Growth onboarding entry channel, and RE:Biz Nomads is a free bundled benefit of Growth membership, not something joined independently. Remove the WhatsApp CTA entirely, replace it with a CTA directing visitors to join DigitalFlyer Growth, framed around what joining unlocks: access to the RE:Biz Deal Room and community activities. Link through to `/pricing` or the signup flow. The existing RE:Biz contact form stays as is, this only affects the WhatsApp-specific button.

### 3.2. WhatsApp number activation is blocked, not forgotten
`NEXT_PUBLIC_WHATSAPP_NUMBER` is missing from Vercel's production environment, but the WhatsApp Business number itself is still pending approval on Meta's side. Do not chase this as an urgent task, it is externally blocked. In the meantime, the dashboard's Enterprise upsell CTA, which also depends on this number, should point to a working fallback contact method (email, dewald@digitalflyer.co.za) instead of sitting silently broken while waiting on Meta. Swap it back to WhatsApp once the number is actually approved and live.

### 3.3. Error monitoring
Uptime monitoring is confirmed active, this item now covers error monitoring only. Add a lightweight error monitor, Sentry or equivalent, wired into the Next.js frontend and server-side API routes and webhook handlers, especially the Paystack webhook and the WhatsApp webhook. Confirm alerts actually reach Dewald.

### 3.4. Member-facing analytics, page-view tracking
Lightweight page-view counter on each client's public page, written asynchronously so it never slows page render. Surface a simple count, ideally a basic trend, on the client dashboard. This also becomes the future ranking signal for Marketplace's "most visited" sort, not building that sort mode itself this sprint, just the underlying tracking.

**Part A is complete when:** RE:Biz's CTA is corrected, the Enterprise upsell fallback is live, an error monitor is capturing real errors and alerting Dewald, and page views are tracked and visible on the client dashboard. Prompt Dewald at this point before continuing to Part B, per Section 0.

## 4. Part B: Agent Referral Programme

### 4.1. Project Overview
A dedicated agent referral programme for DigitalFlyer Growth, distinct from Growth's existing member base. Agents are not necessarily Growth customers themselves, they apply, get approved, and actively promote Growth to their own network in exchange for recurring commission on the annual memberships they bring in. This mirrors a programme already running on the legacy DigitalFlyer Core platform, rebuilt here for Growth specifically.

Audience type: mixed. The application and terms page is public facing, the agent's own tracking view is a logged-in dashboard experience, and approval/payout tracking is admin facing. Brand direction: matches the existing Growth brand, no new visual direction needed.

### 4.2. Confirmed Decisions
- **Commission tiers.** Referrals 1 through 10 earn 25%. Referral 11 onward earns 40%. No gap.
- **Enterprise.** The commission-eligible tiers are Growth annual and Enterprise annual once Enterprise has a live checkout. Foundation and any monthly plan are never eligible.
- **Non-renewal or cancellation mid-term.** Commission is only marked payable once the member's annual payment has actually cleared, not on signup, so a cancellation before payment simply means no commission was ever earned for that period. No clawback logic needed.
- **Tier is agent-wide and re-evaluated live, not locked per referral.** See Section 4.5.
- **Payout is manual, permanently.** Not staged toward automation, see Section 4.7.

### 4.3. Still Open
- **Referral link attribution window.** Recommending 30 days between a link click and a signup still counting as that agent's referral. Confirm or adjust.

### 4.4. Agent Application & Approval
Public route, something like `/agents/apply`, reachable from a footer link, not gated behind any existing login.

**Before the form starts:** a plain language explanation page covering exactly how commission works, referrals only count on Growth and Enterprise annual plans, never Foundation or monthly, the 25%/40% tiering, and that commission repeats every year a referred member renews. Include a short terms section: agents are independent, not employees, responsible for their own tax, and payment happens via direct bank transfer once a referral's annual payment has cleared. This copy should read as a straightforward agreement, not fine print, and is worth a legal pass before public launch, same as the Growth Privacy Policy and Terms were flagged for review.

**Application form fields:**
- Full name
- Email
- WhatsApp number
- Facebook page link
- Do you understand how Facebook group rules and posting work (short text or yes/no plus detail)
- Can you generate your own creatives and content (short text or yes/no plus detail)
- How will you be promoting: mainly Facebook posts, actively reaching direct networks beyond Facebook, or both (single select)

Submission creates an `agents` record with `status = pending`. No payment step, no account creation yet, this is an application only.

**Admin review:** a new section in `/admin`, styled consistently with the existing "needs Meta help" queue. Lists pending applications with their answers, approve or reject. Approving triggers:
- `status` set to `approved`
- A unique short referral code generated (for example `growth.digitalflyersa.co.za/r/[code]`)
- An invite email sent, directing them to set up their free Growth account and complete payout setup

### 4.5. The Agent's Free Growth Account
Approved agents get a genuinely free Growth membership to promote their own agency, not a discount code, an actual comped account. They go through the normal Growth onboarding wizard so their agency gets a real page, same as any paying member, but with an `is_agent_comped` flag on that `growth_clients` record that skips the payment step entirely, no Paystack checkout for this account. This reuses the existing onboarding flow rather than building a separate one. This account is explicitly for promoting their referral agency, not a general business of theirs, state this plainly in the onboarding copy for agent-comped accounts.

### 4.6. Referral Link & Attribution
- Each approved agent gets one short, unique referral code.
- Visiting `growth.digitalflyersa.co.za/r/[code]` sets an attribution cookie (30 days, per Section 4.3) and redirects to `/pricing`.
- When a new `growth_clients` signup completes, check for the attribution cookie and, if present, write `referred_by_agent_id` onto that new client record.
- Referral only becomes commission-eligible once that client's plan is Growth annual or Enterprise annual and their Paystack payment has actually succeeded, not at signup.

**Basic anti-fraud, build in from the start:**
- An agent's own email, phone, or linked account cannot count as their own referral.
- The same business (matched by email or phone, consistent with the ecosystem's existing member-matching convention) cannot be counted as a fresh referral twice, even across different agent codes.

### 4.7. Commission Calculation & Ledger
New table, `commission_ledger`, one row per commission-earning event, not a single running total. This is the audit trail that prevents disputes about what was and wasn't paid.

Fields (starting point): `id`, `agent_id`, `referred_client_id`, `period_year`, `rate_applied` (25 or 40), `amount_due`, `status` (`pending`, `approved_to_pay`, `paid`), `paystack_transfer_reference` (nullable until paid), `paid_at` (nullable), `created_at`.

**Tier is a live, agent-wide status, not something locked in per referral.** An agent's tier is determined by their total count of ever-converted paying referrals: 10 or fewer lifetime conversions, 25%, 11 or more, 40%. This rewards agents for keeping their earlier referrals renewing, since crossing into 40% lifts every one of their referrals, past and future, from that point forward. A client referred back when the agent was still in the 25% bracket pays 40% on its next renewal if the agent has since crossed the threshold.

**When a commission-eligible payment succeeds** (via the existing Paystack webhook already handling `growth_clients` subscription payments, no new payment path needed), whether it's a brand new referral's first payment or an existing referral's renewal:
1. Confirm the client has `referred_by_agent_id` set and their plan qualifies.
2. Look up the agent's current total count of ever-converted paying referrals, evaluated fresh at this moment, not cached.
3. Apply 25% if that count is 10 or fewer, 40% if 11 or more.
4. Write a new `commission_ledger` row for this payment event, `status = pending`, storing the rate actually applied so the historical record stays accurate even as the agent's tier changes later.

Example: an agent's 11th referral converts. From that moment on, every renewal, including the original 10 referrals renewing next year, calculates at 40%, not the 25% those first 10 were originally earning.

### 4.8. Payout, Manual, Via Paystack Transfer Recipient, Not Subaccounts
Dewald pays agents manually. This uses Paystack's **Transfer Recipient** object, not a Subaccount, a Subaccount is Paystack's mechanism for automatic split payments fired at the moment of the original transaction, the wrong tool here, same reasoning already established for Stoep Marketplace's escrow design. A Transfer Recipient is a stored payout destination sent to manually, on your own schedule.

**Bank details, without storing them:** after approval, the agent completes a "Payout Setup" step, a form asking for bank name, account number, and account holder name. This submits server-side directly to Paystack's Create Transfer Recipient API. Paystack stores the actual bank details on their side. Store only the `recipient_code` Paystack returns on the `agents` record, never the raw bank details.

**Payout flow, manual, ledger-driven:** admin sees every pending commission line item in `/admin`, grouped by agent, marks a batch as `approved_to_pay`, transfers the money manually, then marks those ledger rows `paid` with a reference note. The ledger is what makes this trackable and dispute-proof, every commission a business ever owed or paid is a discrete, timestamped row. Automated payout via the Transfers API is not planned. If that ever becomes worth revisiting, the `recipient_code` already being stored means it would be a small addition later, not a rebuild.

### 4.9. Admin Visibility (`/admin`, new Agents section)
- List of all agents: name, status, referral count, current tier, total unpaid commission, total paid to date.
- Per-agent detail page: their referral list (each referred client, plan, signup date, payment status), their full commission ledger, and the payout action from Section 4.8.
- CSV export, consistent with the existing client list export.

### 4.10. Agent-Side Dashboard
Agents log in through the same auth system as any Growth member. Add an "Agent" section to the dashboard, visible only when the logged-in user has an `approved` agent record, alongside their existing dashboard views, reusing the account structure already built for the multi-account switcher.

Shows, scoped to their own data only:
- Their referral link, ready to copy
- Their referral list: business name, signup date, payment status, commission status
- Their running totals: total referrals, current commission tier, total earned, total paid, total still owed
- Their current tier and how many referrals until the next tier, crossing from referral 10 into referral 11 is the milestone that lifts their rate to 40%, worth surfacing clearly

### 4.11. Notifications
- Agent applies: confirmation email.
- Agent approved: invite email with next steps.
- Agent rejected: polite email, no reason required in the automated message.
- New referral converts to a paying annual member: notify the agent.
- Commission marked paid: notify the agent with the amount and reference.
- Agent crosses into the 40% tier (referral 11): a specific milestone email, and a reminder that it now also applies to their earlier referrals' renewals.

**Part B is complete when:** the application and approval flow is live, referral links track correctly, the commission ledger calculates correctly against the live Paystack webhook (test with the tier-crossing scenario in Section 4.7's example), admin has full visibility, and the agent dashboard is live. Prompt Dewald at this point, per Section 0.

## 5. Flagged For Awareness, Not This Sprint

These are real, still open, and worth Dewald knowing about, but are not engineering work for this sprint.

- **POPIA compliance workstream.** Needs a legal review pass, not just engineering: Privacy Policy reflecting actual current practice, confirmation the Pixel consent banner satisfies POPIA specifically, a defined retention policy for leads, a data subject deletion/export process, and confirmation the weekly backup process can honour a deletion request on a defined schedule. Flagged previously, still open, worth not letting slip indefinitely given real personal information is flowing through the platform today.
- **Rate limiting is in-memory, not distributed.** Fine at current scale, already acknowledged in the platform's own known limitations. A future scaling concern, not urgent now.

## 6. Full Build Order

1. Section 2, verification and reconciliation pass, including the two items that need Dewald's direct answer before proceeding further on anything they touch.
2. Part A, in the order listed (3.1 through 3.4).
3. Check in with Dewald, Part A complete.
4. Part B, in the order listed (4.4 through 4.11).
5. Check in with Dewald, Part B complete, full sprint done.

## 7. Out Of Scope, Do Not Build This Sprint

- No dual-page routing or additional custom page architecture work.
- No Enterprise live checkout build.
- No swap of the placeholder "See It In Action" sample pages.
- No mobile performance root-cause work.
- No chasing the WhatsApp number activation itself, that is on Meta's timeline.
- No extension of the Agent Referral programme to RE:Biz Nomads, Stoep, or Core.
- No automated payout via the Transfers API for agents, manual only.
- No public agent leaderboard or agent-to-agent visibility.
- No POPIA legal work, flagged for awareness only, per Section 5.

## 8. Acceptance Checklist

**Verification pass**
- [ ] Account data cross-contamination regression test passes
- [ ] Social image generation produces valid assets for every content type, and fails visibly (not silently) when deliberately broken
- [ ] "Founding Business" vs "Day One Business" naming confirmed with Dewald
- [ ] Founding/Day One Enterprise access window (permanent vs 2 years) confirmed with Dewald and checked against billing logic
- [ ] Marketplace URL field behaviour confirmed

**Part A**
- [ ] RE:Biz Nomads WhatsApp CTA removed, replaced with a Join Growth CTA
- [ ] Dashboard Enterprise upsell CTA temporarily points to email, not WhatsApp
- [ ] Error monitor installed and confirmed capturing real errors, including webhook handlers
- [ ] Error alerts confirmed reaching Dewald
- [ ] Page-view counter live and incrementing, visible on the client dashboard

**Part B**
- [ ] Agent application and approval flow live
- [ ] Referral link generation and attribution working
- [ ] Commission ledger calculating correctly, including the tier-crossing renewal scenario
- [ ] Admin Agents section live with full visibility and manual payout tracking
- [ ] Agent-side dashboard live
- [ ] All agent notifications firing correctly
