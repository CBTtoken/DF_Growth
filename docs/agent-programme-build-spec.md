# Build spec: DigitalFlyer Growth Agent Programme

**For:** the Claude Code session working on `CBTtoken/DF_Growth`.
**Companion documents:** `agent-terms-and-faq.md` (the rules, source of truth) and `agent-recruitment-page-copy.md` (the copy). Read both before starting. Where this spec and the terms disagree, the terms win.

**Standing rules that apply to everything below:** no em dashes anywhere in code, copy, or comments. Use "marketplace", never "listing" or "directory". Confirm a database column exists live before pushing code that queries it, hand the SQL to Dewald inline to run and wait for confirmation. Idempotency keys on the provider transaction reference. Strip ```json fences before JSON.parse on LLM output. Source env vars, never inline secret values. Confirm before anything destructive. Next.js is 16.x, check `node_modules/next/dist/docs/` before assuming an API exists.

---

## Phase 0: Live fixes, do these first, they are small and they are bleeding

**0.1 Remove the Paystack payment line from the agent application form.** `/agents/apply` currently renders "Secure payment via Paystack" beneath the application form. It is a shared checkout component leaking into a page with no payment. On a page recruiting people who need income it reads as a joining fee. Highest priority item in this document.

**0.2 Repo-wide em dash sweep.** Em dashes are rendering on live client pages from template and component code, for example "Social media management — Facebook, Instagram & more" and "No reviews yet — be the first", and the section number labels "01 — About". Search the whole repo for the character and replace with commas or restructured phrasing. This affects every client page, not just agent pages.

**0.3 Repo-wide "listing" sweep.** Client page templates render "your professional online listing in the DigitalFlyer marketplace". Replace every user-facing occurrence of "listing" and "directory" with "marketplace" or a rephrase. Check template copy, meta descriptions, and AI copy generation prompts in `src/lib/ai/`, since the generator may be producing the word itself.

**0.4 Fix the About field truncation.** On `/jozymee-marketing-creative-solutions` the About text truncates twice, at "this was different and for my bu" and at "while marketing a". The same truncation appears in the meta description, so it is showing in Google and in WhatsApp previews. Find whether the cap is at write time, read time, or render time. Enforce the real limit in the wizard with a visible character counter, and generate meta descriptions by truncating on a word boundary with an ellipsis, never mid-word.

---

## Phase 1: The agent page

### 1.1 Account model, dual role

An account can hold a business membership and an agent role at the same time. Losaan Vd Westhuizen Meiring is the live case: she has a business member page and needs an agent page as well.

- One login, two roles. Do not create a second account for the agent side.
- Dashboard gets a role switcher when the account holds both. Default to whichever role was used last.
- Each role has its own page, its own slug, its own data. They do not share content.
- An agent with no business membership sees no switcher and lands directly in the agent dashboard.

### 1.2 Route and slug

- Agent pages resolve at root level, same resolver as business pages, no prefix. Match how business pages are already handled.
- **Critical:** agent slugs, business slugs, and reserved platform routes now share one namespace. Build a single uniqueness check across both agents and businesses, plus a blocked list covering at minimum `pricing`, `marketplace`, `shop`, `events`, `agents`, `faq`, `how-it-works`, `login`, `dashboard`, `privacy`, `terms`, `set-password`, `forgot-password`, `reset-password`, `api`, `admin`. Enforce at creation with a clear error message. Audit the existing business slug creation path for the same protection.
- 404 on unknown or inactive agent slugs.
- Full Open Graph per agent: `og:title`, `og:description`, and an `og:image` that is the agent's own photo or generated badge, not the DigitalFlyer logo. Most traffic arrives from a link pasted into WhatsApp, so the preview card matters more than any other single element on the page.

### 1.3 Design brief

**This is a bespoke page, not a template.** Build it the way Buffelskop and HelpLift were built, with a design concept and a point of view. It should not be reusable and it should not go into `src/lib/templates/anchors.ts` or the wizard template picker. The bar is that it looks like a graphic designer made it.

**The concept: a calling card that scrolls.** Business templates are product-first because they sell a product. An agent sells trust, so this is person-first.

- Full-bleed hero in the agent's accent colour, portrait or generated badge, the name set very large and stacked, town underneath, then one sentence of promise. No gradient meshes, no floating cards, no stock gloss. Where the business templates go bold and busy, this goes quiet and confident.
- Thin credential strip under the hero: verified agent, active since {month year}, {town}.
- The whole page is written in first person. The agent's story block is set in the serif voice to mark it as a person speaking, everything else stays sans.
- Their own services appear as a subordinate block, present but not competing with the DigitalFlyer offer.
- Social proof section listing businesses attributed to this agent that are active with a live page. **If fewer than three, hide the entire section.** No counts, no invented figures, same honesty bar as the marketplace.
- Sticky bottom bar on mobile with two actions, Start free and WhatsApp me. Mobile is the real design, desktop is secondary.
- No recruitment call to action anywhere on an agent page. Recruitment lives only on `/agents`.

### 1.4 Accent colour

- The agent picks one accent colour. Offer a curated set of eight to ten strong options plus a custom picker.
- Derive the full page palette from that one choice programmatically.
- **Enforce a contrast floor.** If the picked colour fails the contrast threshold for text use, darken or lighten the derived text and fill stops automatically rather than shipping an unreadable page. Never let a pale pick produce grey-on-white text.
- Verify every derived combination in both light and dark mode.

### 1.5 Generated monogram badge

For agents who do not upload a photo. Do not use stock photos of strangers, that is dishonest and the brand is positioned on honesty.

- Generate a badge: the agent's initials set large in the DigitalFlyer display face, on a field of their accent colour, with a subtle geometric pattern and the DigitalFlyer SA mark.
- It must occupy the exact same dimensions and framing a portrait would, so the layout never looks broken.
- Also used as the `og:image` fallback.
- Show a single, non-nagging prompt in the dashboard noting that a real photo performs better, with a direct link to upload.

### 1.6 AI-drafted page copy

Reuse the existing Anthropic copy generation pattern from the member wizard.

- Ask the agent four questions: what they did before this, why they joined, who they most want to help, and what area they cover.
- Generate the full page copy from those answers, in first person, in the agent's own register.
- The agent reviews, edits inline, accepts. Every field remains editable from the dashboard afterwards.
- Prompt must forbid em dashes and the word "listing", and must not invent claims, statistics, or results.
- Strip ```json fences before parsing.

