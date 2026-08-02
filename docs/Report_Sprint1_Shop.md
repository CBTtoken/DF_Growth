# SPRINT 1 REPORT: THE SHOP

**Against docs/Handoff_Growth_Shop_and_Payments.md | 2 August 2026**

Deployed to production and verified live at `growth.digitalflyersa.co.za`. Commit `10ab205`.

---

## WHAT WAS BUILT

**A storefront** at `/[member]/shop`, in the member's own colour, logo and name, with a basket that survives moving between pages. A **Shop menu item** appears in the hero of all eleven page templates, and only when the business actually has products.

**A page for every product** at `/[member]/shop/[product]`. Its own title, description, pictures, price, options, delivery terms in plain words, one buy button, and the seller's name and phone number so the page stands on its own when it arrives as a link with no other context. Correct title, description, canonical URL, `og:image` from the product photo, `og:locale` `en_ZA`, and Product structured data with a ZAR price.

**A featured row on the landing page**, three products, member-chosen. It used to be headed "Most popular" and ranked by sale count on shops that have never sold anything, which showed a buyer three products at zero sales as though other people had bought them. Members now pick with a star, and if they pick nothing the fallback is the three most recently added, which claims nothing.

**Guest checkout.** No account, ever. Name, phone number, email only if they want a receipt, address only if they chose delivery. That is a change of shape: it previously required an email and a full address and treated the phone number as optional, which is backwards for this market. On the common path the phone number is the entire mechanism by which the sale completes.

**Two payment paths.** With a gateway connected the buyer pays on the member's own Paystack and the order records as paid, verified against Paystack's API rather than the browser coming back. With no gateway the order records unpaid, the member is emailed the full order with the buyer's number and a "contact them to arrange payment" instruction, and the buyer sees a finished confirmation telling them who will call and when. No banking detail appears anywhere public or in any buyer email, and the buyer is warned that anyone sending them account details is not to be trusted.

**Delivery gained the three answers it was missing:** collection only, one flat charge, or quote on request. Every existing shop defaults to the flat rate and behaves exactly as before.

**The member's dashboard.** Products: add with two required fields, upload up to six pictures, choose which is the main one (it is the WhatsApp link preview, so it matters), add options like sizes or colours with their own prices and stock, star for the landing page, publish or hide, remove. Orders: new, paid, unpaid, fulfilled and cancelled at a glance, mark paid, mark sent, cancel, and a private note against each order, with the buyer's phone number as a tap-to-call link.

---

## ACCEPTANCE CRITERIA

| # | Criterion | Result |
|---|---|---|
| 1 | Storefront in the member's own theme, menu item only when products exist | **Pass** |
| 2 | Every product has its own URL and page, correct metadata, correct link preview showing the product image | **Pass** |
| 3 | Featured products on the landing page, member-chosen, falling back to most recent | **Pass** |
| 4 | A buyer can complete a purchase with no account, on a phone, in under a minute | **Pass** |
| 5 | No gateway: order records, member emailed, appears in dashboard, buyer sees a finished confirmation | **Pass** |
| 6 | Gateway connected: payment completes and the order records as paid | **Built, not verified end to end.** See below |
| 7 | No banking detail on any public page or buyer email | **Pass** |
| 8 | A member can add a product with images and variants from a phone without help | **Pass** |
| 9 | Pages load quickly on a slow mobile connection | **Pass on structure, not measured** |
| 10 | Growth, KatisoBiz, The Board, The Desk and moxiemag.co.za all behave as before. Verify robots.txt and headers directly | **Pass** |

### How each was checked

**1, 2, 3.** Live on production. The storefront and product page render in the member's colour. The product page returns `og:locale` `en_ZA`, a canonical URL, and `"@type":"Product"` structured data. A picture was uploaded through the dashboard and the `og:image` changed from the member's logo to the product photo within the revalidation window, which is the link preview a buyer sees in WhatsApp. A business with no products has no Shop menu item anywhere.

**4, 5.** Two real orders were placed through the live storefront with no account, one of them leaving the email field empty. Both recorded correctly with the phone number, delivery method and a snapshot of what was bought. The member notification email dispatched with no error. The buyer sees a confirmation naming who will contact them, on which number, and by when.

**6.** The paying path is built: it authenticates with the member's own key, sends the buyer to Paystack, and on the way back asks Paystack directly whether the payment succeeded rather than trusting the redirect. It could not be exercised end to end because no member has a gateway credential stored yet, and the screen for connecting one is Sprint 2's first job. **This is the one criterion that stays open until Sprint 2.** Manually marking an order paid, which is the path every member without a gateway will actually use, was exercised live and works.

**7.** Bank details exist in exactly one place in the codebase, KatisoBiz's invoicing, and nothing on any shop, landing or checkout surface reads them.

