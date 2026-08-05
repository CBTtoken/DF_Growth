# Sprint 2026-08-05: state of play

Written by the session of 5 August 2026 per the handoff's session-continuity
rule. Branch: `sprint-2026-08-05` (PR #1 open against main).

## Item 1: house style workflow — COMPLETE

- The failing line was ONE em dash (CI's "two annotations" = the one failure
  plus GitHub's process-exit annotation), in
  `src/components/dashboard/OnlinePaymentsSection.tsx:37`, the online
  payments intro: "arrange payment with each buyer yourself — that works".
  Human-written dashboard copy, not generated content. Now a full stop.
- The check already scans only `src/` and `scripts/` (our own code; comments
  and console/Sentry calls exempt), so no scope narrowing was needed.
- The workflow BLOCKS NOTHING: main has no branch protection and no
  rulesets, and Vercel deploys off the push regardless. It only reports and
  emails. The fix is on the sprint branch where CI passes (verified,
  conclusion success); main goes green when the branch merges.

## UPDATE, later same session: both gates approved and executed

Dewald approved the seed and the merge in chat. PR #1 is merged (main
94c58c8), the page is LIVE and verified at
https://growth.digitalflyersa.co.za/sip-happens: renders "No bar? No
problem.", 11 photos, logo, marquee template, in the sitemap, title
"SIP Happens Bespoke Mobile Bar | Mobile bar hire in Pretoria",
description carries trade + areas (via the enriched tagline; a global
description-priority swap was considered and rejected: 37 of 41 active
members would have changed), LocalBusiness schema and tappable
WhatsApp confirmed live. House style emails stop from the next push.
Seed script deleted after use. Remaining on item 2: Dewald's personal
steps only (free month grant in admin, final look, handover email to
Solette). Item 3's build remains the open work.

## Item 2: SIP Happens — CODE COMPLETE, AWAITING DEWALD'S GATES

Done:
- Full crawl of https://sip-happens-web-magic.lovable.app/ (4 pages). All
  content and 16 images saved to
  `C:\Users\dewal\OneDrive\Business 2026\DigitalFlyer\Clients\SIP Happens\site-assets\`.
- New reusable theme **Marquee** (`marquee`, hero `showreel`) registered in
  `src/lib/templates/registry.ts` + `anchors.ts` (new `invitation` card
  recipe, new `lookbook` gallery layout in `PhotoGallerySection.tsx`, new
  `src/components/landing/heroes/ShowreelHero.tsx`), wired into
  `ClientLandingPageView.tsx` and `/preview/[templateId]`. Verified at
  375px in the dev server: no horizontal scroll, one primary action,
  serif applied, hero photos render. `docs/Theme_Library.md` updated with
  the archetype notes.
- Seed script ready (NOT run, writes production DB):
  `<scratchpad>/seed-sip-happens.mjs`. Creates growth_clients (slug
  `sip-happens`, template marquee, gold/black palette), landing page from
  her own words, uploads logo + 11 real event photos (resized), sets the
  white-bar photo as hero. Concept boards deliberately excluded from the
  gallery (they are styling references, not events).

Blocked on Dewald (see the numbered block in the chat report):
1. Approve the production seed (deny-list item).
2. Approve merging `sprint-2026-08-05` to main (deny-list item) — also
   stops the house-style failure emails.
3. His own admin steps: grant her free month, final look, send handover.

After approval, next session: run seed, verify live at
growth.digitalflyersa.co.za/sip-happens with rendered strings, Lighthouse
phone check, sitemap/SEO verification, write docs/Report_SIPHappens.md,
draft her handover email (Good day Solette, no em dashes).

Claims found in her material to confirm with her/Dewald before they stay
on the page: "in partnership with a professional décor company" (kept, her
own published claim), her "20 years" experience figure (left OUT of the
story, add back only if confirmed), "reply within 24 hours" (left out).

## Item 3: page poster — TWO QUESTIONS ANSWERED, BUILD NOT STARTED

Per the sprint's own fallback ("two honest answers beat a half-built
scheduler"):

1. **No App Review or Business Verification needed for our case.** Meta's
   access-levels doc: Standard Access permissions work for users who hold
   a role on the app. Dewald is admin of both the app and the DigitalFlyer
   SA page, so `pages_manage_posts` + `pages_read_engagement` under
   Standard Access with a Page token from his long-lived user token is
   sufficient. Advanced Access (review + verification) only becomes
   necessary for the future member-dashboard tool acting on OTHER
   people's pages.
2. **No, an API-published post cannot tag or mention another page.** Meta
   removed @mention capability from API-published posts years ago
   (notification spam). Design around it: put the member's page URL in
   the post text or link attachment, and lean on the member sharing the
   post themselves, which is already the build's core mechanism.

The Meta connection + scheduler build has not started. Next session picks
up `Facebook/HANDOFF-digitalflyer-page-poster.md` from scratch with these
answers in hand.

## Discovered, contradicting nothing but worth knowing

- The Growth Build Kit's Part A gates (verified facts, payments, delivery,
  price/scope) were satisfied from the sprint handoff itself: her material
  is the crawl, no shop, free month then decide. Payments/delivery not
  applicable, no shop on her site.
- Packages records cannot carry an image, which is what her four bar
  concepts really want. Noted in Theme_Library as the section library gap.

## Resume prompt for a fresh session

Paste: "Read SPRINT-STATE-2026-08-05.md at the repo root and continue the
sprint from where it stopped. Items 1 is done, item 2 is code-complete
awaiting my approvals (I approve the seed and the merge), item 3 needs the
scheduler built per Facebook/HANDOFF-digitalflyer-page-poster.md with the
two Meta answers already in the state file."