### 1.7 Services and promotions

Reuse the existing member data model. Three services and promotions, same shapes, same admin handling. Do not build a parallel model.

### 1.8 Attribution

- Visiting an agent page sets the existing referral cookie with that agent's referral code, using the same helper the current referral link uses. Do not build a second mechanism.
- Cookie window is 30 days.
- Every call to action on the page also appends the referral code as a URL parameter, as a fallback for cookie-blocked visitors.
- Attribution is captured at signup and fixed permanently to that client record.
- Where two agent codes are present, the most recent wins.
- No retrospective attribution of businesses that signed up directly.

### 1.9 Tracking

- DigitalFlyer-own pixel, consent gated as everywhere else.
- `ViewContent` on agent page load, with the agent slug as the content identifier.
- Custom event on WhatsApp button click.
- Existing `CompleteRegistration` on signup is unchanged.

### 1.10 Admin

Version one is admin managed for page setup. Add agent page fields to the existing admin agent view so Dewald can populate them. Agent self-editing of copy and colour comes with the dashboard in phase 2.

---

## Phase 2: Dashboard, ledger, and the commission engine

### 2.1 Commission rules, exact

These rules decide money. Implement them literally and write unit tests for every row.

**Rate table**

| Plan and billing period | Rate | Counts toward the ten |
|---|---|---|
| Growth Engine or Enterprise, annual | 25% at count 0 to 10, 40% at count 11 or higher | Yes |
| Foundation, annual | 10% flat | No |
| Any tier, monthly | 0% for cleared payments 1 to 3, then 10% | No |

**Rules**

1. Commission accrues when a payment clears, never at signup.
2. Rate is calculated fresh at every payment event, using the agent's annual count at that moment. It is not stamped at signup and it is not frozen.
3. Consequence of rule 2, and this is intended: when an agent passes ten, their earlier members' renewals pay 40%. Nothing already paid is ever restated, this only applies to new payment events.
4. The annual count is cumulative lifetime and never decrements, including on churn.
5. Monthly month counting uses cumulative cleared payments, not calendar months. A member who pauses and returns continues their count.
6. A monthly member upgrading to annual Growth Engine or Enterprise takes a slot at the moment of upgrade and earns the annual rate applicable at that moment.
7. Commission calculates on the amount excluding VAT.
8. Per-pairing rate override: a real field on the agent and client pairing, carrying rate, reason, and who approved it. Needed for Natasha on Buffelskop and every future exception. Do not hand-patch ledger rows.

### 2.2 Payout engine

