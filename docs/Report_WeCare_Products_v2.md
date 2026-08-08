# BUILD REPORT: WECARE PRODUCTS, SECOND PASS

**8 August 2026 | Branch `wecare-shop-and-page`**

Supersedes nothing in `docs/Report_WeCare_Products.md`; that report stands as
the record of the first build. This one covers what changed when Elize sent
the files that first report asked for.

Live at `growth.digitalflyersa.co.za/wecare-products` and
`/wecare-products/shop`.

---

## WHAT SHE SENT, AND WHAT IT UNLOCKED

Six nested folders, `Images` through `Images6`, largely duplicates of each
other. Three files in them did the work:

| File | What it gave us |
|---|---|
| `PERFUMEProduct Details for Elize Online shop.xlsx` | The Bella Vita price list, filled in. Thirteen prices by format, and the full fragrance ranges. |
| `MoreLife MoringaPrice List01...docx` | Seven moringa prices, suggested retail, dated 1 May 2026. |
| `COLLAGEN PRICE.docx` | R599 confirmed, and the three flavours. |

Plus, and this is the bigger unlock, **professional supplier product
photography on white** for eighteen of the twenty-two products. Not posters
this time: actual studio shots of the bottle, the jar, the bar.

The first report asked six questions. Her files answered three of them
(prices, photographs, and enough about the events to write the section
properly). Three are still open, listed at the bottom.

---

## THE SHOP

**Six products became twenty-two.** All priced, all orderable except one.

| Range | Products | Prices |
|---|---|---|
| Wellness and supplements | 8 | R250 to R599 |
| Fragrance | 6 | R40 to R180 |
| Skincare and body | 8 | R60 to R180 |

**The perfumes are in, and this is how.** Roughly 130 "inspired by" listings
became **two product pages**, not 130: `Bella Vita Perfume for Her, 50ml`
(51 fragrances) and `...for Him, 50ml` (49). The fragrance is a variant
chosen on the page, not a page of its own.

That was the recommendation in the first report and this is it built. What
gets indexed, titled, and given structured data is the Bella Vita product.
The designer names appear only as options inside a picker, which is what
the buyer needs to choose at all, and every one of those pages carries this
line above the list:

> Bella Vita fragrances are interpretations, made and bottled in South Africa
> under the Bella Vita name. The names below describe the scent each one is
> inspired by. They are not the original designer fragrances and are not sold
> as them.

Lotion, roll-on, shower gel and bath salt carry only the Top 10 ranges,
because that is what her own price list says is made up in those formats.

**The health claims stayed out**, on the same reasoning as the first build,
and her own labels keep proving the point: the MoreLife label lists "Cancer
Support" and "Epilepsy Support" two lines above "THIS PRODUCT IS NOT
MEDICINE". Descriptions are built from size, ingredients, directions,
storage and warnings, all off the labels.

**One new product, handled carefully.** `Just Heal It Organic Wound Spray
100ml` was in her folder and is not in any price list. Its label claims
diabetic foot ulcers, radiation burns, pressure ulcers and skin grafts. It is
listed at "price on request" with the description cut back to the
manufacturer's own narrow intended-use statement, cleaning wounds and
moistening dressings. **This one is worth a conversation with her before it
goes any further.** Wound care sits closer to a medical device than a
supplement.

---

## WHAT WAS BUILT INTO THE PLATFORM, NOT JUST HER SHOP

Two things broke at twenty-two products, and both were fixed generally.

**Collections.** `shop_products.collection` and `collection_position`,
migration `20260811100000`. The storefront groups by it with counted jump
links at the top. **A shop with one collection or none renders exactly as it
did**, so nothing changed for any existing shop. Members set it themselves
from the product form, with their existing group names offered back as
suggestions so "Moringa range" and "Moringa Range" cannot become two
sections.

**A searchable option picker.** `src/components/shop/OptionPicker.tsx`.
Above twelve options the pills become a searchable list, grouped by the
first descriptor key when that key varies (so a roll-on reads as HER and HIM,
ten each). Below twelve, the pills are unchanged. The list is capped at
320px and scrolls inside itself, so the price and the buy button stay on
screen.

**Cards say what the choice is**: "51 fragrances to choose from". Without it
a tile hiding the whole range and a tile selling one jar look identical.

---

## HER PAGE

- **Eight photographs, all hers.** Six real event photos added to the two
  she had: the long table under the palms, soup and bread and about a dozen
  people; the indoor table with name badges; the garden with the produce
  stall; a talk being filmed. These are what make the events half real.
- **The About was rewritten** around her own stated goal, taken off her BSN
  material: "to foster meaningful connections, share experiences and build
  lasting relationships within the business community."
- **The story section no longer repeats the About.** It answers the question
  the About does not: what actually happens if you come to one. About twenty
  people, a name badge, you get put next to somebody you have not met, around
  R100 a head to cover the food.
- **The shop door now says "Browse 22 products"** and means it.
- Her three August events are still on the page and still in the future.

---

## VERIFIED

Walked in the browser at 1280px and at 375px, on the live database.

- Storefront: three headings, counted jump links, 22 products, no product at
  R0.00, no horizontal scroll at 375px.
- `bella-vita-perfume-for-her`: 51 options, search filters them, "Chosen:"
  line updates, selection carries into the basket as
  "Her, Chanel No. 5" and into checkout at R180.00.
- `bella-vita-roll-on-deodorant`: HER and HIM headings, search filters across
  both groups.
- Her landing page: 8 gallery images, all loading, no broken images, no
  console errors.
- **Her own dashboard, signed in as her**: all 22 products listed, the new
  "Group it under" field prefilled and offering her three collection names.
  Nothing was changed through the UI.
- Sitemap: 24 WeCare URLs, page + shop + all 22 products.
- `npx tsc --noEmit` clean. `npm run build` succeeds. `npm run lint` reports
  no new problems; the 8 pre-existing errors are in files this sprint did not
  touch.

---

## STILL OPEN, FOR HER

1. **Four products have no photograph**: the gummies, the pet concentrate,
   Revive Your Roots and the wound spray. Everything she sent for those four
   is a poster with wording printed across it, which is not a product picture.
   SPLITEQ will have the real ones. The cards fall back to a designed
   monogram tile rather than looking broken, but a photograph sells.
2. **Her town.** Still only "Gauteng". A town is what local search matches on
   and it is one field.
3. **Revive Your Roots**: listed as a spray and a serum at R120 each, which
   is what her price list says, but the price list gives no description of
   what it is for beyond the name. Worth a sentence from her.
4. **Her own Paystack account.** Unchanged from the first report and now
   worth more: she has 21 orderable products instead of one. Every order
   still comes through as a phone call to arrange payment.
5. **The wound spray**, above.

## STILL OPEN, FOR US

- **`price_pending` products and the courier.** All 22 products have zero
  weight and zero dimensions. Nothing breaks today because her delivery is
  "quoted per order", but the moment she connects Bob Go every parcel falls
  back to flat delivery. The dashboard already warns her; worth mentioning
  directly.
- **The collection field is free text with no reordering UI.** She can name
  a group but cannot drag it above another; `collection_position` is set
  correctly for her but is not yet editable. Fine for one member, a gap the
  moment a second member wants it.
