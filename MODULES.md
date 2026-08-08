# MODULES

**What exists, what state it's in, and where its detail lives.**

Built 6 August 2026 against the code on `main` (worktree checked out from
`origin/main`), by reading routes, actions and migrations directly rather
than trusting prior docs. Where a claim below could not be confirmed in the
code, it says so instead of describing something that might not exist —
that mismatch is exactly what this sprint exists to stop.

Every product shares one Next.js app, one Supabase project
(`cjqvelgarwfiskgtmrkm`, `DF-Growth`, eu-west-1 Ireland), and one Vercel
deployment. See `ESTATE.md` and `STACK.md` for the cross-repository and
infrastructure picture; this file is DF_Growth's own modules only.

---

## Growth (core: onboarding, member pages, dashboard)

**What it is:** The base product. A business signs up, pays via Paystack,
and gets a member dashboard plus a public page at `/[clientSlug]`, built from
a template ("anchor") system (`src/lib/templates/`) rather than hand-coded
per client. `growth_clients` is the root tenant table almost everything else
hangs off.

**What it is not:** Not a page builder a member edits freely — it's a
guided intake plus a fixed set of template anchors and design tokens.

**How a member changes their page:** One place, the "Your page" tab of
`/dashboard` (`src/components/dashboard/YourPage.tsx`), which is six named
sections with one open at a time. Those sections render the onboarding
wizard's own step components, so a field, its validation and its Server
Action exist once and are shared between signing up and editing later.
`/dashboard/edit` was a second door onto the same fields and is now a
permanent redirect into that tab. Which tab and which section are open both
live in the URL (`?tab=&open=`), which is what makes the page checklist on
Home able to link at the one thing that fixes each item.

**Status:** Live, mature. This is the oldest and most-depended-on part of
the codebase.

