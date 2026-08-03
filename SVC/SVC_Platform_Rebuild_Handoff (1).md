# SMART VALUE CLUB: PLATFORM REBUILD

**Handoff for Claude Code**
**Version 3, 3 August 2026. Supersedes all earlier versions.**
**Five sprints. Report once at the end of each sprint.**

---

## 1. CONTEXT

Smart Value Club (SVC) is a South African membership club. A member pays a monthly fee and receives a package of benefits: grocery and pharmacy coupons at Dis-Chem, Checkers, Shoprite and Pick n Pay, the Moxie digital magazine, digital education products, and entries into a monthly members draw.

Moxie Magazine is part of SVC. SVC and Moxie are **one system on two domains**, and they will spin out together as one entity later.

SVC is a separate company from Digital Flyer (Pty) Ltd. It is being built inside the DigitalFlyer Growth stack now because that is faster, and it must be built so it can be lifted out cleanly later.

The current site is `https://smartvalueclub.co.za`, WordPress with Elementor and WooCommerce. It is being replaced, not improved.

**Read the whole current site before you design anything.** Crawl every page including `/shop`, `/products`, `/spin`, `/contact`, `/terms-and-conditions`, `/privacy-policy`, `/popia-notice`, and the affiliate portal path. Take the copy, the FAQ answers, the benefit descriptions and the retailer breakdowns as source material. Do not take the layout, the plugin structure or the navigation.

### The problem with the current system, stated plainly

SVC sells a value claim it cannot evidence. The site says over R2,000 in monthly savings. Nothing in the system records whether a single member ever opened a coupon, let alone used one. That has three consequences:

1. A member who saves R60 and was promised R2,000 feels misled and cancels.
2. SVC cannot charge a partner for access to its members, because it cannot show a partner what happened.
3. The bigger plan, walking into a national chain and asking for member vouchers as their marketing spend, has no supporting document.

**So the spine of this build is not the website. It is the benefit ledger.** Every benefit issued to every member in every month is a row with a state: issued, opened, claimed, redeemed, with a Rand value on redemption. Everything else in this handoff sits on top of that table. It also feeds the draw, because draw entries are earned from redeemed value. Build it first and build it properly.

---

## 2. GOAL

A single platform that:

- Sells memberships and manages subscriptions for both SVC and Moxie
- Delivers the benefits of each package to the member on a phone, without the member ever leaving SVC
- Records what each member actually did with each benefit, in Rand
- Runs a three level referral programme that a member and an admin can both understand at a glance
- Runs a members draw with free, earned and purchased entries
- Lets one admin add partners, build packages, set what SVC pays each partner, and see the margin before committing
- Produces a monthly payout schedule per partner and a monthly performance report per partner

One person must be able to operate the whole thing from a laptop in under an hour a month.

---

## 3. HARD CONSTRAINTS

### 3.1 Payments

SVC's own Paystack account is in application. The earlier decline was a miscommunication in the original application and is being corrected.

Until SVC's own account is live:

- Use **Paystack test mode keys only**.
- Do not put a live key from any Digital Flyer account into this codebase.
- Build every payment path behind one thin provider interface so the live SVC account drops in through configuration, not code. This applies to subscriptions, draw ticket purchases and referral payouts alike.
- There is an existing account collision in the record: the Growth webhook shares a test mode Paystack account with the WhatsApp project, and repointing it previously broke WhatsApp delivery. **Before you touch any webhook configuration, check what is currently pointed where and report it.** Do not repoint anything without saying so first.

### 3.2 Infrastructure, and the lift out

Build inside the existing Growth application and the existing Growth Supabase project. This is Dewald's call and it is not open.

To keep the later spin out cheap, two rules:

- **All SVC and Moxie tables live in their own database schema**, namespaced, not mixed into the Growth public schema.
- **No foreign key crosses from an SVC table into a Growth table, in either direction.** Where SVC needs to reference a Growth product, for example provisioning a KatisoBiz account for a member, do it through an identifier and an interface, not a join.

