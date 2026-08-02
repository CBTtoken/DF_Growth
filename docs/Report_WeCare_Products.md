# BUILD REPORT: WECARE PRODUCTS

**Against the Growth Build Kit v1 | 2 August 2026**

Live at `growth.digitalflyersa.co.za/wecare-products`. Her page returned a 404 before this build: she has been a paying member since 1 August with no page, because no landing page record was ever created for her.

---

## WHAT WAS BUILT

**A new theme, "Two Sides of the Business" (`dual-offer`).** Elize organises business networking events and separately sells wellness products. Every hero in the library ends in one call to action, which would have lost whichever half of her business a visitor came for. This one ends in two doors of equal weight, and the shop door only appears when the member actually has products. Registered, named and available to any future member. See `docs/Theme_Library.md`.

**Her page**, written from her own onboarding answers and nothing else. About covers the products, the story section covers the events, and areas served, delivery terms and a tappable phone number are all on it.

**Her shop**, with six products: the NXi collagen shake at R599, and five moringa products listed but not yet orderable because there are no prices for them.

---

## ACCEPTANCE CRITERIA

| # | Criterion | Result |
|---|---|---|
| 1 | Visually distinct, does not read as a block template | **Pass** |
| 2 | Theme registered as reusable, named, available to future members | **Pass** |
| 3 | Member can edit every word, image, price and product from her own dashboard | **Pass**, verified logged in as her |
| 4 | No content contains a fact absent from Part A; no testimonial, review or rating anywhere | **Pass** |
| 5 | Loads quickly on a phone on a slow connection | **Pass on structure, not measured** |
| 6 | Contact details correct, visible without scrolling, work when tapped | **Pass**, with one deliberate deviation, below |
| 7 | Areas served in plain text | **Pass** |
| 8 | Page metadata and link preview correct | **Pass** |
| 9 | Registered name and number only if supplied | **Pass**, none supplied so none shown |
| 10 | Shop: products correct, prices correct, checkout works or is cleanly disabled with a guide | **Partial**, see actions |
| 11 | No payment flows through any account other than her own | **Pass** |
| 12 | Growth, KatisoBiz, The Board, The Desk and moxiemag all behave as before; robots.txt and headers verified | **Pass** |

Checked live: `tel:0762721334` and `https://wa.me/27762721334` both render and convert correctly, `og:locale` is `en_ZA`, no product shows R0.00 anywhere, and all six products appear and are editable in her own dashboard. `/pricing`, `/marketplace`, `/shop`, `/bizup`, `/board`, `/moxie`, `/faq`, `/standing365` all still return 200, robots.txt is unchanged, and the security headers on her page are identical to every other route.

---

## THE ONE DELIBERATE DEVIATION

Growth deliberately hides every phone number until a visitor submits the lead form. The Build Kit asks for a contact action visible without scrolling that works when tapped. Both are defensible and they contradict each other.

Resolved in the narrowest possible place: the number appears in this one theme's hero. No existing member is on this template, so nothing changed for anybody else. **If you want the Build Kit's rule to apply to all done-for-you builds, say so and it can move up a level.**

---

## QUESTIONS FOR THE CLIENT

1. **Prices.** Her price list, `PARF PRYSLYS`, is the right document with the price column left blank. It prices by format, not by fragrance, so this is about **13 numbers**, not 130: perfume 50ml, roll-on 80ml, lotion 200ml, shower gel 250ml, bath salt 625g, aftershave balm, tissue oil, heel balm, and the five turmeric items. Plus a price each for the moringa concentrate, cream, gummies, pet range and Revive Your Roots.
2. **Product photos.** Everything in her folder is supplier marketing with text across it. Product cards currently show a plain tile. Even phone photos on a plain background would transform the shop.
3. **Her town.** She gave Gauteng and "Online" but no town, and a town is what local search matches on.
4. **Her own logo**, if she has one.
5. **The events.** The page says she runs them but can say nothing else, because nothing was supplied. Even "monthly, in Centurion" would make that half of the page real.
6. **CIPC registration number**, if she is registered. Nothing is shown without it.

---

## ACTIONS FOR THE CLIENT

1. **Get her own Paystack account** so buyers can pay online. Until then her shop takes orders and she phones each buyer to arrange payment, which works and is the normal path, but it is slower. Nothing routes through a DigitalFlyer account and nothing will.
2. **Decide about the perfume names.** All roughly 130 are "inspired by" listings using designer trademarks: Chanel No. 5, Sauvage, Bleu de Chanel, Lady Million, Tom Ford. Selling dupes is legal. Publishing 130 indexed product pages titled with someone else's trademark, with structured data attached, is the exposed way to do it. Recommended: sell them under Bella Vita's own naming with scent descriptions. **The perfumes are not in the shop yet, pending this.**
3. **The health claims are not going on the page, and she should know why.** Her material claims these products treat cancer, diabetes, epilepsy, hypertension, asthma and shingles, that chemotherapy patients avoid nausea, and that skin cancer spots disappear within weeks. In South Africa those are medicine claims under the Medicines and Related Substances Act and the Foodstuffs, Cosmetics and Disinfectants Act. Her own supplier's label carries "THIS PRODUCT IS NOT MEDICINE" while listing "Cancer Support" two lines above it, so the supplier knows. A disclaimer does not cure a claim. The risk sits with her, and this protects her.

---

## WHAT WAS ASSUMED

- **Her phone number.** She entered `076271334` at onboarding, which is nine digits and would not dial. Her own advertising says `076 272 1334`, so that is what the page uses. **Worth confirming.**
- **Delivery is quoted per order.** Her collagen slide prices the product "excl. Courier", so courier quoted separately is her own stated arrangement rather than a guess.
- **R599 is the collagen, not the moringa.** It comes from her KOLLAGEEN slide and matches the NXi label exactly, 975g and 30 servings at two scoops a day. It is the only price in anything she sent.
- **Colours.** She set none, so a deep sage and warm cream were chosen to suit a moringa and wellness range. Part D leaves visual direction to the build, and she can change them.
- **Her spelling was corrected**, meaning untouched. Her onboarding text read "Business Soial Neworking" and "Morina", which were appearing on the live page.

---

## CONTRADICTORY OR MISSING IN PART A

- **No business name in the folder.** Only her account said "WeCare Products". Bella Vita, Morlife and NXi are her suppliers, not her.
- **Two fragrance lists that do not match.** The range sheet and `female.jpg` contain different names. Nobody has said which is current, so neither was used.
- **No prices, on a document titled "price list".**
- **No verified facts at all.** No years trading, no qualifications, no memberships, no guarantees. Nothing of that kind is on the page.
