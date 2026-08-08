# CHANGELOG

One entry per sprint, newest first. Reconstructed from `git log` and the
existing docs as far as this sprint could reliably go — that's back to
**3 August 2026**. Earlier history exists in `git log` but was not
individually reconstructed here; treat anything before 3 August as unverified
until someone does that pass. An honest gap beats an invented entry.

Every future sprint adds its entry here before reporting back, per
`HOUSE-RULES.md`.

---

## 8 August 2026 — WeCare's shop, and what twenty-two products broke

**Branch:** `wecare-shop-and-page`. Reports:
`docs/Report_WeCare_Products_v2.md`, `docs/WeCare_Client_Email_v2.md`.

Elize sent her price lists and her suppliers' product photography, which the
first WeCare build (2 August) had asked for and could not proceed without.
Her shop went from six products, five of them unpriced and none photographed,
to twenty-two priced products with photographs on eighteen.

Two things in the shop did not survive that jump, and both were fixed for
every member rather than for her.

**Collections.** `shop_products.collection` and `collection_position`
(migration `20260811100000`). The storefront groups by collection and puts
counted jump links above the grid. A shop with one collection or none renders
exactly as before, so nothing changed for any existing shop. Members set it
from the product form, with their own existing names offered back as
suggestions so one range cannot split into two headings on a typo.

**A searchable option picker** (`src/components/shop/OptionPicker.tsx`).
Above twelve options the pills become a searchable list, grouped by the first
descriptor key when that key varies. Fifty-one fragrances rendered as pills
is not a choice, it is a paragraph of nouns. Below twelve, unchanged.

Product cards now name the choice: "51 fragrances to choose from".

**On the perfumes.** Roughly 130 "inspired by" listings became two indexed
product pages, one for her and one for him, with the fragrance as a variant.
The designer names appear only inside the picker, never as a page title or in
structured data. That was the first report's recommendation, now built.

**Health claims stayed out**, unchanged from the first build. One new product
(Just Heal It wound spray) is listed at price-on-request with its description
cut back to the manufacturer's own intended-use statement, and flagged for a
conversation before it goes further.

Her page gained six of her own event photographs, a rewritten About built on
her own stated goal, and a story section that no longer repeats it.

## 8 August 2026 — The member dashboard, on a phone

**Branch:** `member-dashboard-navigation`. Sprint handoff:
`docs/Sprints/SPRINT-2026-08-08-member-dashboard-navigation.md`.

Dewald walked the dashboard on a phone and reported three things that were
really one: editing a page was "1 looooooongggg scrolling page", "Your page"
and "Edit your page" were two menu entries onto the same fields, and
"our users will be mostly on a phone, so navigation is key here".

**One door.** `/dashboard/edit` was never a different form: it rendered the
onboarding wizard's own Step1/2/3/5/6 components stacked vertically. Those
same components, plus the photo gallery and page style that used to sit on a
different tab, are now six named sections of the Your page tab, one open at
a time: your photos, how your page looks, your details, where you are, your
words, your prices. Names agreed with Dewald before any code, per
`INTERFACE-STANDARD.md`. The step components, their schemas and their Server
Actions are untouched and still shared with onboarding; they gained only an
optional flag to drop a heading the section header already carries.
`/dashboard/edit` is a permanent redirect into the tab.

**Navigation moved into the URL.** `DashboardTabs` held the active tab in
local state seeded from the first tab, which silently broke every link into
the dashboard: `PageChecklist` pointed at `/dashboard#photos`, the photos
live in a tab that was not mounted on arrival, so the anchor had nothing to
scroll to and a member landed at the top of Home with no idea why. The
server now reads `?tab=` and `?open=`, so a checklist item opens the right
tab, opens the right section and scrolls to it. `page-readiness.ts` gained a
section per item and builds its own hrefs, so the checklist and the ticks on
Your page cannot drift apart.

**Phone specifics.** Laid out at 390px, not checked there afterwards. The
header's five competing pills became one primary "View your page" plus a
quiet row (board, messages, log out); "Edit your page" is gone. Tabs are
`Home | Your page | Selling | Reviews | Marketing | Account`, and since six
pills are 576px in a 390px screen, the active tab now scrolls itself into
view on arrival and a fade marks that there is more to swipe to. Tabs and
sections hide rather than unmount, so half-typed answers survive a stray
tap, per the interface standard's "never lose what somebody has typed".
Selling and the rest still only mount once actually opened.