Done that way, the spin out is a schema dump and a domain change. Done any other way it is a rewrite.

### 3.3 Domains and indexing

- `smartvalueclub.co.za` and `moxiemag.co.za` both served from this application.
- The current SVC site returns `noindex, follow` on every page, including the homepage. It is invisible to Google. **Every public page on both domains must return normal robots directives and a normal `robots.txt`.** Verify with a direct header fetch on a preview deploy and again after go live. Member area and admin routes stay `noindex`.
- `moxiemag.co.za` has been indexed as a WordPress site and more recently rebuilt on Growth. Losing that indexing would be a silent regression. Confirm it is on the public side of the existing hostname branch in `src/proxy.ts` and `src/app/robots.ts`.

### 3.4 Moxie: audit before you merge

Moxie was rebuilt on the Growth stack recently, and Kwaai Press inside KatisoBiz publishes each edition to a URL. **Do not rebuild Moxie and do not duplicate Kwaai Press.**

First task of Sprint 1 is an audit: what exists for Moxie today, what member or subscriber records it holds, how an edition reaches a URL, and what would have to change for Moxie subscribers and SVC members to be one member table with one login. Report that before writing migration code.

### 3.5 Legal text

Terms and conditions and the privacy policy are with SVC's legal team and will be supplied before go live. Build the pages, render the supplied text, and leave clearly marked placeholders until it arrives. Do not draft, amend or summarise legal text. Do not invent competition rules.

The ECT Act section 43 footer block needs the full registered name, company registration number, physical address, directors and contact email. None of these are on the current site. Placeholder them and list them in your report.

---

## 4. BRAND AND STYLE

The governing document is the **SVC Brand Identity Guide, May 2026**, attached.

| Element | Value |
| --- | --- |
| Forest Green | `#1A6B3C` primary background. This is the correct green. Ignore `#1D9E75` where it appears in the Monthly Saver product document. |
| Deep Blue | `#1B4F8A` secondary, information, launch |
| Warm Amber | `#F5A623` accent only, never a background |
| Near Black | `#1A1A1A` body text and footer |
| Warm Cream | `#F4F1EC` light backgrounds, never plain white |
| White | `#FFFFFF` text on dark only |

Not negotiable: sharp rectangles everywhere, zero border radius on every button, box and card. No red anywhere. No plain white page backgrounds. Never more than three colours in one composition. Amber appears once per view at most. Clean sans serif throughout, Montserrat or Poppins.

Moxie keeps its own palette on its own domain: Burnt Orange `#C85A1E`, Deep Teal `#0B6E6E`, Charcoal `#1E2020`, Cream `#F7F3EE`, with Playfair Display, Source Serif 4 and Barlow Condensed. **Never mix the two palettes in one view.** One codebase, two themes, selected by hostname.

Copy: plain language, Rand, South African context, no corporate jargon, no motivational copy, **no em dashes in any string you write**. Greetings are "Good day {name}," never "Hi there".

**No testimonials and no member counts until confirmed real.** The current site shows three named testimonials and a "1,200+ Active Members" badge. Do not carry any across. Build the sections so admin can switch them on later. Ship with them off.

---

## 5. MOBILE: HOW IT MUST FEEL

Phone first means app shaped, not stretched desktop. Read this before laying out a single screen.

- **Navigation is a burger, top right.** Not a bottom bar. Not controls parked at the bottom of a long scroll. The header stays fixed with the logo left and the burger right, and the menu opens as a full screen panel with large tappable rows.
- **Every action is an obvious button.** Solid, sharp cornered, full width or near it, minimum 48px tall, one clear label that says what happens. Not a text link. Not an icon on its own. Not a swipe.
- **Primary action sits inside the first screen.** A member should never scroll to find the thing the page exists for.
- **One primary action per screen.** Everything else is visibly secondary, outlined rather than solid.
- **No hidden gestures anywhere.** If it can be done, there is a visible control for it.
- Target 360px wide with no horizontal scroll. Type no smaller than 16px for body. Cards stack, never squeeze into columns.