- Ledger line accrues on cleared payment, held 14 days, then available.
- Weekly payout run. Pays any agent whose available balance is R750 or more, in full.
- Any balance held longer than 6 months pays out at the next run regardless of amount.
- On account closure, pay the full available balance at the next run regardless of amount.
- **Nothing pays automatically.** Dewald approves each run.
- **Idempotency key on the payout run id**, so a retry or double-click cannot pay twice. This is the single most important safety property in this build.
- Payout via Paystack Transfers to a saved recipient per agent. **Do not use Paystack split payments for commission.** Splits pay at transaction time, which is wrong here: Foundation starts as a free trial with no transaction, commission is earned when payment clears not when it is initiated, and a split cannot be recovered if a payment reverses. Splits are for Sprint 4 shop sales only.
- Refund or reversal after payout writes a negative ledger line offsetting future earnings. Never invoice an agent.
- Full audit trail: every line traceable to a client, a payment, a rate, a date, and a payout run.

### 2.3 Activity and dormancy

- Active means signing in to the agent dashboard at least once in any 60 day period. That is the only requirement. Do not implement a signup or sales quota.
- Warning emails at day 30, 45, and 55 of inactivity, the final one to every contact detail on record. Log every notice sent.
- Deactivation at day 60: agent page and referral link go dark, future commission including renewals stops, attributed clients revert to direct, available balance pays at the next run ignoring the R750 floor.
- Serious conduct breach may deactivate immediately, bypassing the ladder. Admin action, not automated.
- **Passive admin flag:** surface any agent with no signups in 90 days on an admin screen. Visibility only, no automated consequence.
- Failed payout or missing bank details: hold 90 days, log every contact attempt, then forfeit.
- **Deceased is a manual admin state.** It freezes the account, stops the forfeiture clock, and flags for settlement with the estate. Never automate this.

### 2.4 Dashboard, four areas

**Performance.** Page views, link clicks, signups started, trials running, converted to paid, lapsed. Plus conversion rate from page view to signup, and earnings per hundred page views.

**My referrals.** The list, with status and contact details, so agents can follow up on unconverted trials. Scope hard: an agent sees only businesses attributed to them. No export of anything wider. This screen is POPIA-sensitive and is permitted only under section 9.5 of the agent terms.

**Earnings.** Pending, clearing, available, paid, with dates. Every line traceable to a client and month. Downloadable monthly statement.

**Playbook.** Sales scripts, a short how-to on finding businesses, and downloadable social assets.

### 2.5 Agent social assets

Point the existing programmatic asset generator at agents. Monthly, branded with their name and their link. Reuses existing machinery, near zero marginal cost, and removes the main reason an agent goes quiet.

---

## Phase 3: Content pages

- `/agents/terms` from `agent-terms-and-faq.md` Part 1. **Do not publish until Dewald confirms a legal read of sections 7.3 and 8.4.**
- Agent FAQ from Part 2, as an accordion on `/agents` and in the main FAQ.
- `/agents` rebuilt from `agent-recruitment-page-copy.md`. Same design bar as the agent page, bespoke and designed. Remove the current form fields as specified in that document.
- Existing `/agents/apply` redirects to `/agents`.

---

## Sequencing and one risk to manage

Build order: Phase 0, then Phase 1, then Phase 3, then Phase 2. Payouts (2.2) last and on their own, with test transfers before any real money moves.

**Named risk:** the new agent page will drive signups before the new commission engine exists, so commission accrued in that gap will use the old rules. At current volume, two agents, this is trivially correctable by hand. Log every accrual with enough detail to recalculate, and recalculate when 2.1 lands. Do not let this gap widen once agent recruitment is live.

---

## Acceptance criteria

- Typecheck, lint, and build clean. Verify your own work rather than asking Dewald to check code.
- Reserved and duplicate slugs rejected with a clear message, tested against both agent and business creation.
- Agent page renders correctly on a 360px viewport, in light and dark mode, with a pale accent colour and with a dark accent colour.
- Open Graph preview renders with the agent's photo or badge, verified by pasting the link into WhatsApp.
- Visit an agent page in a clean browser, confirm the referral cookie carries that agent's code, complete a signup, confirm attribution lands on that agent.
- Dual role account: Losaan can switch between her business dashboard and her agent dashboard from one login, and the two pages hold separate content.
- Commission engine unit tests cover every row of the rate table plus the ladder crossing, the renewal recalculation, the monthly pause and resume, and the upgrade path.
- Payout idempotency proven by deliberately replaying a run and confirming no second transfer.
- Repo greps clean for em dashes and for user-facing "listing" and "directory".
- **All testing uses Dewald's own +alias addresses. Never send to an invented address.**

---

## Open items Dewald still owes

1. The Growth Engine annual price, for the worked example in the recruitment copy.
2. Losaan's own words, for her page copy. Her page is a migration onto the new agent page, not a rewrite of the existing business page, and her business page stays as it is.
3. Legal sign-off on the two forfeiture clauses.
4. A call to both current agents about the new structure, since section 10 of the terms requires 30 days notice of changes.