**Who for:** Public (the member's page), member (dashboard), admin.

**Spec:** `docs/06_DigitalFlyer_Growth_Brand_and_Content_Directive.md`
(brand/copy), `docs/GROWTH_DESIGN_SKILLS_AND_TEMPLATE_DIVERSITY_CLAUDE.md`
(the anchor/template system), `docs/Theme_Library.md` (every theme, updated
per new theme). Several older `GROWTH_*_CLAUDE.md` specs are superseded —
see `docs/DOCUMENT_INDEX.md`.

**Known gaps:** None found beyond what's logged elsewhere in this audit
(missing indexes on `growth_clients.hero_photo_id` and
`.referred_by_agent_id`, now added — see the codebase-health report).

**Last updated:** 8 August 2026 (member dashboard navigation sprint).

---

## Marketplace

**What it is:** A public, searchable/browsable grid of active member
businesses at `/marketplace` — search by name/industry/city, sort by
recency, popularity or distance ("near me" is opt-in only, never default).

**What it is not:** Not a directory or listing (see `HOUSE-RULES.md`
Terminology) — framed and built as a marketplace, with real ratings and no
fabricated stats.

**Status:** Live.

**Who for:** Public.

**Spec:** No standalone spec file found; built inline, referenced in commit
history ("Marketplace cards now match the quality of the Facebook link
preview", 5 Aug; "Marketplace redesign" per project memory).

**Known gaps:** Query is well-bounded (`.limit(60)`, batched photo/rating
fetches — no N+1 found here). The `.or(...ilike...)` text search on
`business_name`/`tagline`/`business_description` cannot use a plain index
(leading-wildcard ILIKE forces a sequential scan) — flagged in the database
audit as the single query most likely to slow down first as the table
grows, not fixed this sprint (would need a `pg_trgm` index, a schema
decision beyond this sprint's remit).

**Last updated:** 6 August 2026 (this audit).

---

## Shop

**What it is:** A cross-member product storefront at `/shop`, the same idea
as the marketplace but for physical/digital products (`shop_products`,
`shop_product_variants`, `shop_orders`). Payments: member's own Paystack
(preferred) or a DigitalFlyer-integrated split at a flat 7%, liability on
the seller.

**What it is not:** Standing 365 and Moxie Magazine are curated feature
cards linking to their *own* bespoke checkouts — they are deliberately not
`shop_products` rows, and the shop page's own code comments say this is a
bug that was already fixed once (Standing 365 was appearing twice).

**Status:** Live. Sprint 2 payments core (Bob Pay + connect flow + refunds)
shipped 5 Aug 2026. Bob Go waybills/tracking and Bob Pay sandbox
end-to-end are the known open pieces (per `docs/Handoff_Growth_Shop_and_Payments.md`).

**Who for:** Public (browse/buy), member (manage products), admin.

**Spec:** `docs/Handoff_Growth_Shop_and_Payments.md`,
`docs/Report_Sprint1_Shop.md`. `GROWTH_BOOKING_SHOP_MODULES_CLAUDE.md` is
superseded on payments specifically — it routes member payments through a
DigitalFlyer split, which is now explicitly forbidden as a *default* (member
choice, per the shop handoff).

**Known gaps:** Bob Go courier integration uses each member's own Bob Go
account, never DigitalFlyer's (project memory: partner programme pending).

**Last updated:** 6 August 2026 (this audit).

---

## Booking (appointments)

**What it is:** Slot-based appointment booking for a member's business
(`bookable_units`, `reservations`, with a `reservations_no_overlap`
exclusion constraint enforcing real double-booking protection at the
database level).

**What it is not:** Not accommodation. That's Stays and Tours, a different,
not-yet-built module — do not conflate the two (see `HOUSE-RULES.md`
Naming).

**Status:** Live but interim: `createBookingHold` in
`src/app/[clientSlug]/booking-actions.ts` currently books straight to
`confirmed` (unpaid) and notifies the owner to arrange payment directly.
The code's own comment says real payment (Paystack Subaccount routing) is a
later sprint's job per `docs/GROWTH_BOOKING_SHOP_MODULES_CLAUDE.md` Sec
3.2/3.6 — double-booking protection does not wait for that, it's real today.

**Who for:** Public (hold a slot), member (manage availability).

**Spec:** `docs/GROWTH_BOOKING_SHOP_MODULES_CLAUDE.md` (the parts on
booking specifically — its shop-payment routing is superseded, its booking
mechanics are not).

**Known gaps:** Payment-on-booking is not built yet, by design, per the
above.

**Last updated:** 6 August 2026 (this audit).

---

## Events

**What it is:** A public events board (`src/app/events/`) — organizers
(`event_organizers`) post events, visitors browse them.

**What it is not:** Not the same thing as The Board's post kinds — The
Board explicitly points at Events for "what's on" content
(`EventsPointer` component) rather than duplicating it.

**Status:** Live.

**Who for:** Public, event organizers.

**Spec:** No standalone spec file found under this name in `docs/` — flagged
as a gap. Whoever built this should add one, or point here to wherever it
actually lives.

**Known gaps:** `events.organizer_account_id` had no index (added this
sprint).

**Last updated:** 6 August 2026 (this audit).

---

## The agent programme

**What it is:** DigitalFlyer's own referral/reseller programme — an agent
signs up, gets a commission ledger (`commission_ledger`, `agents` table),
and can be "comped" onto a client account
(`growth_clients.referred_by_agent_id`).

**What it is not:** Not a member-facing feature — this is DigitalFlyer's own
sales channel, at `/agents`.

**Status:** Live. Per project memory: phases 0, 1 and 3 shipped; the page is
on its own v3 iteration, terms on v2.

**Who for:** Public (apply at `/agents`), agents, admin.

**Spec:** `docs/agent-programme-build-spec.md`, `docs/agent-page-v3-final.md`,
`docs/agent-terms-and-faq-v2.md` (the v1 terms file is superseded).

**Known gaps:** Per project memory, VAT_REGISTERED flag needs flipping when
DigitalFlyer itself registers for VAT — not a code gap, a future config
change.

**Last updated:** 6 August 2026 (this audit).

---

## KatisoBiz: documents (quotes and invoices)

**What it is:** Quoting and invoicing for South African small businesses —
`bizup_accounts`, `bizup_customers`, `bizup_documents` (quotes, invoices,
credit notes, with parent/supersession chains), `bizup_document_lines`
(free-form units, not a fixed six), PDF generation, WhatsApp send, and
KatisoBiz Pay Now (invoices carry a Paystack pay link on the member's own
account).

**What it is not:** Not accounting — no ledgers, no reconciliation, no
double-entry. Documents and money owed, full stop.

**Status:** Live, actively developed (heaviest recent commit volume of any
module — reminder numbering, discard-draft, ageing display, bank list
additions all landed in the days before this audit).

**Who for:** Member (KatisoBiz account holder), their customer (public
token view at `/bizup/d/[token]`, no login).

**Spec:** `BizUp/docs/bizup-phase1-spec.md` and siblings in `BizUp/docs/` —
cited directly from source comments, so the folder is never renamed even
though the product itself is called KatisoBiz everywhere a member can see
it.

**Known gaps:** None found in this audit beyond the general missing-index
findings (`bizup_documents.customer_id`, `.superseded_by_id`,
`.parent_document_id`, `bizup_document_lines.catalogue_item_id`,
`bizup_audit_log.actor_user_id` — all added this sprint).

**Last updated:** 6 August 2026 (this audit).

---

## KatisoBiz: reports and exports

**What it is:** Owner-facing reporting — statements, an accountant export,
CSV downloads (`src/app/bizup/reports/`).

**What it is not:** Not a general ledger or tax filing tool — exports data
for an accountant to use, doesn't do their job.

**Status:** Live.

**Who for:** Member.

**Spec:** Not separately documented — folded into the phase 1 spec above.

**Known gaps:** None found.

**Last updated:** 6 August 2026 (this audit).

---

## KatisoBiz: expense slips

**What it is:** Photograph a slip, it gets checked, and it travels with the
books toward an accountant export, with purge-after-export
(`bizup_expense_slips`).

**What it is not:** Not OCR-verified against a general ledger — it's
capture, review and export, not reconciliation.

**Status:** Live, shipped 5 August 2026. R49 confirmed pricing; 26 free
members on trial until 5 September 2026 per project memory.

**Who for:** Member.

**Spec:** `BizUp/docs/HANDOFF-slip-management.md` (per `docs/DOCUMENT_INDEX.md`).

**Known gaps:** None found.

**Last updated:** 6 August 2026 (this audit).

---

## Find a Trade (the KatisoBiz Members List)

**What it is:** A free, deliberately thin public listing at
`/katisobiz-members` — four facts and a WhatsApp button per opted-in,
actively-trading KatisoBiz member (`bizup_accounts.listed_publicly`, gated
on having actually issued a document). Links to a member's Growth page when
they have one, as the visible upsell.

**What it is not:** Not the marketplace, and deliberately thinner than it —
no profile pages, no photos, no reviews. Marketplace presence is a paid
Growth feature; a free KatisoBiz listing must stay a taste, not a
substitute, or it gives away what Growth members pay for.

**Status:** Live. Cached (`revalidate = 900`, 15 minutes).

**Who for:** Public, KatisoBiz members (opt in).

**Spec:** No standalone file found — described inline in the page's own
code comments, which are candid about the commercial reasoning. Worth a
real spec file if this grows.

**Known gaps:** `loadMembersList()` (`src/lib/bizup/members-list.ts`) has no
row limit — low risk today (31 `bizup_accounts` rows total) but genuinely
unbounded. Not fixed this sprint: capping it risks silently hiding real
members, which is a behaviour change, not a mechanical safety fix. Flagged
for a real decision (pagination, or accept the current low volume).

**Last updated:** 6 August 2026 (this audit).

---

## The Board

**What it is:** A public notice board — specials from businesses, things
for sale, people asking for help (`board_posts`, one of four kinds).
Comments, likes and reports are open to anyone, gated by Turnstile and rate
limiting rather than an account.

**What it is not:** Not an event finder — Events is the "what's on" module;
The Board is classifieds-and-specials, framed on Dewald's brief as one board
two kinds of author (business or person) rather than two products.

**Status:** Live but unlisted per project memory (structural moderation
landed just before this audit, 6 Aug — held/reported content, banned lists,
a poster/composer flow).

**Who for:** Public.

**Spec:** `The Board/` handoffs v1, phase reports 1–3, and a tester brief
(per `docs/DOCUMENT_INDEX.md`).

**Known gaps — this sprint's own finding, not fixed (Board is out of scope
for fixes here):** `listableMembers()` in `src/lib/board/queries.ts` is
completely unbounded (`.from("growth_clients").select(...)` with no
`.limit()`), and it is called independently by `listPosts`, `listAreas`,
`getPostBySlug` and `listPostsByMember` — a single Board page load
(`/board`) calls it at least twice with no caching between them. Trivial at
49 `growth_clients` rows; worth a shared per-request cache before this module
grows. Seven FK columns on `board_*` tables also have no index
(`board_comments.identity_id`/`.growth_client_id`,
`board_likes.identity_id`, `board_posts.identity_id`,
`board_reports.reported_by_client_id`/`.reported_by_identity_id`,
`board_threads.opening_post_id`) — listed, not added, per this sprint's
scope boundary.

**Last updated:** 6 August 2026 (this audit).

---

## The WhatsApp inbox

**What it is:** `whatsapp_conversations` exists in the schema and is
referenced from the codebase; a dedicated build spec exists
(`scripts/handoff-whatsapp-inbox.md`, not yet committed to this repo — see
`docs/DOCUMENT_INDEX.md`'s "not in git" list).

**What it is not:** Unconfirmed — out of scope for this sprint to build or
verify in depth.

**Status:** Unclear from the code alone whether this is live, partial or
specced-only. **Flagged rather than guessed**, per this sprint's own rule:
a table and some references exist, but this audit did not trace the full
feature. A past note records a folder once described as a "lead switchboard"
that actually held a scrapped signup wizard — whoever picks this module up
next should verify current state against the code before trusting any prior
description, including this one.

**Who for:** Unconfirmed.

**Spec:** `WhatsApp/Handoff_WhatsApp_Lead_Switchboard_v1.md` (not in git).

**Known gaps:** `whatsapp_conversations.growth_client_id` has no index —
listed, not added (module out of scope for fixes this sprint).

**Last updated:** 6 August 2026 (flagged, not fully audited).

---

## Stays and Tours

**What it is:** Planned accommodation module. **Not found anywhere in the
code** — no `stays_*` or `tours_*` tables, no matching routes. The handoff
(`scripts/handoff-stays-and-tours-phase1.md`) exists only on Dewald's
machine, uncommitted.

**What it is not:** Not the same as Booking (appointments), which is a
different, already-live module — see Naming in `HOUSE-RULES.md`.

**Status:** Specced only. Not built.

**Who for:** N/A yet.

**Spec:** `scripts/handoff-stays-and-tours-phase1.md` (not in git).

**Known gaps:** N/A — nothing built yet to have gaps.

**Last updated:** 6 August 2026 (confirmed absent from code).

---

## Jobs (KatisoBiz Jobs)

**What it is:** A jobs board on `jobs.katisobiz.co.za` with a free CV
builder as the core product. Job seekers build a CV by answering questions
or by uploading an existing PDF/Word CV (parsed in memory, file never
stored), get AI writing and wording help (capped, restate-only, accepted
before anything saves), download it free as PDF or Word, apply to
vacancies in one tap, and manage everything from a dashboard. Employers
post structured vacancies chosen from the official OFO 2021 occupation
list, preview the advert exactly as applicants see it before publishing,
and manage applicants through a new/reviewing/shortlisted/declined pipe.
An anonymous, indexable browse layer shows candidates without any
identifying detail; full records show only to registered employers with
every view logged. Pricing: paying Growth/KatisoBiz members post free and
unlimited; non-members get one free post once ever, then R45/month
(5 posts) or R69/month (unlimited) via Paystack, with a two-week lapse
grace enforced by cron.

**What it is not:** A match-scoring engine (alerts and written reasoning
only, never scores), a file store (uploads are never kept), a place that
ever charges a job seeker to build, download, be found or apply, or an
auto-poster of people to Facebook (roles may be posted, people never).

**Status:** Live on main since 7 August 2026, including the pre-launch
rebuild (OFO 2021 taxonomy with 1,511 occupations and 5,946 synonyms,
CV import, Write with AI, Word export, both dashboards, applications,
structured vacancies with preview-before-publish, rebuilt home page with
live counters and the KJ mark).

**Who for:** South African job seekers on phones (free, always), and the
small businesses and recruiters hiring them (the only paying side).

**Spec:** `scripts/spec-katisobiz-jobs.md` and
`scripts/handoff-jobs-pre-launch-improvements.md`; end-of-sprint reports in
`docs/REPORT-katisobiz-jobs-sprints-1-2.md` and
`docs/REPORT-jobs-prelaunch.md`.

**Known gaps:** Sprint 3 backlog (job alerts both ways, Facebook posting
via Page Poster, verified-employer badge, vouching, application fit notes
as written reasoning). Friendly display names for the 40 OFO sub-major
browse filters awaiting Dewald's approval. In-memory rate limits reset per
serverless instance (documented; the durable anti-scrape control is the
view-log watchlist on /admin/board).

**Last updated:** 7 August 2026.

---

## Kwaai Press / Moxie

**What it is:** Two linked pieces: Kwaai Press is the magazine-layout
builder (`emag_*` tables — articles, editions, flatplan, assets),
`/bizup/kwaaipress/moxie/...`; Moxie is the published product on top of it
— `moxiemag.co.za`, a paid membership (`moxie_subscriptions`,
`moxie_purchases`, `moxie_access_codes`), with its own admin, funnel and
export tooling.

**What it is not:** Kwaai Press is the tool; Moxie is one publication built
with it. Don't conflate "Kwaai Press is broken" with "Moxie is broken" —
they're one codebase but the builder and the publication are different
failure surfaces.

**Status:** Live, mature. Moxie's admin dashboard (funnel, reads, income,
exports, team roles) shipped 3 August 2026.

**Who for:** Kwaai Press: KatisoBiz members building a publication. Moxie:
public readers, subscribers, Moxie's own admin.

**Spec:** `eMag/` — several overlapping instruction files
(`Moxie-Project-Instructions.md`, `Moxie_Project_Instructions_Clean.md`) —
check dates before trusting either, per `docs/DOCUMENT_INDEX.md`.
`Moxie_Editorial_and_Design_Reference_2026.md` for house style.

**Known gaps:** Several FK columns without an index, all added this sprint
(`emag_articles.created_by`/`.approved_by`, `emag_assets.edition_id`,
`emag_flatplan.ad_id`/`.article_id`, `emag_members.publication_id`,
`moxie_access_codes.redeemed_by`, `moxie_billing_events.subscription_id`,
`moxie_editions.emag_edition_id`, `moxie_purchases.edition_id`).

**Last updated:** 6 August 2026 (this audit).

---

## The Desk

**What it is:** A single-operator private screen, at its own hostname
(`desk.katisobiz.co.za`, per `src/proxy.ts`) — a running list of ideas,
sprints, items, a health check, and a tracking view. Built for Dewald's own
use, not a member-facing product.

**What it is not:** Not a project-management tool for a team — explicitly
one user (per `CLAUDE.md`'s role table: "The Desk, one user").

**Status:** Live, on its third iteration ("The Desk v3: built from his own
feedback note, word for word", 4 Aug). Its own health check
(`src/lib/desk/health/`) is what most of this sprint's Job 8 numbers were
read through.

**Who for:** Admin (Dewald) only.

**Spec:** `TheDesk/` — handoffs v1/v2, build reports v1/v2,
`Handoff_Desk_HealthCheck.md` and `Report_Desk_HealthCheck_Phase2.md`.

**Known gaps:** Per its own phase 2 report: Resend and Meta usage are
`unknown` by design (no read key held), and the weekly restore test's first
scheduled run was 10 August 2026 — check whether it has actually run
successfully since.

**Last updated:** 6 August 2026 (this audit, read directly, not just
described).

---

## Growth Build Kit themes (Retreat, Programme, Atelier, Workroom, Marquee, Copperline, Fieldwork, Old Good, and others)

**What it is:** The growing library of per-client design "anchors" used for
done-for-you agency builds — each a themed hero/layout combination
registered in `src/lib/templates/`. Four more (Retreat, Programme, Atelier,
Workroom) landed 6 August 2026 alongside this audit.

**What it is not:** Not separate products — these are template variants
inside Growth's own template system (see Growth, above).

**Status:** Live and actively growing.

**Spec:** `docs/Theme_Library.md` — the handoff's own rule is to add a row
per theme; per project memory this hasn't always happened, so treat the
library as a starting point, not a guarantee of completeness, and verify
against `src/lib/templates/registry.ts` if the count matters.

**Known gaps:** None found specific to this audit's scope.

**Last updated:** 6 August 2026.

---

## Done-for-you build orders (the R450 door)

**What it is:** The second way into Growth. A stranger fills in one short
Turnstile-protected form at `/pricing/build`, pays R450 plus their first
subscription period in a single Paystack transaction, and their build lands
in `/admin/build-queue` with a three working day clock. Dewald (or a Build
Kit session) fulfils it using `DigitalFlyer/Clients/Growth_Build_Kit_v1.md`,
which lives outside this repo.

Key files: `src/app/pricing/build/`, `src/lib/growth-client/build-order.ts`
(amount, promise, working-day maths), `src/lib/paystack/checkout.ts`
(`initializeBuildOrderCheckout`), `src/lib/paystack/subscriptions.ts`
(`createSubscriptionFromAuthorization`, `nextPeriodStart`),
`src/lib/email/build-order.ts`, and the build-order block in
`src/app/api/webhooks/paystack/route.ts`. State lives on `growth_clients`
in the `build_order_*` columns.

**What it is not:** Not a separate product or tenant. A build-order member
is an ordinary Growth member whose page someone else filled in, with the
same dashboard and the same ability to change every word of it. That is the
Build Kit's own B1 test.

**The one thing to know before changing it:** the combined checkout cannot
use a Paystack plan code. A plan code makes Paystack charge the plan amount
and ignore the amount passed, so attaching one silently drops the R450.
The charge is a plain transaction and the subscription is created afterwards
from its authorization, dated a period out. Both halves are commented at
length in the two files above.

**Status:** Built 7 August 2026, on branch `onboarding-self-serve-quality`,
not yet merged and not yet exercised with a real payment.

**Spec:** `docs/Sprints/SPRINT-2026-08-07-onboarding-two-doors.md`.

**Known gaps:** The three working day promise skips weekends but not South
African public holidays, so a holiday in the window makes it a day
optimistic. The build form does not collect photos; members are asked for
them by email and on WhatsApp afterwards. A tick inside the onboarding
wizard still sets `setup_service_requested_at` without payment, which is a
separate, unpaid intent signal, not a build order.

**Last updated:** 7 August 2026.

---

## Page Poster

**What it is:** A queue of social content Dewald approves before it posts,
on a fixed three-anchor daily schedule (replacing an earlier jitter/posts-
per-day system, per the 5 Aug commit history).

**What it is not:** Not an autonomous posting bot — the queue is
Dewald-approved by design, not "a robot with opinions" (the shipping
commit's own words).

**Status:** Live.

**Spec:** `docs/PagePoster-ContentGuide.md`.

**Known gaps:** `page_poster_queue.evergreen_id` had no index (added this
sprint).

**Last updated:** 6 August 2026 (this audit).

---

## Partner accounts (agency-managed sub-accounts)

**What it is:** Lets an agency partner (e.g. BidWeb) add and manage
multiple client businesses themselves under one login, shipped 6 August
2026.

**What it is not:** Not the same as the agent programme — this is an
agency managing several `growth_clients` records; the agent programme is
DigitalFlyer's own referral/commission channel.

**Status:** Live, shipped same day as this audit — least time-tested module
in the codebase as of this writing.

**Spec:** Not found as a standalone file — check with whoever shipped
`c6a071f` if a spec exists outside git.

**Known gaps:** Unaudited beyond what the general database/dead-code passes
in this sprint would have caught incidentally.

**Last updated:** 6 August 2026.

---

## Flagged: in a prior document but not found in the code

Nothing in this pass. Every module named in `CLAUDE.md`'s own product list
(Growth, KatisoBiz, Kwaai Press, The Board, The Desk, Moxie) was confirmed
present in the code. The two genuine "described but not found" cases are
listed above in their own right rather than buried here: **Stays and
Tours** (spec exists, nothing built) and **the WhatsApp inbox** (partially
traceable, not fully verified this sprint).