The member is a household on a mid range phone who signed up to save money on groceries. If they have to work out how the interface behaves, they will not open it again on the 1st.

---

## 6. DATA MODEL

Names are indicative. Keep the shape.

**member** Identity, **cell number as the canonical identifier, unique and OTP verified**, email, join date, status, POPIA consent flags with timestamps, marketing opt in as a separate flag. Cell number is the key because it is also the login the coupon provider uses. See section 9.

**partner** Supplier of a benefit. Name, contact person, agreement reference, notes, active flag. Examples: the coupon provider, Moxie, KatisoBiz, a national restaurant chain.

**benefit** One thing a member gets. Belongs to a partner. Type and cost model.

Types: `coupon_pack`, `digital_download`, `magazine_access`, `service_access`, `voucher_batch`.

Cost models, each with effective from and effective to dates so a renegotiated rate does not rewrite history:
- `per_active_member_per_month` (KatisoBiz at R5 per member per month sits here)
- `per_redemption`
- `revenue_share_percent`
- `zero_cost` (the partner supplies it as their own marketing spend, which is where national chains land)

**package** A saleable tier. Name, monthly price, annual price, active flag, display order, public description, and which brand it belongs to so a Moxie only subscription is a package in the same system.

**package_benefit** Which benefits sit in which package, display order, stated face value.

**subscription** Member, package, status, provider reference, current period end, cancellation date and reason.

**benefit_issue** The spine. One row per member per benefit per period. States: `issued`, `opened`, `claimed`, `redeemed`, `expired`, each with a timestamp. Face value. **Realised value in Rand.** Unique code where one exists. Source of the redemption record: `provider` or `self_reported`.

**voucher_batch** Partner, benefit, quantity supplied, issued, redeemed, expiry, code source. Issuing blocks once the supplied quantity is exhausted. This is what stops five thousand vouchers going out when a chain supplied five hundred.

**referral** Referrer, referred member, level, status, and a monthly `referral_earning` row per active month. See section 8.

**draw**, **draw_entry**, **entry_purchase** See section 10.

**payout_line** Generated, never entered. Partner or member, period, source, count, rate, amount. Moves no money.

**demand_signal** Free text plus category, captured from members. See 7.4.

---

## 7. THE FOUR THINGS THAT MAKE THIS WORK

### 7.1 The ledger and the personal savings number

The member dashboard shows "You have saved R413 with SVC since March", computed only from redeemed benefits with a recorded Rand value. Where a member has redeemed nothing, show what is available to them instead. Never show a running total of what they were promised.

This number is the retention mechanic, the honesty fix, and the input to draw entries. It has to be right.

### 7.2 The package builder

One admin screen, live arithmetic, nothing saved until save is pressed.

- Set name, brand, monthly price.
- Add benefits from the catalogue. Each shows its cost model and current rate.
- The panel updates live and shows:
  - **Fixed cost per member per month**, the sum of `per_active_member_per_month` rates
  - **Variable cost per member per month**, each `per_redemption` rate times an assumed redemption rate, defaulting to the observed rate from the ledger once data exists and a manual figure before that, labelled so it is obvious which is in use
  - **Referral cost per member per month**, the full three level exposure. On a R49 package that is R9 at full depth. It must appear in the margin, not beside it.
  - **Gross margin per member per month**, Rand and percentage
  - **Total face value**, which is what the public page renders
  - A warning when margin goes negative, and a hard warning when a `zero_cost` benefit is carrying the headline value claim
- Save creates a new version. Existing members stay on their version until moved.

### 7.3 Payouts and partner reporting

- **Payout run.** Pick a month, press run. The system counts qualifying active members or redemptions per benefit, applies the rate in effect for that month, and produces a line per partner. Export CSV and a per partner statement. It never moves money. Mark a line paid with date and reference.
- **Partner report.** One page per partner per month, from the ledger: members who received, opened, claimed, redeemed, and the redemption rate. Downloadable as PDF with the partner's name on it.

