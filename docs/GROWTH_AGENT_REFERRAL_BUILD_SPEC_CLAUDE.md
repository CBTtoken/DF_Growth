# GROWTH_AGENT_REFERRAL_BUILD_SPEC_CLAUDE.md

## 1. Project Overview

A dedicated agent referral programme for DigitalFlyer Growth, distinct from Growth's existing member base. Agents are not necessarily Growth customers themselves, they apply, get approved, and actively promote Growth to their own network in exchange for recurring commission on the annual memberships they bring in. This mirrors a programme already running on the legacy DigitalFlyer Core platform, rebuilt here for Growth specifically.

Audience type: mixed. The application and terms page is public facing (a prospective agent applying), the agent's own tracking view is a logged-in dashboard experience, and approval/payout tracking is admin facing.

Brand direction: matches the existing Growth brand, uses the same design system already in place, no new visual direction needed.

## 2. Confirmed Decisions

- **Commission tiers.** Referrals 1 through 10 earn 25%. Referral 11 onward earns 40%. No gap.
- **Enterprise.** Confirmed, the commission-eligible tiers are Growth annual and Enterprise annual once Enterprise has a live checkout. Foundation and any monthly plan are never eligible.
- **Non-renewal or cancellation mid-term.** Commission is only marked payable once the member's annual payment has actually cleared, not on signup, so a cancellation before payment simply means no commission was ever earned for that period. No clawback logic needed.
- **Tier is agent-wide and re-evaluated live, not locked per referral.** See section 6, this changed from the original draft.

## 2a. Still Open

- **Referral link attribution window.** Recommending 30 days between a link click and a signup still counting as that agent's referral, matching common practice. Confirm or adjust.

