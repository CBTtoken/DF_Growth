# BUILD REPORT: JETTING WORX

**Against the Growth Build Kit v1 | 3 August 2026**

Live at `growth.digitalflyersa.co.za/jetting-worx`. Tony signed up on 2 August,
stopped at the very first onboarding step, and had an account with nothing in
it. This build finished the job on his existing account. No duplicate was
created and his KatisoBiz account was not touched.

---

## WHAT WAS BUILT

**A new theme, "Fieldwork" (`fieldwork`).** Built for a trade that works at
the customer's premises on an urgent, physical problem, and the visitor is
usually holding a phone. The page reads like a serious contractor's job
sheet, not a brochure: a blunt uppercase headline, three ways to start the
job in the first screen (quote form, tap-to-call, WhatsApp), then the work
itself as a numbered ledger before any "about us". Registered, named and
available to any future member. See `docs/Theme_Library.md`.

Taking the WeCare lesson seriously, the distinctiveness runs below the hero:
five sections have their own structure under this theme, not just new fonts
and cards. Services are a full-width numbered ledger, the about text is a
stamped pull-statement, how-it-works is one continuous job line, the gallery
is an evidence board with reference labels, and coverage is the page's single
dark dispatch-board band.

**His page**, written from his own website's copy and nothing else, in his
logo's own blue (sampled from the file, #1e6d9e) against deep steel.

**His account**, activated without any payment step: admin comp on the
existing record, free until **3 November 2026**, with the reason noted on the
record. The trial-reminder cron watches that date and will pause the account
automatically when it passes, so the follow-up cannot be forgotten. Nothing
routes through Paystack.

**No automated email was sent.** The system's "your page is live" mail was
deliberately skipped so you can send Tony your own note.

---

## ACCEPTANCE CRITERIA

| # | Criterion | Result |
|---|---|---|
| 1 | Visually distinct, does not read as a block template | **Pass**, five sections are structurally unique to this theme |
| 2 | Theme registered as reusable, named, available to future members | **Pass**, in the registry and the picker |
| 3 | Member can edit every word, image, price and product from his dashboard | **Pass by construction**, see note below |
| 4 | No fact absent from Part A; no testimonial, review or rating anywhere | **Pass**, no verified facts were supplied so none appear |
| 5 | Loads quickly on a phone on a slow connection | **Pass on structure**: server-rendered, CSS-only hero decoration, one hero image |
| 6 | Contact details correct, visible without scrolling, work when tapped | **Pass**, verified live: `tel:0845881391`, `wa.me/27845881391`, email link |
| 7 | Areas served in plain text | **Pass**: "across Gauteng. Based in Edenvale" in the first screen |
| 8 | Page metadata and link preview correct | **Pass**: title "Jetting Worx \| High-Pressure Cleaning in Edenvale", og:locale en_ZA, logo as preview image |
| 9 | Registered name and number only if supplied | **Pass**, none supplied so none shown |
| 10 | Shop correct or cleanly disabled | **Pass**, no shop by agreement; nothing renders |
| 11 | No payment flows through any account other than the client's own | **Pass**, no payment flows at all |
| 12 | Growth, KatisoBiz, The Board, The Desk, moxiemag behave as before | **Pass**, checked live: /pricing, /marketplace, /wecare-products all 200, WeCare page renders, katisobiz.co.za and moxiemag.co.za 200, robots.txt unchanged, security headers on his page identical to other member pages |

**On criterion 3:** every word on the page lives in the same ordinary records
every self-serve member edits (landing page copy, services list, photos,
logo, colours, template choice), so his dashboard edits all of it. It was
not verified by logging in as Tony, because that would have meant sending a
magic link to his real inbox mid-build. Worth a ten-second check from the
admin panel when you review.

---

## QUESTIONS FOR THE CLIENT

1. **Real photos of real jobs.** The four images on his current site look
   AI-generated (one shows a van with garbled lettering, another carries a
   different company's branding). Three of the less problematic ones are on
   the page now so it launches complete, but even five phone photos of
   actual jobs, the van, and the rig would noticeably strengthen it. The
   "evidence board" gallery is built for exactly that.
2. **Which email he actually reads.** The page uses info@jettingworx.co.za
   from his site's footer, but his contacts page says tony@jettingworx.co.za
   and he registered with an iCloud address. If info@ is dead, leads die
   with it. One question settles it.
3. **Years trading, certifications, anything verifiable.** Nothing was
   supplied, so nothing is claimed. Any real fact (year started, notable
   contracts, association memberships) can be added in minutes.
4. **CIPC registration number**, if the business is registered.
5. **Suburbs or radius.** "Across Gauteng" is what his site says. If he
   actually concentrates on the East Rand, saying so would sharpen local
   search.

## ACTIONS FOR THE CLIENT

1. Save the page link and share it: `growth.digitalflyersa.co.za/jetting-worx`.
2. Log in with his existing account to review and edit anything he likes;
   it is all editable from his normal dashboard.
3. His old site's header contact buttons are broken placeholders
   (info@example.com and a New York phone number). Worth either fixing or
   pointing jettingworx.co.za visitors at the new page.

## WHAT WAS ASSUMED

- **Email:** info@jettingworx.co.za, per Dewald's instruction to use the
  website's details; the site itself shows two different addresses.
- **Colours:** primary sampled from his logo file; the deep steel secondary
  and the workshop-gold accent are the build's choices, both changeable.
- **Images:** three of his site's four images were used; the solar-panel one
  was excluded because the worker's kit is branded with another company's
  name. His site's images are AI stock, flagged in questions above.
- **Copy:** rewritten from his own site's copy into the B3 rules (South
  African English, no unverifiable claims, no superlatives). His site's
  "years of expertise" and "state-of-the-art" lines were not carried over
  because nothing verifies them.

## CONTRADICTORY OR MISSING IN PART A

- Two different emails and a malformed phone number on his own contacts page
  (missing digits). The footer number matches his KatisoBiz account, so that
  is the one used.
- His KatisoBiz grant runs to **6 October 2026** while this Growth comp runs
  to **3 November 2026**. Dewald chose to leave KatisoBiz untouched; the two
  dates will diverge in October. The comp note on the Growth record mentions
  the agreement covers his KatisoBiz, so October-you has the context.

---

## THE THEME, FOR THE LIBRARY

**Fieldwork (`fieldwork`)**, for on-site trades: pressure cleaning, plumbing,
pest control, electrical, rubble, roofing. What it does that no other theme
does: structural variation in five sections below the hero (work-index
ledger, statement about, jobline, evidence board, coverage panel), and a
job-sheet hero with three contact actions plus a dispatch strip built only
from real record fields. Full entry in `docs/Theme_Library.md`.