That report is the product being sold to a national chain. It turns "give our members a free voucher" into "here is what happened to the last five hundred you gave us." Build it so Dewald can email it without editing it.

### 7.4 Demand capture

One control in the member dashboard: "Which shop or product should we get coupons for next?" Free text plus a category. Admin sees an aggregated view ordered by count.

It costs almost nothing and it tells the partnerships side which deal to chase next, with a number attached.

---

## 8. REFERRALS

Three levels, approved, and not up for redesign. Structure:

| Level | Relationship | Monthly earning |
| --- | --- | --- |
| 1 | Member the referrer signed up directly | R5.00 |
| 2 | A member signed up by their level 1 | R2.50 |
| 3 | A member signed up by their level 2 | R1.50 |

Rates are configurable per package in admin, not constants in code. Depth is fixed at three.

**Rules to enforce**

- Earning accrues only for months in which the referred member's subscription is **paid and active**. A lapsed member earns nobody anything for that month.
- Earning stops at level 3. No fourth level, ever, including through deletion or reassignment of an account.
- A member cannot refer themselves, and the same cell number cannot appear twice in a chain. Match on verified cell number, not email.
- Referral relationships are set at signup and never edited afterwards. If one has to change, it is an admin action with a reason and an audit row.
- Full three level exposure is R9.00 per member per month. It must appear in the package builder margin.

**Member side**

- A short, clean, shareable link on the dashboard, plus a copy button and a WhatsApp share button.
- One simple screen showing: people joined at each level, this month's earning, total earned, current balance, and what has been paid out. Three numbers, not a genealogy tree. A member does not need to see the network, they need to see the money.
- Plain language, no rank language, no team language, no leaderboards.
- **A short explainer, written once and reused everywhere.** One page on the public site, the same words in the dashboard, and the same words in the referral email. It answers four questions in order: what a member earns, when they earn it, when they stop earning it, and what happens to the money. Worked example with real Rand figures. No diagrams of a network, no jargon, no "opportunity" language. A member must never learn a rule of this programme for the first time from a payout that surprises them.

**Admin side**

- Search a member and see who referred them and who they referred.
- A monthly referral run that produces one `payout_line` per member with a balance, alongside the partner payout run.
- **Payout mechanic is open and needs Dewald.** Paying R5 in cash costs more in fees than the amount. Recommendation: earnings accumulate as account credit applied automatically against the next subscription charge, with a cash withdrawal option unlocked above a threshold, R100 suggested, paid in a manual batch. Build the credit path first and leave the withdrawal request behind a flag until Dewald confirms.
- Fraud view: accounts sharing a device fingerprint, a payment instrument or a cell number prefix pattern, and any chain growing faster than a set rate. Flag only, never auto suspend.

---

## 9. THE COUPON EXPERIENCE, EMBEDDED

**The requirement.** A member never leaves SVC. They log in to their SVC dashboard, browse the coupon catalogue, select coupons, and complete whatever the provider calls a checkout, all inside SVC's own interface with SVC's own styling. They should not be able to tell there is a second system.

**The member's cell number is the identifier** across both systems. Verify it by OTP at signup and treat it as the join key.

**This is blocked on the provider's API documentation and credentials.** Dewald is obtaining them. Do not guess at the provider's API shape and do not build against a guess.

What to build now, before the documentation arrives:

- One internal coupon interface with these operations: authenticate a member, fetch catalogue, fetch a member's available coupons, select or claim a coupon, confirm selection, fetch redemption events.
- **A manual import implementation behind that interface**, so a month can be issued with no API at all: an admin uploads the month's coupon file, the system issues it to every member whose package includes that benefit, on the 1st. The platform must work end to end without the provider.
- The full member facing catalogue, selection and confirmation screens, built against the interface, styled entirely as SVC.

When the documentation arrives, assess in this order and report which one applies:

