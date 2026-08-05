# Tracking and measurement audit

Against `docs/Sprints/SPRINT-2026-08-05 - Number 2.md`, Part 1. Read against
`main` as actually deployed, not a branch. No changes made yet, per the
handoff: "do not proceed past the audit without Dewald seeing it."

---

## Meta

**Pixel IDs that exist:**

1. `NEXT_PUBLIC_DIGITALFLYER_META_PIXEL_ID` — DigitalFlyer's own pixel.
   Fires on the marketing site (pricing, marketplace, events, FAQ, agents),
   the signup thank-you pages, and every KatisoBiz page that renders
   `BizUpHeader` (help, FAQ, how-it-works, the KatisoBiz landing page,
   signup). It does **not** appear on the actual KatisoBiz app screens
   (quotes, invoices, dashboard) — those don't render `BizUpHeader`.
2. **Each Growth member's own pixel** (`growth_clients.meta_pixel_id`,
   entered by the member in their dashboard) — fires on their own page only.

**Whose pixel is on member pages: theirs, not ours.** Both the browser
pixel (`PixelConsentGate` in [ClientLandingPageView.tsx:172](../src/components/landing/ClientLandingPageView.tsx))
and the server-side CAPI call (`sendCapiEvent` in
[lib/meta/capi.ts](../src/lib/meta/capi.ts)) read `client.meta_pixel_id`
and the member's own encrypted token. DigitalFlyer's pixel ID never appears
on a member page. **We cannot see traffic to any of the 34 member pages in
our own Meta account.** That was already the intended design per
CLAUDE.md ("a client's own pixel, entered per-client in their dashboard"),
not a bug, but worth confirming plainly since it means our own ad
audiences (Part 3) cannot be built from member-page visitors at all, only
from our own domains.

**Does katisobiz.co.za carry a pixel: yes, our own,** via `BizUpHeader`,
but only on the marketing/signup surface, not the in-app screens where
actual product usage happens.

**Is CAPI actually sending: mostly yes, one real gap.**

- Member leads (`captureLead` in `[clientSlug]/actions.ts`): sends, real.
- Foundation trial and Growth/Enterprise account-creation
  (`CompleteRegistration`, `pricing/actions.ts`): sends, real, correctly
  deduped against the browser pixel (see below).
- KatisoBiz paid subscription (`Subscribe`,
  [webhooks/paystack/route.ts:238](../src/app/api/webhooks/paystack/route.ts)):
  sends, real, correctly deduped.
- Standing 365 book purchase (`Purchase`, same file, line 322): sends,
  real, correctly deduped.
- **A paid Growth Engine / Enterprise subscription: does not send at
  all.** No `sendDigitalFlyerCapiEvent` call exists anywhere in the
  webhook for this case. This is the platform's own highest-value paid
  conversion and the one a campaign about to run would most want to
  optimise toward, and it currently has zero server-side backing.

**Event ID dedup: correct everywhere it's wired, with one gap that matches
the one above.**

- `CompleteRegistration`, KatisoBiz `Subscribe`, and the Standing 365
  `Purchase` all share one `event_id` (Paystack's transaction reference,
  or a generated UUID) between the server call and the matching browser
  `MetaConversion` call on the return page. Meta will correctly count each
  as one conversion.
- Member-page leads don't need dedup: the browser pixel there
  (`MetaPixelScript`) deliberately only ever fires `PageView`, never
  `Lead` — a design choice already documented in the code specifically to
  avoid needing shared IDs. No double counting there.
- **The Growth paid `Subscribe` event is the one place this breaks**, and
  it breaks in the opposite direction from double counting.
  [pricing/success/page.tsx](../src/app/pricing/success/page.tsx) fires
  `<MetaConversion event="Subscribe" />` with **no `eventId` prop at
  all**, and there is no server-side event to dedupe against in the first
  place. So every paid Growth signup is tracked by the browser pixel
  alone, with the exact weakness CAPI exists to cover (ad blockers, iOS
  restrictions, cookie declines).

**Event naming consistency: consistent.** `CompleteRegistration`,
`Subscribe`, `Lead`, `Purchase` are used the same way on both products,
matching Meta's own standard event vocabulary rather than inventing custom
names.

---

## Google

**GA4: installed site-wide, one property.** `NEXT_PUBLIC_GA_MEASUREMENT_ID`
loads in the root layout ([layout.tsx:69](../src/app/layout.tsx)), which
every domain this deployment serves shares — growth.digitalflyersa.co.za,
katisobiz.co.za, and everything else routed through `src/proxy.ts`. One
measurement ID sees all of it.

