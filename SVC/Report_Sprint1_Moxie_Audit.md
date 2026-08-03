# SVC SPRINT 1, OPENING REPORT: THE MOXIE AUDIT AND THE SITE CRAWL

**Per handoff sections 3.1, 3.4 and 16 | 3 August 2026, late evening**
**No migration code has been written. This is the report the handoff asks
for first, and it stops here for the go-ahead.**

The auditor's advantage: the Moxie stack described below was largely built
and hardened today, in this same working session, so this is first-hand
knowledge verified against the live system, not archaeology.

---

## 1. WHAT EXISTS FOR MOXIE TODAY

**Two coupled systems, one application, exactly as the handoff hopes.**

**The public magazine** (`/moxie` routes, served as moxiemag.co.za via the
hostname branch in `src/proxy.ts`): home, editions archive, edition detail,
gated reader (`/read/[slug]`, signed image URLs), subscribe with live
Paystack, login/join, account (with self-service password change), welcome,
and a publisher admin (`/moxie/admin`) with a members table, funnel
analytics, income, reads drill-downs, CSV exports and team management.
moxiemag.co.za DNS cut over to this build tonight; both apex and www
verified serving it, indexable.

**The production system** (Kwaai Press, `/bizup/kwaaipress/moxie` on the
KatisoBiz host): editions, flatplan, article editor with measured
pagination, approvals, publishing. An edition reaches its URL when the
publisher approves articles (pages freeze), orders the flatplan and
publishes; the reader then serves the frozen pages by slug.

**Moxie tables, all in the Growth public schema today:**
`moxie_editions`, `moxie_subscriptions`, `moxie_purchases`,
`moxie_billing_events`, `moxie_access_codes`, `moxie_reads` (added today),
plus the builder's `emag_publications`, `emag_editions`, `emag_articles`,
`emag_assets`, `emag_flatplan`, `emag_members`.

**Identity today:** Moxie readers are rows in the shared Supabase
`auth.users` pool that the whole Growth platform uses (Growth members,
KatisoBiz owners, everyone). Reader accounts created from today onwards are
tagged `moxie_reader` in user metadata; older ones are indistinguishable
from other platform users. Login is email + password. There is no cell
number anywhere in the Moxie flow.

## 2. ANSWERS TO THE HANDOFF'S OPEN QUESTIONS THAT DATA ALREADY SETTLES

- **Open item 6, existing Moxie subscribers:** there are exactly **two**,
  both Dewald's own test accounts. One real Paystack subscription
  (info@digitalflyer.co.za, R49 monthly, signed up and test-cancelled
  today) and one manual grant (dewald@digitalflyer.co.za). There is no
  migration problem: the shared member table starts effectively clean.
- **Access codes are already the SVC bridge:** `moxie_access_codes` exist
  per edition for SVC members, generated in batches from the Moxie admin.
  This is today's only SVC-to-Moxie mechanism and maps naturally onto the
  future `benefit_issue` row of type `magazine_access`.

## 3. SECTION 3.1: WHERE THE PAYSTACK WEBHOOKS POINT, REPORTED BEFORE ANYTHING IS TOUCHED

- This application has **one** Paystack webhook route,
  `/api/webhooks/paystack`, which serves Growth, KatisoBiz AND Moxie
  billing on **Digital Flyer's live Paystack account**. Moxie's
  subscription lifecycle (including a create/charge race fixed today)
  flows through it.
- Consequence for SVC: SVC's test-mode integration must get its **own
  webhook route** (inside the SVC namespace) and its own Paystack test
  account webhook URL. Nothing about the existing live webhook needs
  repointing, and nothing will be.
- The handoff's recorded collision (a test-mode account shared between the
  Growth and WhatsApp projects) is not observable from this repository;
  DF-WhatsApp is a separate project with its own configuration. **Before
  Sprint 1's checkout work, Dewald should confirm in the Paystack
  dashboard which webhook URL each TEST account currently carries**, and
  SVC will use a test account that WhatsApp does not.

## 4. WHAT HAS TO CHANGE FOR ONE MEMBER TABLE AND ONE LOGIN

The plan that keeps the spin-out a schema dump:

1. **New `svc` database schema** holds every table in handoff section 6.
   No SVC table takes a foreign key into any Growth `public` table, and
   nothing in `public` references `svc`. Where SVC provisions a Growth
   product (KatisoBiz for a member), it stores an opaque identifier.
2. **`svc.member` is the member table.** Cell number canonical, unique,
   OTP-verified, with POPIA consent flags. It references `auth.users` by
   id, which is Supabase's own auth schema, not a Growth table; identity
   lifts out with the members at spin-out time by filtering the auth pool
   to ids present in `svc.member`.