---

## 7 August 2026 — Onboarding two doors, and self-serve quality

**Branch:** `onboarding-self-serve-quality`. Sprint handoff:
`docs/Sprints/SPRINT-2026-08-07-onboarding-two-doors.md`.

Two halves of one question Dewald asked after seeing Davemarly's page: how
does a member who signs up on their own get near that quality, and how does
the done-for-you build become something anyone can buy?

**The self-serve half.** A theme is now recommended from the trade the
member already gave at step 2 (`src/lib/templates/recommend.ts`), shown
first with a "Recommended for your trade" badge and preselected; all 60
industry subcategories map to a real template, plus a keyword fallback for
free text. Every member photo now gets the treatment the done-for-you
builds applied by hand (`src/lib/photos-server.ts`): EXIF rotation, so a
portrait phone photo stops landing sideways on a live page, and a 1600px
resize, on both the upload and Pexels paths. The photo cap went 10 to 15.
The wizard now asks which photo belongs on the front page at the moment
the photos arrive, instead of leaving a dashboard control members never
found. The AI drafting prompt gained the Build Kit B3 rules it was missing
(no testimonials in any form, no unsupportable superlatives, no jargon,
South African English and Rand, headlines short and concrete). A page
checklist on the dashboard (`src/components/dashboard/PageChecklist.tsx`)
absorbed the old ProfileCompletenessBanner rather than competing with it.

**The build-order half.** `/pricing/build` is a real door: one Turnstile-
protected form, one checkout, and `/admin/build-queue` with the three
working day promise on a visible clock. The single checkout cannot use a
plan code, verified against Paystack's live docs: a plan code makes
Paystack charge the plan amount and ignore the amount passed, so R450 plus
the first period is charged as one plain transaction and the webhook then
creates the subscription from that charge's authorization with a
`start_date` one period out. Provisioning stays before payment, against
the handoff's letter but with the standing principle in
`src/app/pricing/actions.ts`, so a drop-off at the card screen is a row to
follow up rather than a silence.

**Also:** `Accommodation & Stays` added to `INDUSTRY_TAXONOMY` (Dewald is
building a guest house). The Retreat theme had existed since the Falling
Feather Inn build with nothing in the industry picker leading to it.

**Found while building, all pre-existing except the last two:**
- `PAYSTACK_PLAN_FOUNDATION_ANNUAL` (PLN_qf1kh46lwn5jxr1) is rejected by
  Paystack as an invalid plan code on the test key while the other three
  resolve. Still to check against the live account.
- A cabinetmaker typing "kitchen cupboards" was matched to the food theme,
  and "nail bar" matched nothing. Both caught by running all 60 taxonomy
  strings rather than reading them.
- A build-order member would have been sent the ordinary "Your page is
  live!" welcome email linking to a page nobody had built yet. They now get
  their own email.
- A Foundation build order would not have fired the Meta conversion, whose
  condition assumed Foundation never reaches that branch unpaid.

**Closed the same day, outside the sprint's own scope:** the main signup
form at `/pricing` had no Turnstile check. It had been recorded in
`HOUSE-RULES.md` as the one deliberate exception "because an account is only
created after a real Paystack payment succeeds", a justification that
Combined spec Sec 10 invalidated when it moved payment to the end of the
wizard. Both halves are now in place. The exemption did not start wrong, it
rotted, because nothing linked a change in when provisioning happens back to
the rule that depended on it.

**Still open:** public holidays are not accounted for in the three working
day promise, only weekends.

## 7 August 2026 — Kasi Kitchen theme and the Davemarly build

**Branch:** `davemarly-kasi-kitchen`.