**Cross-domain measurement: not configured.** The `gtag('config', ...)`
call carries no `linker` or `cookie_domain` setting. growth.digitalflyersa.co.za
and katisobiz.co.za are different registrable domains, not subdomains of
one domain, so GA4's first-party cookie is scoped separately on each side
by default. **A visitor moving between the two products today is counted
as two different people, and the referral on the katisobiz.co.za side
shows growth.digitalflyersa.co.za as the traffic source rather than
whatever actually brought that visitor in the first place** (a Google
search, an ad, a WhatsApp share). This is exactly what the handoff
predicted before I looked.

**Search Console: one verification file exists, account state unknown from
code.** `public/google9c3dc8a0081bd6c9.html` sits in the shared `public`
folder, so it answers on every domain the app serves, both
growth.digitalflyersa.co.za and katisobiz.co.za. That's necessary but not
sufficient: whether both domains are actually added and verified as
properties is a state that lives in your Search Console account, not in
this code, and I have no way to check it from here. Numbered step below.

**Google Ads: nothing.** No `gclid` handling, no conversion ID, no
Google Ads tag anywhere in the code. Matches CLAUDE.md's own explicit
scope ("Google Ads integration... not part of this build").

---

## Consistency

**UTM parameters: not captured anywhere in the platform's own data.**
Zero matches for `utm_source`, `utm_campaign` or `utm_medium` in `src`.
GA4's own reporting will still pick these up automatically from the URL
(that's built into gtag, not something this codebase has to do), but
`leads`, `capi_events`, and `growth_clients.signup_channel` never store
them. `signup_channel` only ever holds `web`, `whatsapp` or
`legacy_reactivation`, the last one set by an internal admin batch
process, not by an arriving `utm_source` value.

**The legacy mailer's `utm_source=legacy-mailer`: not recorded anywhere
outside GA's own reports.** A signup arriving from that link is
indistinguishable from any other `web` signup in our own database. GA
will show it if you go looking, the product itself has no memory of it.

**Commercial events, checked one by one:**

| Event | GA4 | Meta |
|---|---|---|
| Trial started (Foundation) | `sign_up` / `foundation_trial` | `CompleteRegistration`, deduped |
| Growth/Enterprise subscription paid | `sign_up` / `growth_paid` | `Subscribe`, **not deduped, no server backup** |
| Lead form submitted (member page) | `generate_lead` | `Lead`, server-side, member's own pixel |
| KatisoBiz signup | none found | `CompleteRegistration`, deduped |
| First quote/invoice issued | none found | none found |

The last two rows are gaps against the audit's own list, in ascending
order of how much they'd matter to a live campaign: KatisoBiz's actual
signup event has no GA-side record at all (Meta covers it), and issuing a
first document, a real product-engagement milestone, is invisible to both
systems entirely.

---

## What was double counted, and by how much

**Nothing was found double counted.** Every place that fires both a
browser and a server event shares one `event_id`, correctly. The one real
defect (Growth paid `Subscribe`) is a visibility gap, not a double count:
the conversion is undercounted for any visitor the browser pixel misses,
not counted twice for anyone.

## Whose pixel sees member traffic

The member's own, never ours. Confirmed above. This is existing, intended
design, not something this audit is flagging as broken, just making
explicit since it directly shapes what Part 3's audiences can and can't
be built from.

## What's now being tracked that wasn't before

Nothing yet. This is the audit only, per the handoff's own instruction not
to proceed to fixes before you've seen this.

## Anything that contradicts the handoff's assumptions

- The handoff frames "whose pixel is on member pages" as an open question
  with a possible bad answer. It has one definite answer: theirs, always,
  by design, and that was already true before this session, not something
  that drifted.
- The handoff's cross-domain concern about "two people, wrong referral"
  is not hypothetical, it's exactly what's happening today, confirmed by
  reading the actual `gtag` call rather than assuming.
- One thing the handoff didn't anticipate: the Growth-paid-`Subscribe` gap.
  Every other paid conversion in the codebase (KatisoBiz, Standing 365)
  was built with the server-side pair; this one specific, highest-value
  case was not. Worth fixing before any campaign spend leans on Growth
  signups as the goal.

---

## Numbered steps for you

1. **Check Search Console directly**: open search.google.com/search-console
   and confirm both `growth.digitalflyersa.co.za` and `katisobiz.co.za`
   are listed as verified properties. If either is missing, add it as a
   URL-prefix property, choose the HTML file method, and the file needed
   is already live on both domains (`/google9c3dc8a0081bd6c9.html`), so
   verification should complete immediately.
2. **Nothing else needs you for Part 1.** Part 2 (the actual fixes,
   starting with the Growth `Subscribe` gap and the cross-domain linker
   config) needs your go-ahead before I touch anything, per the handoff's
   own rule.