1. **Server to server API.** The good case. SVC calls the provider, renders everything itself, no provider interface ever loads in the member's browser. Build this.
2. **Provider SSO plus embed or iframe.** Workable but constrained. Report exactly what can and cannot be restyled before building it, because an iframe that carries the provider's branding fails the requirement.
3. **Redirect only.** Fails the requirement. Stop and report. Do not ship a redirect quietly.

Whatever the route, every selection and every redemption writes a `benefit_issue` state change with a Rand value into the SVC ledger. If the provider does not report redemptions, fall back to the member's own "I used this" confirmation and mark the source as `self_reported`.

---

## 10. THE DRAW

Prizes escalate over time from a monthly R2,000 grocery voucher to large prizes such as holidays or a vehicle.

### 10.1 Entries

**Free entries.** A set number per active member per month, currently five. Configurable per package, so higher tiers can carry more.

**Earned entries.** One additional entry for every R50 of **verified redeemed value** in the current period, computed from the ledger at freeze. Use realised value, not face value, so entries reflect actual saving rather than what was issued. Show the member a live counter: "R38 more redeemed and you earn another entry." Configurable threshold.

**Purchased entries.** Available only to a paid up active member on a package of R49 or above. Every one of those conditions is enforced server side at the point of purchase, not only in the interface.

Purchased entries may be **described** on the public site, and must be described accurately wherever they appear:

- The description sits inside the draw section, never in the hero, never in a signup step, never in an advert.
- It states plainly that entries can be bought by active members only, that a minimum R49 membership is required, and that membership itself is what carries the value.
- No price, no quantity picker, no basket and no payment control renders anywhere outside the logged in member dashboard. A logged out visitor reads about it and cannot act on it.
- No purchase path exists inside the signup or checkout flow. A member cannot buy entries in the same transaction that creates their membership, and cannot reach the purchase screen until their first payment has cleared.

Purchases run through the same payment interface, in test mode until the SVC account is live. Every purchase creates an `entry_purchase` row with amount, reference and count, and is reportable separately from free and earned entries, because purchased entry income is a different revenue line and will need to be accounted for as such.

**The purchased entry mechanic is gated.** Build it behind an admin configuration flag, defaulted **off**. It switches on only when Dewald confirms his legal team has cleared the specific structure in writing. Dewald's position is that this is permissible as a members only benefit of a club rather than a public lottery. That position belongs to him and his attorney, and it is worth having in writing before the first large prize rather than after, because the scrutiny arrives with the car, not with the grocery voucher. Do not raise it with anyone else and do not design around it.

### 10.2 What counts as redeemed value

Earned entries are only as sound as the evidence behind them, so the ledger records **where each redemption record came from**, and admin decides which sources earn entries.

Every redemption row carries a `verification_source`, in descending order of strength:

| Source | What it means | Default weight |
| --- | --- | --- |
| `provider_redeemed` | The coupon provider confirmed the coupon was actually used at the till | Counts in full |
| `provider_checkout` | The member completed a coupon basket checkout, so intent is confirmed but use is not | Counts at a reduced rate, set in admin, default half |
| `self_reported` | The member tapped "I used this" | Counts, but capped per member per period, default 10 entries |

Selecting or checking out a basket of coupons is **not** redemption. If checkout alone earned entries at full weight, a member could select the entire month's coupon set, use none of it, and earn forty entries. The savings counter has the same problem: it must only show money the member plausibly saved, not money they queued up.

Build all three sources from the start. Weights and caps are admin settings, not constants. Which of them is actually available depends on the coupon provider and is answered by Appendix A.

If the provider turns out to report nothing back, `self_reported` is what SVC has, the cap does the work, and the report must say so plainly rather than presenting self reported figures to partners as verified.

### 10.3 Mechanics