The ninth Growth Build Kit theme and the platform's first food archetype:
`kasi-kitchen`, built for Davemarly (kasi food and micro bakery, Meqheleng,
Ficksburg — davidmolotsi04@gmail.com's self-signup of 6 August, upgraded to
a done-for-you build). New `menuboard` hero (the member's own food photo
full-bleed, on the phone too; WhatsApp-first CTA; Call and WhatsApp as
separate base-strip cells), `menu-board` services layout (the page's single
dark chalkboard band with the theme's fixed flame strip), `kitchen-pass`
gallery layout (two-row horizontal rail of square tiles), `till-slip` card
recipe and `order-ticket` eyebrow style. About reuses `statement` with
kitchen wording; location reuses `home-base`. Fifteen member photos
processed (1600px, q82, EXIF baked) and uploaded; page published at
`/davemarly` with three months admin comp mirroring the Molotsi cohort
arrangement, flagged for Dewald to confirm. Full entry in
`docs/Theme_Library.md`, build report in `docs/Report_Davemarly.md`.

**Same-day follow-up, from a real Facebook share Dewald posted:** a member
with no logo and no stored fallback photo fell through to
`/brand/logo-blue.png` as their link-preview image, which a 1.91:1 preview
crops into half a DigitalFlyer mark. Their own hero photo was ranked below
an ambient stock image, which was backwards. The share-image chain in
`src/app/[clientSlug]/page.tsx` is now logo, own hero photo, stock,
platform mark, and the hero branch serves a composed 1200x630 through
Supabase image transforms (a phone photo is portrait; a raw crop cuts the
subject in half). Three live members gained a real share image; members
with a logo are untouched. Two members still land on the platform mark
because they have neither a logo nor a photo, which is what the publish
checklist in `docs/Sprints/SPRINT-2026-08-07-onboarding-two-doors.md`
exists to catch.

---

## 7 August 2026 — KatisoBiz Jobs: Sprints 1 and 2, then the pre-launch rebuild

**Branches:** `jobs-sprint-1-job-seekers` and `jobs-sprint-2-employers`
(merged to main in the morning), then `jobs-prelaunch` (merged the same
day, after `codebase-health-audit` landed first, per Dewald's merge order).

**Shipped, morning (Sprints 1 and 2):** the CV builder with typed-code
email auth and anonymous drafts, three PDF templates, capped AI wording
checks, the ID/bank auto-strip, the anonymous indexable browse layer,
employer accounts with Paystack tiers (R45 starter / R69 unlimited, member
bridge for paying Growth/KatisoBiz members, two-week lapse grace), vacancy
posting with the advance-fee auto-hold, full-record views logged per
employer account, the jobs-cleanup cron, admin queues, and the conversion
landing page. jobs.katisobiz.co.za went live with this merge.

**Shipped, afternoon (pre-launch rebuild,
`scripts/handoff-jobs-pre-launch-improvements.md`):** the official OFO 2021
taxonomy (8/40/125/440/1,511 levels plus 5,946 specialisations as search
synonyms, seeded by script from the DHET workbook, two source anomalies
handled and logged); one shared searchable occupation picker on both
sides; branch-scoped skills that are structurally cross-branch-impossible;
experience level everywhere; CV import (in-memory parse, file never
stored); Write with AI (capped, accept-before-apply); Word export; the
seeker dashboard as the post-login landing; the apply flow and employer
applicant pipeline with saved candidates; structured vacancies with
draft → preview → publish and close/repost; the rebuilt home page with
real live counters, the CSS vacancy ticker and the KJ mark; the role-aware
header on every public page. Two entitlement bugs found and fixed by
walking the flows: drafts spending the post allowance, and the free post
"once ever" resetting every purge cycle (now a durable stamp).

**Deliberately not done:** dropping the dead `jobs_taxonomy` table waited
for Dewald's word (given later the same day, done in the follow-up).

**Follow-ups, same day:** `jobs_taxonomy` dropped with its referencing
columns; the 40 friendly display names for the OFO sub-major browse
filters shipped after Dewald's approval with his seven corrections
(`src/lib/jobs/ofo-display.ts`, display only, official titles stay
authoritative). One naming convention throughout: plain names, no
colon-plus-examples, which measured 341px against the 273px a closed
select offers at 375px.

**Reached main?** Yes, all of it, 7 August 2026.

---

## 6 August 2026 — Codebase health audit and the three reference documents

**Branch:** `codebase-health-audit` (off `origin/main`, in an isolated git
worktree so the session didn't disturb another branch's uncommitted work
sitting in the shared working directory — see below).

**Shipped:**
- This file, `HOUSE-RULES.md` and `MODULES.md`, all new at the repo root.
- 35 missing indexes on foreign-key columns, added directly to the live
  database and recorded as `supabase/migrations/20260806280000_missing_fk_indexes.sql`.
- Eight dependency bumps within their already-declared semver ranges
  (`@sentry/nextjs`, `@supabase/ssr`, `@supabase/supabase-js`,
  `@tailwindcss/postcss`, `@types/react`, `@types/react-dom`,
  `framer-motion`, `tailwindcss`) — verified with a clean `tsc --noEmit` and
  a clean `npm run check` afterwards.

**Deliberately not done:** No major dependency bumps (Next, React, ESLint,
TypeScript, Zod, `@anthropic-ai/sdk`, `@types/node`, `lucide-react` are all
listed with current/latest versions in the report, none applied). No RLS
changes. No fixes inside The Board, the WhatsApp inbox, Stays and Tours or
jobs — those four are out of scope for this sprint by name; findings inside
them are reported, not touched.

**Deleted:** Four confirmed-unreferenced components
(`src/components/brand/HeroSwoosh.tsx`, `src/components/home/DoMore.tsx`,
`src/components/marketing/SectionDivider.tsx`,
`src/components/marketing/HomepageCredibilitySection.tsx` — each verified
to have zero importers anywhere in `src/` before removal) and one unused
npm dependency (`class-variance-authority`, confirmed never imported).
`npx tsc --noEmit` and `npm run check` both stayed clean after every
deletion.

**Waiting on Dewald:** Whether `src/app/booking-and-shop/page.tsx` should
get a real nav link (it's reachable and in the sitemap, but nothing in the
app links to it since the home page split — the leftover `DoMore.tsx` above
was its pre-split original, now deleted) or stay URL/SEO-only on purpose;
the unbounded-query findings in The Board and the KatisoBiz Members List
(neither fixed, both explained in `MODULES.md`); a decision on the two
`unknown` Desk health-check providers (Resend, Meta) noted again in this
sprint's own report; whether `BIZUP_CLAUDE.md` — named in this sprint's own
handoff as a file that "must never be handed to a future session" — ever
actually existed in this repo, since a full-text search found no trace of
it anywhere, including in `docs/DOCUMENT_INDEX.md`.

**Reached main?** No — sits on its own branch pending Dewald's review, per
`HOUSE-RULES.md`'s preview-first rule.

---

## 6 August 2026 — A stray commit corrected the same day

**Branch:** `main`, direct.

What happened, plainly, because `HOUSE-RULES.md` now says this kind of
correction belongs in this file: a `git add -A` on `main` swept up 25
uncommitted files belonging to the separate, still-in-progress
`jobs-sprint-1-job-seekers` branch (the jobs module — see `MODULES.md`) and
committed them to `main` by accident, alongside seven files that *did*
belong on `main`. Caught the same day and corrected in two commits:
`6824d8a` restored the seven legitimate files to `main`'s own content and
untracked the 25 jobs files; a first attempt at the untrack silently
dropped the deletions, so `cabf93f` redid it, verified against
`git diff --cached --stat` before committing. No force push, no history
rewrite — corrective commits on top, because the bad commit was already
pushed. The 25 jobs files were left on disk, untouched, for that branch's
own eventual commit.

**Reached main?** Yes — both the accidental commit and its correction are
on `main`. Net effect on `main`'s tracked files: zero, once both are read
together.

---

## 6 August 2026 — Partner accounts

BidWeb (and any future partner) can add and manage more businesses
themselves under one login, without DigitalFlyer creating each account by
hand. See `MODULES.md`.

**Reached main?** Yes.

---

## 6 August 2026 — Four new Growth Build Kit themes

Retreat, Programme, Atelier and Workroom registered in the theme library,
plus two follow-up fixes the same day (Atelier's hero now prefers the
member's own photo; Atelier's gallery no longer borrows Marquee's
events-specific copy).

**Reached main?** Yes.

---

## 6 August 2026 — The Board: structural moderation before launch

Held/reported content, a banned-senders list, and the notice now showing on
single-kind composer screens as well as the general one. Landed alongside
an end-of-work report (`docs/REPORT-...` — check `docs/DOCUMENT_INDEX.md`
for the exact filename if it was added).

**Reached main?** Yes, merged same day.

---

## 6 August 2026 — KatisoBiz activation goes opt-in; Growth nudges

KatisoBiz activation is now something a member opts into rather than
something that happens to them; public URLs continue moving off `/bizup/`
onto `katisobiz.co.za`; Growth gained activation nudges. Merged the same day
as `unified-account-and-reviews` (linking Growth and KatisoBiz accounts,
review requests, policy/plan copy fixes).

**Reached main?** Yes.

---

## 5 August 2026 — A dense single day: marketplace polish, page poster rebuild, KatisoBiz slips, shop payments Sprint 2, Old Good

The busiest reconstructed day in this window. In rough order:

- **Marketplace cards** stopped showing wrong distances and stopped cutting
  descriptions mid-word; redesigned to match the quality of the site's own
  Facebook link preview.
- **The page poster** was rebuilt onto a fixed three-anchor daily schedule,
  replacing an earlier jitter/posts-per-day system — shipped with a note
  that it's "a queue Dewald approves, not a robot with opinions." A missing
  `service_role` grant on the new tables was caught and fixed the same day.
- **KatisoBiz expense slips** shipped: photograph a slip, it gets checked,
  travels with the books toward an accountant export, purges after export.
  A month of Slips given free to existing members. Two missing
  `service_role` grants (`bizup_audit_log`, `bizup_accounts`) fixed, then
  swept across every `bizup_*` table in one pass to close the class of bug
  rather than one table at a time.
- **KatisoBiz documents:** quote/invoice line items now take their own unit
  rather than a fixed six; an open quote shows how long it's been waiting; a
  draft invoice can be discarded the way a draft quote always could; Capitec
  Business added to the bank list.
- **KatisoBiz Pay Now:** invoices can now take payment on the member's own
  Paystack account.
- **Shop Sprint 2 payments core:** Bob Pay alongside Paystack, plus the
  connect flow.
- **Old Good** (Jordan's demo thrift shop) took its place in the Theme
  Library and started serving natively at `oldgood.co.za`.
- **Growth Subscribe** moved to server-side Meta CAPI rather than relying on
  the browser pixel alone, plus a tracking audit report and GA4
  cross-domain linking.
- **The Sprints folder** moved into `docs/Sprints/`, where it was meant to
  live.
- A build-breaking em dash was found and removed (the house-style check
  that would later catch this at build time — see `HOUSE-RULES.md` — was
  itself only added around this point).

**Reached main?** Yes, across several same-day merges
(`tracking-fix-growth-subscribe-2026-08-05`, `tracking-audit-2026-08-05`,
`page-poster-2026-08-05`, `sprint-2026-08-05`).

---

## 4 August 2026 — Shop audit polish, SEO house rules, the home page split, The Desk v3

- **Two new standing rules** entered the codebase's own working conventions,
  now folded into `HOUSE-RULES.md`: "every new surface ships clean, linked
  and crawled," and "leave no old traces." Both were prompted by a real
  miss — product pages and the marketplace hub were missing from the
  sitemap until a Search Console review caught it, and old suffixed member
  slugs lingered in Google's index generating ghost URLs in Search Console.
- **The sitemap** was corrected to list the marketplace, the shop hub,
  storefronts and product pages, and the product entries were confirmed to
  actually reach it (a second commit, suggesting the first pass didn't
  fully land).
- **Shop audit polish:** honest order tracking, visible discounts, visible
  options.
- **The home page** split off `/pricing` into its own front door at `/`,
  with its own handoff and report added to `docs/`.
- **The Desk v3** was built, in the commit's own words, "from his own
  feedback note, word for word."
- **Two dependency security advisories** (`brace-expansion`, `fast-uri`)
  patched same day.
- Assorted client-facing fixes: real screenshots replacing placeholders,
  KatisoBiz branding on the home page, a media library replacing the Pexels
  keyword fallback, trade-hero credibility captions, Copperline theme
  (Molotsi Plumbers as its first member), and legacy mailer copy work.

**Reached main?** Yes.

---

## 3 August 2026 — Moxie admin grows up; The Desk health check; Kwaai Press fixes

- **Moxie's owner dashboard**: funnel, reads, income, exports, a
  cancellation flow that can't get lost, team roles, writer/publisher
  permission split, a signed-in member menu, thank-you/welcome email, and
  marketing-suppression rails.
- **The Desk health check, phase 2**: real Vercel spend (via the FOCUS
  billing-charges API, after discovering the upcoming-invoice endpoint
  doesn't exist on this plan), a weekly restore test, and a daily
  scheduled run. This is the code this sprint's own Job 8 numbers were read
  through.
- **Kwaai Press**: three faults blocking August publishes closed; a
  rate-card layout added as the standing business-document template.
- Client email drafts and a report for the Jetting Worx build.

**Reached main?** Yes.

---

## Before 3 August 2026 — not reconstructed

Real history exists in `git log` well before this point (the repository's
product list — Growth, KatisoBiz, Kwaai Press, The Board, The Desk, Moxie —
was clearly built up over a longer period than these four days cover). This
sprint did not have room to reconstruct it responsibly. The next session
that has a reason to look further back should extend this section rather
than guess at it from memory.
