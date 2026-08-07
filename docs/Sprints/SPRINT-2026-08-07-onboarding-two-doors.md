# Sprint handoff: Onboarding two doors and self-serve quality

**Written 7 August 2026, straight after the Davemarly / Kasi Kitchen build,
by the session that did that build. Decisions below were made by Dewald the
same day; do not re-ask them.**

## Progress

**All six items built.** Branch `onboarding-self-serve-quality`, four
commits, **not merged and not deployed**. The migration has been run on the
database by Dewald. Nothing has been exercised with a real payment yet.

- **Item 2, theme recommendation: done.** `src/lib/templates/recommend.ts`.
  All 60 industry subcategories map to a real template, verified by running
  them. Free-text fallback for "Other" too.
- **Item 3, photo experience: done.** EXIF rotation and 1600px resize on
  both upload paths (`src/lib/photos-server.ts`), cap raised to 15, hero
  chosen inside the wizard, guidance copy on both surfaces.
- **Item 4, copy quality: done.** Build Kit B3 rules baked into
  `src/lib/ai/draft-copy.ts`.
- **Item 5, publish checklist: done.** `src/components/dashboard/PageChecklist.tsx`,
  which absorbs the old ProfileCompletenessBanner rather than duplicating it.
- **Item 1, two-door signup: built, needs the migration and real testing.**
  `/pricing/build`, its Turnstile-protected action, the combined checkout,
  the webhook half, and `/admin/build-queue` with the clock.
- **Item 6, how-to and FAQ: done.** A "We Build It For You" category on the
  FAQ, updated design and photo answers, the two doors stated at the top of
  How It Works, and the hero image control written out in the guide. Also
  corrected the two other surfaces still promising the old manual R450
  arrangement (the admin client page and the KatisoBiz upsell footer).
- **Extra, not in the handoff: Accommodation & Stays** added to
  INDUSTRY_TAXONOMY (Dewald asked, 7 Aug, he is building a guest house).
  The Retreat theme had nothing in the picker leading to it.

Typecheck, lint and production build pass. `/pricing/build` verified
rendering live with the real total (R630 for Growth monthly) and its
Turnstile field present. Not yet walked end to end: that needs the
migration below, plus a member login for the wizard half.

### Before this can be tested: run the migration

`supabase/migrations/20260810100000_build_orders.sql` adds the
`build_order_*` columns. The code queries them, so it does not work until
this is run in the Supabase SQL Editor. Nothing else in the sprint depends
on it.

### Decisions taken, not asked

Both were flagged before building and both had effectively one answer that
fits what was already specified. Say if either is wrong.

1. **The single checkout is one plain transaction, not a plan-based one.**
   Verified against Paystack's live docs on 7 Aug: a plan code makes
   Paystack charge the plan amount and ignore the amount passed, so
   "R450 + first period" is impossible as one plan transaction. It charges
   the combined total, then the webhook creates the subscription from that
   charge's authorization with `start_date` one period out.
2. **Provision before payment, not on it.** The handoff said on payment;
   `src/app/pricing/actions.ts` records the opposite as a standing
   principle so a drop-off at the card screen is visible. Kept the
   principle; the queue lists unpaid starts separately.

### The one to read first, now fixed

**The main signup form had no Turnstile check, and the reason recorded for
exempting it had quietly stopped being true.** `HOUSE-RULES.md` said Growth
member signup was the one deliberate exception "because an account is only
created after a real Paystack payment succeeds, which no bot can fake".
Combined spec Sec 10 moved payment to the end of the wizard, so
`startCheckout` in `src/app/pricing/actions.ts` provisions before any money
exists: a `growth_clients` row, a Supabase Auth user, and a real invite
email, from an anonymous form protected only by the in-memory rate limit the
same house rule says is not the gate.

Closed 7 August 2026 at Dewald's request: `verifyTurnstileToken` in the
action before the schema parse, `<TurnstileWidget />` in the tier card form.
Verified on the rendered page that `/pricing` carries exactly two widgets
for its two signup forms, so no form is unprotected and none has an orphan
widget. Both Turnstile env vars were already set and in use by other Growth
forms, so no Cloudflare configuration was needed.

**Worth testing first thing:** a real signup on `/pricing` for both
Foundation and Growth. A server check with a broken widget locks real people
out, which is the one way this change could bite.

### Found along the way, needs Dewald

- **`PAYSTACK_PLAN_FOUNDATION_ANNUAL` (PLN_qf1kh46lwn5jxr1) is rejected by
  Paystack as an invalid plan code** on the local test key, while the other
  three plan codes resolve fine. This is pre-existing, not from this sprint,
  and it may simply be a plan that exists in live but not in test. Worth
  confirming against the live account, because a Foundation-annual member
  converting would hit it.
- **Public holidays are not accounted for** in the three-working-day
  promise, only weekends. A holiday inside the window makes the promise a
  day optimistic.
- **Which tiers the build door should offer** is a guess: it currently
  offers Foundation and Growth, both intervals. The handoff only said
  "month-to-month or annual".

---

## Why this sprint exists

Dewald, 7 August 2026, after seeing Davemarly's page: "how do we get this
kind of quality for our members who sign up directly?" The answer split in
two, and both halves are this sprint:

1. **Self-serve members get a materially better guided experience** so a
   member doing it themselves lands much closer to done-for-you quality.
2. **Signup itself offers two doors**: "Do it yourself" or "Let us build it
   for you" at **R450 once-off**, so the done-for-you quality becomes a
   product anyone can buy, not something only Dewald's own clients get.

## Decisions already made (Dewald, 7 Aug 2026)