- Entries accumulate through the period and are **frozen at a published cutoff**. After freezing nothing can be added, altered or deleted, including by admin.
- Seeded random selection. The seed and the total entry count are recorded and published after the draw.
- A public results page per draw: period, prize, total entries, seed, winner by first name and surname initial. Indexed.
- Winner notification, and prize fulfilment recorded as a ledger row like any other benefit.
- Admin can configure prize, cutoff, free entry count, earn threshold and ticket price per draw. Admin cannot see or alter entries after freeze.

The auditability is the point. SVC's main obstacle is that people assume it is a scheme. A published seed and a reproducible result is the cheapest trust the platform can buy, and it matters most on the draws where the prize is worth stealing.

---

## 11. SPRINTS

Report and stop at the end of each.

### Sprint 1: Foundation, audit, public sites
- Moxie audit per 3.4, reported before any migration code.
- Schema per section 6, in its own namespaced schema, row level security from the first migration.
- Public marketing site for SVC, phone first per section 5, indexed. Home, how it works, packages, about, contact, FAQ, terms, privacy, POPIA notice.
- Homepage follows the current site's narrative because it is sound: the promise, the value breakdown, three steps, what is included per retailer, the draw, the honesty section about not being a scheme, FAQ, closing action. Copy rewritten against sections 4 and 12.
- Moxie public pages on `moxiemag.co.za` in the Moxie theme, off the same application.
- **Packages render from the database.** No hard coded prices or benefit lists.
- Signup with OTP verified cell number, checkout in Paystack test mode, member and subscription created, confirmation email.
- Login by cell number with OTP, and by email with password. Password reset. No password stored or logged in plain text anywhere.

### Sprint 2: Member area, ledger, referrals
- Member dashboard per sections 5 and 7.1.
- Benefit delivery and every state transition, with the "I used this" control and the optional amount question.
- Personal savings counter.
- Coupon interface and the manual import implementation per section 9, with the full catalogue and selection screens.
- Moxie access as a benefit, using the existing Growth hosted Moxie rather than a new build.
- Monthly issue run on the 1st, with member email.
- Referral link, share buttons and the three number member view per section 8.
- Cancellation from the dashboard with a reason captured. Benefits stay live to the end of the paid period.

### Sprint 3: Admin
- Members: search, filter, open one member and see their full ledger. Manually issue a benefit to one member or a filtered group, which is how giveaways run. Comp, suspend.
- Partners and benefits, with effective dated rates and voucher batch stock counters.
- The package builder per 7.2.
- Partner payout run and partner report per 7.3.
- Referral admin, monthly referral run and fraud view per section 8.
- Demand capture view per 7.4.

### Sprint 4: Coupon API and the draw
- Provider integration per section 9, once documentation and credentials are supplied. Assess and report which of the three routes applies before building.
- The draw per section 10, including purchased entries behind the default off flag.
- Public results page, indexed.

### Sprint 5: WhatsApp
Scoped separately once a verified Meta number is in place for SVC. Everything before this sprint is email driven. Do not build any WhatsApp path in Sprints 1 to 4, and do not use any Digital Flyer WhatsApp number or account for SVC.

---

## 12. COPY AND CLAIMS

Rewrite every claim against what the system can evidence.

| Do not say | Say instead |
| --- | --- |
| "We negotiate with retailers so you don't have to" | Describe accurately how coupons are sourced. Only claim a direct retailer relationship where one exists. |
| "Coupons verified with the retailers" | State what verification actually means. |
| "R2,000+ in monthly savings" as the headline promise | Face value of this month's coupons, stated as face value, next to typical realised saving once the ledger has data. |
| Any testimonial or member count | Nothing, until real ones exist. |

Three different value claims are in circulation: R2,000+ on the site, R2,250 implied by three retailers at R750 each, and R3,049+ on the Monthly Saver product document. Pick one, derive it from the package builder's face value total, and let the page render it.

The current terms and conditions mention neither the draw nor the referral programme, and the brand appears as both "Smart Value Club" and "SmartValue Club". Both are for the legal team. Flag them in your report.

### 12.1 The new headline claim: stacking