3. **Moxie's subscription becomes an SVC package.** `package.brand`
   distinguishes SVC from Moxie packages; `moxie_subscriptions` (two test
   rows) maps into `svc.subscription` when Sprint 1's schema lands, and
   Moxie's entitlement check (`getMembership`) gains one lookup against
   the SVC subscription for members whose package includes
   `magazine_access`. The existing Moxie tables stay where they are for
   now; the audit's recommendation is to move the `moxie_*` (not `emag_*`)
   tables into the `svc` schema during Sprint 1 while row counts are
   trivially small, because they are part of what spins out.
4. **Logins converge, not merge:** email + password already works
   platform-wide; cell + OTP is additive on the same auth user. A Moxie
   reader who becomes an SVC member keeps one account.

## 5. OPEN DEPENDENCIES FOUND THAT THE HANDOFF DOES NOT LIST

1. **SMS OTP needs a provider.** Cell-number OTP at signup requires an SMS
   gateway (Supabase phone auth wants Twilio/MessageBird/Vonage or
   similar; none is configured in this stack, and WhatsApp is explicitly
   off the table until Sprint 5). Sprint 1's signup can be built with the
   OTP step behind the same thin-interface pattern as payments, but a
   provider account and sender ID are Dewald's to choose and pay for.
   This is the only new paid service Sprint 1 appears to need.
2. **The SVC Brand Identity Guide is not in the folder.** The handoff says
   "attached"; only the handoff itself is in `SVC/`. The colour table and
   rules inside the handoff are enough to start; the full guide should
   land in `SVC/` when available.

## 6. CONTRADICTIONS FOUND WHILE CRAWLING THE CURRENT SITE

Crawl saved to `SVC/crawl/` (home, shop, products, spin, contact, terms,
privacy as plain text).

1. **The noindex claim is almost, not exactly, true.** The homepage and
   most pages carry `noindex, follow`, but **/shop is set to index**. The
   rebuild's "index everything public" rule stands; this just corrects the
   record.
2. **/popia-notice returns 404.** The handoff lists it as a page to crawl;
   it does not exist. The privacy policy page exists. POPIA notice becomes
   a new page with legal-team text.
3. **The R750 arithmetic on the homepage does not reach its own headline.**
   The value breakdown shows R750 per retailer group against a "R2,000+"
   claim, and only Dis-Chem carries the "UP TO R750 VALUE" label
   explicitly; three retailer groups at R750 is R2,250, matching the
   handoff's note that three claims circulate (R2,000+, R2,250, R3,049+).
   The package builder's face-value total will end this.
4. **The homepage already promises what the ledger cannot yet prove:**
   "in verified coupons per month" appears under the R2,000+ figure, and
   "coupons verified with the retailers" phrasing appears in the FAQ, per
   the handoff's own do-not-say table.
5. **The referral copy on the site says "Referrals are optional, just a
   small thank-you reward" and shows the three levels openly with a
   "sign up 10 people and your membership is covered" line.** The rebuild
   keeps the three-level structure but section 8's explainer rules apply;
   the "10 people covers your R49" line is arithmetic on level 1 alone
   (10 × R5 = R50) and survives honestly.
6. **The bonus giveaway ("share your story, win R2,000")** is a
   Facebook-based promotion that lives outside the draw mechanics in
   section 10 and is not mentioned in the handoff. Parked as marketing,
   not platform, unless Dewald says otherwise.
7. Terms mention neither the draw nor the referral programme, and both
   "Smart Value Club" and "SmartValue Club" appear, as the handoff
   predicted. Confirmed for the legal team's list.

## 7. RECOMMENDED SPRINT 1 EXECUTION ORDER, FOR THE FRESH SESSION

1. `svc` schema migration with RLS from day one (member, partner, benefit,
   package, package_benefit, subscription, benefit_issue, voucher_batch,
   referral tables, draw tables, payout_line, demand_signal).
2. Hostname theming: smartvalueclub.co.za branch in the proxy beside
   Moxie's, SVC palette tokens, shared components untouched.
3. Public SVC site from the crawl's narrative, packages rendered from the
   database.
4. Signup: email + password path complete; OTP step built behind the
   interface, live the day an SMS provider exists.
5. Checkout on Paystack test keys behind the provider interface, with a
   new `svc` webhook route.

**This session stops here, as the handoff instructs.** Everything above is
banked in the repository and in memory; the build itself deserves a fresh
context, and loses nothing by getting one.