- **R450 scope:** a Davemarly-standard build. Theme chosen for their trade,
  their photos processed and curated, copy written from their own words,
  hero picked. Excludes logo design and shop product loading.
- **Promise:** live within **3 working days**.
- **Billing:** ONE checkout — R450 once-off plus the first subscription
  period (member chooses month-to-month or annual at signup). Account
  provisions immediately; the build starts; page live inside the promise.
- **One sprint, both halves.** How-to and FAQ get updated once, at the end,
  covering everything.

## What already exists (verified in code this session — build on it, do not rebuild it)

- **Hero image management exists.** Dashboard `PhotoGallery.tsx` has
  "Use as hero image" / "Unset hero image" per photo, delete, and a
  `PexelsPicker` pre-filled with the member's industry. Onboarding
  `Step4PhotoUpload.tsx` offers upload + Pexels. Dewald believed this
  space was missing; the real gap is guidance and discoverability, not
  the mechanism.
- **Nine trade themes** in `src/lib/templates/registry.ts` with per-trade
  registers (`docs/Theme_Library.md`), picker at the template step.
  Members currently get no recommendation and default to Classic.
- **AI copy drafting** exists (`ai_landing_draft`, the Write with AI step).
- **`setup_service_requested_at`** column already on `growth_clients` — a
  hook for "help me" intent, never productised.
- **`billing_cycle`** supports `monthly | annual` already.
- **10-photo cap** on self-serve uploads. Davemarly (done-for-you) has 15.
- **`fallback_photo_url`** gives an industry stock image when no hero is
  chosen.
- Build discipline lives in `DigitalFlyer/Clients/Growth_Build_Kit_v1.md`
  (outside this repo) — its Part B3 copy rules are the ones to bake into
  the AI prompt (item 4).

## The work

### 1. Two-door signup

The pricing/signup flow opens with the choice, plainly priced:

- **Do it yourself** — the existing flow, improved by items 2 to 5.
- **Let us build it for you, R450 once-off** — a short form asking only
  what a build genuinely needs (business name, trade, the member's own
  words about what they do, phones incl. WhatsApp, address, email, plan
  choice month-to-month or annual), then ONE Paystack checkout for
  R450 + the first subscription period. On payment: provision the account
  (existing webhook pattern), flag it as a build order, and surface it in
  an admin build queue with the 3-working-day clock visible. Dewald (or a
  Build Kit session) fulfils; the Build Kit document is the manual.
- The checkout page must say exactly what is charged today, in Rand,
  before any card entry.
- Turnstile on the new anonymous form — both halves, widget and server
  check. No exceptions.

### 2. Theme recommendation by trade

Map industry → recommended theme (food → kasi-kitchen, plumbing/building
trades → copperline or fieldwork, guest houses → retreat, training →
programme, events → marquee, craft → workroom or atelier, manufacturers →
atelier, and sensible defaults elsewhere). The wizard preselects the
recommendation with a "Recommended for your trade" badge; the member can
still pick anything. The mapping lives next to the registry, not scattered.

### 3. Photo experience

- Bake EXIF rotation + resize into the server-side upload path so every
  member photo is handled the way done-for-you photos are (sharp already
  in the stack; the Davemarly script `1600px / quality 82 / .rotate()` is
  the reference treatment).
- A proper "choose your hero" moment: photos shown big, plain-language
  guidance ("this one fills your front page"), aware of whether the
  member's theme is photo-led.
- State clearly in the wizard that images matter, with the two paths:
  upload your best, or pick honest stock from the Pexels library. Stock
  may NEVER pose as the member's own work (house rule) — captions and
  the "our photo" badges stay own-uploads only.
- Raise the 10-photo cap to 15 (Davemarly precedent).
- Surface "you can change your hero or any photo later from your
  dashboard" — the feature exists; members do not know.

### 4. Copy quality in Write with AI

Bake the Build Kit B3 rules into the drafting prompt: build from the
member's own words and cadence; never invent a verifiable fact; no
testimonials or social proof; no unsupportable superlatives; South African
English, Rand, no em dashes; write for a customer with a problem right
now. Headlines short and concrete ("Kotas. Grills. Fresh bakes."), never
agency filler.

### 5. Publish checklist

Before publish, a friendly checklist (nudges, not blockers, except where
the page would be broken): hero chosen if the theme is photo-led, 5+
photos, WhatsApp number set, address in plain words, tagline present.
Green ticks, plain language.

### 6. How-to and FAQ

Update every affected How-to and FAQ surface once, at the end: the two
doors and what R450 buys (scope + 3 working days), choosing/changing the
hero image, Pexels stock vs own photos, theme recommendation, the
checklist. Same plain voice as the rest of the site. "Good day {name},"
in any member correspondence, never "Hi there".

## Constraints

- One branch, named for the work. Preview deployment before main. Verify
  live with strings the pages actually render.
- The R450 is DigitalFlyer's own product fee — it belongs in
  DigitalFlyer's own Paystack. (Members' customer payments still never
  touch our account; unchanged.)
- No change in behaviour for existing members' live pages.
- Update CHANGELOG.md, MODULES.md, HOUSE-RULES.md (if a rule changes) and
  this file before calling it done.

## Out of scope

- Logo design, shop product loading (not in the R450).
- Any change to the Build Kit document itself.
- Migrating existing members between plans or themes.

## Open questions for Dewald (collect, don't block)

- The exact wording of the R450 offer on the pricing page (draft it, he
  edits).
- Whether the R450 build queue should notify him by email/WhatsApp or
  just sit in the admin.