SVC coupons are designed to work on top of a retailer's own loyalty savings (Xtra Savings, Smart Shopper, and similar). This is confirmed strategy and takes priority over the R2,000 figure as the lead message, because it answers the one objection a savings membership always faces: why pay when the store's own card is free. Use it as follows.

**Hero headline:** "These coupons work on top of your own store savings."
**Hero subheadline:** "You already have Xtra Savings or Smart Shopper. SVC coupons stack on top of them. Same trip, same card, extra money off. Dis-Chem, Checkers, Shoprite and Pick n Pay. R49 a month."
**Trust line under the CTA:** "Not instead of your loyalty card. On top of it."
**One sentence under the value breakdown section:** "This is on top of whatever your store card already saves you."

**FAQ addition**

Q: Do SVC coupons replace my Xtra Savings or Smart Shopper card?
A: No. Use your loyalty card as normal. SVC coupons apply on top, at the same till, same trip.

**Verification gate, per retailer, before this goes fully live.** This claim needs confirmation in writing from the coupon provider per retailer, per Appendix A question 14. Retailer till logic can differ: one retailer may allow stacking, another may not. If confirmation has not arrived by the time Sprint 1 content is finalised, use the softer form below rather than the flat claim, and swap in the confirmed line per retailer as answers arrive:

**Soft form until confirmed:** "Designed to work alongside your store savings" rather than "stacks on top of." Track which retailers are confirmed in the admin partner record from section 7, and render the strong or soft claim per retailer card on the public page rather than one blanket statement for all four.

---

## 13. OUT OF SCOPE

- Any live payment processing, and any Digital Flyer live merchant key
- Drafting or amending terms, privacy policy, competition rules or partner agreements
- WhatsApp, until Sprint 5
- A self service partner portal. Admin issues on the partner's behalf in this version.
- Rebuilding Moxie or Kwaai Press
- Migrating the WordPress database. Members are re registered or imported from a supplied list.
- The crypto token, the spin wheel page, and the affiliate plugin
- Native apps

---

## 14. WHAT YOU DECIDE, AND WHAT NEEDS DEWALD

**You decide:** framework specifics within existing Growth conventions, schema detail, component structure, admin layout, email delivery, job scheduling, testing approach, anything visual not fixed by sections 4 and 5.

**Dewald decides. Open at handoff:**

1. **Coupon provider API documentation and credentials.** Blocks Sprint 4 only. Sprints 1 to 3 run on the manual import path.
2. **Referral payout mechanic**, credit against subscription versus cash withdrawal above a threshold. Blocks the referral run in Sprint 3, not the member facing referral work in Sprint 2.
3. **Written legal position on purchased draw entries.** Blocks the flag going on, not the build.
4. **The real package list and prices.** Sources disagree: the site shows one tier at R49, the March minutes show R59 bundled and R65 magazine only, and the brand brief lists Silver, Gold and Platinum as coming. Blocks content, not code.
5. **Whether the testimonials and member count are real.** Default off.
6. **Existing Moxie subscribers**, whether any exist and whether they migrate into the shared member table.
7. **DNS control of both domains**, and whether WordPress is cut over or run in parallel during testing.
8. **Company registration number, physical address and directors** for the ECT Act footer.

None of these block Sprint 1. Start.

---

## 15. ACCEPTANCE CRITERIA

**Sprint 1**
- Both domains serve from one application with the correct theme per hostname, and no palette bleeds across
- Public pages render at 360px with no horizontal scroll, burger menu top right, primary action visible without scrolling
- Every button has zero border radius, no red anywhere, no plain white background
- Packages and prices come from the database and change without a deploy
- A test signup with OTP creates a member, a subscription and a confirmation email
- Header fetch shows no `noindex` on public pages of both domains, and `noindex` on member and admin routes
- No password stored or logged in plain text anywhere
- SVC tables sit in their own schema with no foreign key crossing into Growth tables