## 3. Agent Application & Approval

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
- An invite email sent, directing them to set up their free Growth account (their agency's own Growth page) and complete payout setup

## 4. The Agent's Free Growth Account

Approved agents get a genuinely free Growth membership to promote their own agency, not a discount code, an actual comped account. They go through the normal Growth onboarding wizard so their agency gets a real page, same as any paying member, but with a `is_agent_comped` flag on that `growth_clients` record that skips the payment step entirely, no Paystack checkout for this account. This reuses the existing onboarding flow rather than building a separate one.

This account is explicitly for promoting their referral agency, not a general business of theirs. State this plainly in the onboarding copy for agent-comped accounts.

## 5. Referral Link & Attribution

- Each approved agent gets one short, unique referral code.
- Visiting `growth.digitalflyersa.co.za/r/[code]` sets an attribution cookie (30 days, per section 2) and redirects to `/pricing`.
- When a new `growth_clients` signup completes, check for the attribution cookie and, if present, write `referred_by_agent_id` onto that new client record.
- Referral only becomes commission-eligible once that client's plan is Growth annual or Enterprise annual (per section 2) and their Paystack payment has actually succeeded, not at signup.

**Basic anti-fraud, build in from the start:**
- An agent's own email, phone, or linked account cannot count as their own referral.
- The same business (matched by email or phone, consistent with the ecosystem's existing member-matching convention) cannot be counted as a fresh referral twice, even across different agent codes.

## 6. Commission Calculation & Ledger

New table, `commission_ledger`, one row per commission-earning event, not a single running total. This is the audit trail that prevents disputes about what was and wasn't paid.

Fields (starting point): `id`, `agent_id`, `referred_client_id`, `period_year` (which annual cycle this covers), `rate_applied` (25 or 40), `amount_due`, `status` (`pending`, `approved_to_pay`, `paid`), `paystack_transfer_reference` (nullable until paid), `paid_at` (nullable), `created_at`.

**Tier is a live, agent-wide status, not something locked in per referral.** An agent's tier is determined by their total count of ever-converted paying referrals: 10 or fewer lifetime conversions, 25%, 11 or more, 40%. This is deliberate, it rewards agents for keeping their earlier referrals renewing, since crossing into 40% lifts every one of their referrals, past and future, from that point forward. A client referred back when the agent was still in the 25% bracket pays 40% on its next renewal if the agent has since crossed the threshold.

**When a commission-eligible payment succeeds** (via the existing Paystack webhook already handling `growth_clients` subscription payments, no new payment path needed), whether it's a brand new referral's first payment or an existing referral's renewal:
1. Confirm the client has `referred_by_agent_id` set and their plan qualifies (section 2).
2. Look up the agent's current total count of ever-converted paying referrals (count distinct referred clients with at least one successful payment, evaluated fresh at this moment, not cached).
3. Apply 25% if that count is 10 or fewer, 40% if 11 or more.
4. Write a new `commission_ledger` row for this payment event, `status = pending`, storing the rate actually applied so the historical record stays accurate even as the agent's tier changes later.

Example: an agent's 11th referral converts. From that moment on, every renewal, including the original 10 referrals renewing next year, calculates at 40%, not the 25% those first 10 were originally earning.

## 7. Payout, Manual, Via Paystack Transfer Recipient, Not Subaccounts

Confirmed: Dewald pays agents manually. This section covers how bank details are captured safely and what the admin dashboard needs to make manual payouts genuinely easy to track, not how to automate the transfer itself.

**Important terminology correction:** this uses Paystack's **Transfer Recipient** object, not a Subaccount. A Subaccount is Paystack's mechanism for automatic split payments fired at the moment of the original transaction, which is the wrong tool here, same reasoning already established for Stoep Marketplace's escrow design. A Transfer Recipient is a stored payout destination you send money to yourself, whenever you choose, which matches manual payment exactly.

**Bank details, without storing them:** after approval, the agent completes a "Payout Setup" step, a form asking for bank name, account number, and account holder name. This submits server-side directly to Paystack's Create Transfer Recipient API. Paystack stores the actual bank details on their side. Store only the `recipient_code` Paystack returns on the `agents` record, never the raw bank details, this is what solves the "can't legally store it" problem.

**Payout flow, manual, ledger-driven:** admin sees every pending commission line item in `/admin`, grouped by agent, marks a batch as `approved_to_pay`, transfers the money manually (through Paystack's own dashboard, or by initiating a transfer using the stored `recipient_code` outside this app), then marks those ledger rows `paid` with a reference note. The ledger from section 6 is what makes this trackable and dispute-proof, every commission a business ever owed or paid is a discrete, timestamped row, not a running total anyone has to reconstruct from memory.

Automated payout via the Transfers API is not planned. If that ever becomes worth revisiting, the `recipient_code` already being stored means it would be a small addition later, not a rebuild.

## 8. Admin Visibility (`/admin`, new Agents section)

- List of all agents: name, status, referral count, current tier, total unpaid commission, total paid to date.
- Per-agent detail page: their referral list (each referred client, plan, signup date, payment status), their full commission ledger (every line item, its status), and the payout action from section 7.
- CSV export, consistent with the existing client list export.

## 9. Agent-Side Dashboard

Agents log in through the same auth system as any Growth member (their comped account gives them a login). Add an "Agent" section to the dashboard, visible only when the logged-in user has an `approved` agent record, alongside their existing dashboard views, reusing the account structure already built for the multi-account switcher.

Shows, scoped to their own data only:
- Their referral link, ready to copy
- Their referral list: business name, signup date, payment status, commission status (pending, approved to pay, paid)
- Their running totals: total referrals, current commission tier, total earned, total paid, total still owed
- Their current tier and how many referrals until the next tier, crossing from referral 10 into referral 11 is the milestone that lifts their rate to 40%, worth surfacing clearly

## 10. Notifications

- Agent applies: confirmation email, "we've received your application."
- Agent approved: invite email with next steps (complete your free Growth account, then payout setup).
- Agent rejected: polite email, no reason required in the automated message.
- New referral converts to a paying annual member: notify the agent, this is their real motivation loop.
- Commission marked paid: notify the agent with the amount and reference.
- Agent crosses into the 40% tier (referral 11): a specific milestone email, this is worth celebrating, it's a real change in their earnings, and a reminder that it now also applies to their earlier referrals' renewals.

## 11. Build Order

**Sprint 1.** Application page and form, terms/explanation page, admin approval queue, referral code generation, referral link tracking and attribution, `commission_ledger` table and calculation logic tied to the existing Paystack webhook, admin visibility (list, detail, manual mark-as-paid), anti-fraud checks from section 5.

**Sprint 2.** Agent-comped Growth account flow (`is_agent_comped`), Paystack Transfer Recipient payout setup, agent-side dashboard view, full notification set from section 10.

## 12. Out Of Scope, Do Not Build

- No extension to RE:Biz Nomads, Stoep, or Core commissions in this build, Growth (and Enterprise once live) only, per section 2.
- No automated payout via the Transfers API, manual only, per section 7.
- No public leaderboard or agent-to-agent visibility, each agent only ever sees their own data.
- No changes to Foundation or monthly Growth pricing, they remain permanently ineligible for referral commission.