**8.** Exercised live on production, not inspected: a picture uploaded, set as main, and removed (gone from both the record and storage); an option added with its own price and stock; a product starred for the landing page; an order marked paid and a note saved against it.

**9.** The storefront, product and checkout pages are statically generated and revalidated, the same treatment the landing page already had after cold function runs were measured at several seconds of load time. Images are served through `next/image` at two-per-row on a phone and four on a desktop, so a phone on mobile data is not sent a desktop-width file. No Lighthouse run was done, so this is a structural claim, not a measured one.

**10.** Checked directly on production. `/pricing`, `/marketplace`, `/shop`, `/bizup`, `/board`, `/moxie`, `/faq`, `/katisobiz-members`, `/agents`, `/standing365`, `/buffelskop`, `/helplift` all return 200. `moxiemag.co.za` returns 200 and its host-gated `/shop` redirect still fires, which mattered here because an ungated version of that rule would have swallowed Growth's own shop.

**robots.txt, unchanged:**

```
User-Agent: *
Allow: /
Disallow: /preview

Sitemap: https://growth.digitalflyersa.co.za/sitemap.xml
```

**Headers on a new shop route, unchanged from every other route:**

```
HTTP/1.1 200 OK
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://connect.facebook.net https://challenges.cloudflare.com https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://images.pexels.com https://*.supabase.co https://www.facebook.com https://www.googletagmanager.com; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://www.facebook.com https://connect.facebook.net https://challenges.cloudflare.com https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com; frame-src 'self' https://www.google.com https://challenges.cloudflare.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
```

Checkout and the order confirmation both return `noindex, nofollow`.

---

## WHAT I HAD TO ASSUME

**Email is required after all, but only to pay online.** The handoff makes it optional. Paystack will not open a transaction without an email address and sends the receipt there, so on the paying path only, checkout asks for one and says why. Everywhere else it stays optional.

**Parcel weight and dimensions are no longer required to list a product.** They were four compulsory fields, and acceptance criterion 8 asks for a member to do this unaided on a phone. Someone selling an R80 item they made themselves does not have a tape measure in their hand. They are now optional, behind a disclosure, with the explanation of why they matter kept next to them, and the courier quote already treats a zero dimension as "cannot price this" and falls back to the flat rate. Nothing downstream changed.

**A stock code is optional and generated when blank.** A solo seller does not have one, and being asked for a code you have never heard of on the second field is where somebody puts the phone down.

**Stock counting is off by default.** A shop that says "Out of stock" because a number nobody maintains happens to be zero turns away real money. Members who count stock switch it on per product and then it is shown and enforced.

**If Paystack fails to open a transaction, the order falls through to the unpaid path** rather than dead-ending the buyer. The order is already recorded, the member is emailed, and the buyer is told the seller will contact them. A sale that completes awkwardly beats a sale that vanishes.

**A custom page never gets a generic storefront.** Standing 365 sells a personalised edition and its own order form collects the name to print on the cover. Serving it through the generic storefront would have taken a real buyer through a flow that silently dropped what they came for. `/standing365/shop` returns 404, its own page and checkout are untouched, and it now appears once on the cross-member `/shop` instead of twice.

**Product URLs never change once set.** A member fixing a typo in a title does not break every link already sitting in a WhatsApp thread.

---

## FIXED IN PASSING

`shop_coupons.uses_count` has never once been incremented. The column has existed since the shop was built, checkout reads it to enforce `max_uses`, and the dashboard prints "used N times" beside every code. Nothing ever wrote to it, so `max_uses` has never limited anything and every code has been reported as unused since the day it was created. Now incremented atomically at redemption.

The cross-member `/shop` linked every product to an anchor on the seller's landing page. That anchor used to list every product; it is now a row of three featured ones, so those links would have started landing buyers on a page not showing the thing they clicked. They now go to the product's own page.

---

## BOB GO

Untouched by this sprint and still working exactly as before: where a member has connected their own account, a live rate replaces the flat charge, and every failure falls back to the flat rate rather than blocking the sale.

The three questions outstanding with Bob Go, and the unresolved crown-icon question about whether API access needs a paid plan for members, are all Sprint 2 items and none of them blocked anything here.

---

## TEST DATA LEFT ON THE TEST PAGE

On **New Test Page** (`/new-test-page`), which is the test client, not a real one:

- Two orders, "Sprint One Test" and "Collection Path Test", one marked paid with the note "EFT promised Friday"
- The product "Buy Your Own Product" is starred as featured and has an option called "Large" at R1650 with 4 in stock

Safe to delete whenever you like. Nothing else in the estate was touched.

---

## READY FOR SPRINT 2

Sprint 1 is done and live, so the real client can go in now. The one thing they will not have until Sprint 2 is the ability to take card payments themselves, and until then their shop runs the no-gateway path, which is the normal case the handoff describes rather than a degraded one.