**Sprint 2**
- The 1st of month job issues correct benefits to test members across at least two packages
- Every state transition writes a timestamp, and a member's full ledger is visible in admin
- The savings counter shows zero for a member who has redeemed nothing, never a projected figure
- A full month can be issued with the coupon API absent
- A referred signup creates level 1, 2 and 3 relationships correctly through a chain of four accounts, and no level 4 row exists
- A member cannot refer themselves, and a duplicate cell number is rejected

**Sprint 3**
- Adding a R5 per member per month benefit to a R49 package immediately shows the margin dropping by R5, and removing it restores it
- The margin figure includes R9 of referral exposure on a fully referred member
- A rate change dated 1 September does not alter an August payout run
- A voucher batch of 500 cannot issue a 501st voucher
- A payout run across three partners produces three statements and moves no money
- A partner report renders as a PDF with real ledger figures

**Sprint 4**
- Which of the three coupon integration routes applies is reported before any integration code is written
- A member completes coupon selection without leaving an SVC styled screen
- Every selection writes a ledger row with a Rand value
- R100 of `provider_redeemed` value produces exactly two earned entries at a R50 threshold and full weight
- The same R100 recorded as `provider_checkout` produces one entry at the default half weight
- A member self reporting beyond the cap earns no further entries, and the cap is visible to them
- Entries freeze at cutoff and cannot be altered afterwards, verified by attempting it as admin
- The same seed and entry set reproduce the same winner
- With the purchase flag off, no route anywhere allows an entry to be bought
- With the flag on: a logged out visitor can read about purchased entries and cannot reach a payment control; a member on a package below R49 is refused server side, not just hidden from the button; a new member cannot buy entries before their first payment clears

---

## 16. HOW TO REPORT BACK

One report at the end of each sprint. In it:

- What was built, in plain language
- What you decided that was not specified here, and why
- Anything in this document that turned out to be wrong or impossible
- Every contradiction found while crawling the current site
- What is blocked and on whom
- What a non technical person needs to do to see it working

No code in the report. If something here conflicts with what you find in the existing site, the existing Moxie build or the attached documents, stop and ask rather than choosing.

---

## APPENDIX A: WHAT THE COUPON PROVIDER MUST TELL US

This list exists so the API conversation happens once. Dewald is obtaining it. Nothing in Sprint 4 can be designed until these are answered, and the answers determine both the embedding route in section 9 and the entry weights in section 10.2.

**Identity**
1. Can a member be authenticated by cell number, and can SVC create and authenticate members programmatically rather than the member registering separately?
2. Is there a server to server authentication method, so SVC's own back end holds the credential rather than the member's browser?

**Catalogue and selection**
3. Can the full coupon catalogue be fetched as data, with names, images, face values, retailers, terms and expiry dates?
4. Can a coupon be selected, claimed or added to a basket through the API, and a basket confirmed, without a browser session on the provider's own site?
5. Are coupon codes unique per member, or shared across all members?

**Redemption, which is the important one**
6. Does the provider learn when a coupon is actually used at the till, or only when a member selects it?
7. If it does, can SVC receive that as a webhook, or poll it, and does the event carry the member, the coupon and the Rand value?
8. What is the delay between in store use and the event being available?
9. If it does not, is there any other evidence of use, for example a retailer settlement file, even if it arrives monthly rather than live?
14. **Do SVC coupons stack on top of the retailer's own loyalty savings** (Xtra Savings, Smart Shopper, and so on), or does the retailer's till logic apply only one discount per item? This is the headline claim on the public site once confirmed, so get it in writing per retailer rather than assuming it holds everywhere.

**Commercials and limits**
10. Rate limits, and whether they scale with member count.
11. What SVC pays, and whether it is per member, per issued coupon or per redemption, because this determines the cost model in the package builder.
12. Whether the contract permits programmatic access and white labelling at all, and whether the provider's branding must appear anywhere.
13. Sandbox or test credentials, and whether test redemptions can be simulated.

Question 6 is the one to ask first. The answer changes the draw, the savings counter and every partner report.
