# BUILD REPORT: DAVEMARLY

**Against the Growth Build Kit v1 | 7 August 2026**

Live at `growth.digitalflyersa.co.za/davemarly`. David signed himself up
through the real web flow on 6 August (davidmolotsi04@gmail.com, Foundation,
pending intake); this build finished the account done-for-you style. Second
build from the Ficksburg informal market after Molotsi Plumbers, and the
platform's first food business.

---

## WHAT WAS BUILT

**A new theme, "Kasi Kitchen" (`kasi-kitchen`).** The platform's first food
archetype, built for the informal market where orders start on WhatsApp and
the member's own plate photos are the whole pitch. The first done-for-you
hero where the photo carries the frame on the phone too: his double
cheeseburger full-bleed under a char-dark scrim, WhatsApp-first in WhatsApp
green, calling second, "See the menu" third. The menu is a dark chalkboard
band with a fixed flame strip (this theme's material, the way Copperline
fixes copper); the gallery is a two-row "kitchen pass" rail so his fifteen
plate photos read rich rather than long. Cards are takeaway till slips with
a perforated bottom edge; section tags are dashed order tickets. Registered,
named, in the picker, available to every future member. Full entry in
`docs/Theme_Library.md`.

**His page**, written from his own words ("I'm selling fast food and
micro-bakery cakes, bread and many more") and what his photos actually
show. Headline: "Kotas. Grills. Fresh bakes." Menu lines only name what the
photos evidence or he said: kotas, toasted sandwiches, burgers, quesadilla
wraps, grill platters with ribs, wors and wings, fried chicken, loaded
chips, bread, biscuits and cakes. No prices appear because none were
supplied. Colours chosen for him (no brand supplied): flame `#d63d12` on
char `#211a14`.

**His photos**: all fifteen, resized to 1600px at quality 82 with EXIF
rotation baked in (the Molotsi sideways-photo lesson), uploaded to his own
dashboard-managed gallery in a deliberately mixed order, the biscuit bucket
second so "micro bakery" is visible immediately.

**His account**: status active, one month admin comp to **7 September
2026** with the note on the record (confirmed by Dewald 7 Aug 2026, after
the build initially assumed the Molotsi three-month shape). David manages
his own billing from the dashboard and can renew when the free month ends.
The Foundation to Growth Engine plan change during the build was Dewald's
own admin action. Nothing routes through Paystack for the free month.
**No email was sent to David**; Dewald is speaking with him directly.

**Contact**: hero pushes straight to WhatsApp 079 330 8877 and call
081 579 5185, both tappable, repeated with email in the hero base strip
(separate cells because his call and WhatsApp numbers differ). The lead
form emails davidmolotsi04@gmail.com.

## ACCEPTANCE CRITERIA

| # | Criterion | Result |
|---|---|---|
| 1 | Visually distinct, not a block template | **Pass**: own hero, four structural signatures (chalkboard menu, kitchen-pass rail, till-slip cards, order-ticket tags), flame strip material |
| 2 | Theme registered, reusable, in the picker | **Pass** |
| 3 | Member edits everything from his normal dashboard | **Pass by construction**: every word, photo and colour lives in ordinary records |
| 4 | No fact absent from the brief; no testimonials/ratings | **Pass**: menu lines trace to his words or his own photos; no prices, no claims, no invented facts |
| 5 | Fast on a phone on a slow connection | **Pass on structure**: server-rendered, CSS-only flame and chalkboard, photos capped at 1600px/q82 (80 to 320KB each), gallery images lazy |
| 6 | Contact correct, tappable, visible without scrolling | **Pass, verified at 375px**: WhatsApp, call and menu buttons all inside the first screen; wa.me/27793308877, tel:0815795185 |
| 7 | Areas served in plain text | **Pass**: Meqheleng, Ficksburg in the hero subheadline, ticket, about and address |
| 8 | Metadata and link preview correct | **Pass**: title "Davemarly \| Kasi food and bakery in Ficksburg", en_ZA locale, canonical /davemarly |
| 9 | Registered name/number only if supplied | **Pass**: none supplied, none claimed |
| 10 | Shop correct or cleanly disabled | **Pass**: no shop by agreement, nothing renders |
| 11 | No payment through any account but the client's own | **Pass**: no payment flows at all |
| 12 | Everything else behaves as before | **Pass**: additive changes only; existing themes untouched (new layout branches are behind the new anchor ids) |

## QUESTIONS FOR THE CLIENT

1. **Prices.** A menu board appears in one photo's background but is not
   reliably readable. With his real price list, the menu can carry prices
   as proper menu rows (the layout is already built for it).
2. **The story behind the name Davemarly**, and who is cooking — a photo
   of David (or the team) would make the "Who is cooking" section his.
3. **Trading hours**, and whether he delivers or is collection only.
   Nothing is claimed either way today.
4. **A logo**, if one exists. The page works without one; the name
   renders as text in the hero.
5. **Facebook or WhatsApp Business catalogue links**, if he has them.

## ACTIONS FOR THE CLIENT

1. Share the link: `growth.digitalflyersa.co.za/davemarly`. Ready for his
   WhatsApp status today.
2. His existing email and password open the Growth dashboard at the same
   site to change any word, photo or price himself.

## WHAT WAS ASSUMED

- **Comp terms**: three months free mirroring Molotsi Plumbers, because
  the arrangement was not stated. Flagged above for Dewald to confirm;
  the note is on the record in `admin_comp_note`.
- **Trading name**: "Davemarly", with "Kasi food & micro bakery" as the
  tagline, splitting the supplied "Davemarly - Kasi food & micro bakery".
- **Colours**: chosen by this build (flame on char) since none were
  supplied; sampled to suit the food photography, not a brand.
- **Menu wording**: every line traces to a photo or his message. "Kota"
  used for the stacked bread plates his photos show.
- **Hero photo**: the double cheeseburger, chosen because it reads
  instantly at full-bleed under a dark scrim.

## THE THEME, FOR THE LIBRARY

**Kasi Kitchen (`kasi-kitchen`)**, for the food businesses of the informal
market. What it does that no other theme does: the member's own food photo
full-bleed in the hero on the phone, the menu as the page's single dark
chalkboard band under a fixed flame strip, a two-row kitchen-pass photo
rail, till-slip cards and order-ticket tags, and separate Call and WhatsApp
base-strip cells for a business running two numbers. Copperline is the
neighbourhood trade you WhatsApp; Kasi Kitchen is the neighbourhood kitchen
you WhatsApp when you are hungry. Full entry in `docs/Theme_Library.md`.
