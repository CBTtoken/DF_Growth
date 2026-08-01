# CLAUDE CODE HANDOFF: MOXIEMAG.CO.ZA REBUILD

**Prepared for Dewald Rosema | 1 August 2026**

---

## 1. CONTEXT

Moxie is a monthly digital magazine. The current site at `moxiemag.co.za` is WordPress with Elementor and WooCommerce. It has a cart, a checkout, a my-account area, an editions archive and three products live, but no working payment gateway.

Kwaai Press, the eMag builder inside KatisoBiz, now publishes an edition to a URL. This build gives Moxie a proper home in front of it.

**Read the current site before designing anything:** `https://moxiemag.co.za/`. Match the structure and the intent. It is a reasonable site, it just needs to look better and actually work.

---

## 2. TWO PHASES, AND PHASE 2 IS GATED

**Phase 1 is buildable now.** Public site, back issues, member access codes. No money moves.

**Phase 2 is paid subscriptions and it is blocked.** Do not build any checkout, subscription or Paystack integration in this handoff.

The reason, recorded so it is not worked around: Paystack declined Smart Value Club during onboarding. The current site's own footer describes Moxie as a Smart Value Club brand. Processing subscription income for a declined merchant through Digital Flyer's Paystack account is prohibited third-party processing and risks termination of the account that Growth, KatisoBiz and every member subscription depends on.

Phase 2 unblocks when there is a written publisher agreement between Smart Value Club and Digital Flyer (Pty) Ltd, and Digital Flyer is named as publisher on the site and the masthead. That is with Dewald's attorney, not with you.

**If anything in this build starts to require a payment flow, stop and report it.**

---

## 3. WHERE IT LIVES

- Built in the existing Growth application and the existing Growth Supabase project.
- Served on `moxiemag.co.za`. Add the domain in the Vercel project and point the DNS at it. No masking, no framing, no redirect trickery. The domain is the domain.
- The WordPress site is replaced, not integrated with.

---

## 4. CRITICAL: THIS SITE MUST BE INDEXED

The Desk build added `noindex, nofollow` handling to `src/proxy.ts` and `src/app/robots.ts`, keyed on hostname. `moxiemag.co.za` must be on the public side of that branch.

The current WordPress site returns `index, follow` and has been indexed. Losing that would be a silent, expensive regression.

Verify by fetching headers directly on a preview deploy, and again after going live:

- `moxiemag.co.za` returns no `x-robots-tag: noindex` and a normal `robots.txt`
- The Growth and KatisoBiz public sites are unchanged
- `desk.katisobiz.co.za` still returns `noindex, nofollow`

---

## 5. PHASE 1: WHAT TO BUILD

### 5.1 The public page

One page, phone first. Sections, in this order:

- Hero: current edition cover, headline, short description, one primary action
- What Moxie is: the topic strip already on the site (science, nature, history, travel, food, puzzles, arts)
- Latest edition, with cover and description
- Previous editions, as clickable cover thumbnails
- Smart Value Club members: how to get access with a code
- Subscribe: **Phase 1 shows the standalone price and a "notify me" email capture, not a checkout**

**Copy rules, from house style:** plain language, no em dashes, South African English, Rand, no corporate jargon, no motivational-poster copy.

**Remove the two testimonials.** The current site carries quotes attributed to "SARAH. M" and "JOHAN. K". No testimonials or social proof go on the new site until real, attributable ones exist. This is not negotiable.

### 5.2 Editions and access

Store each edition with: number, month, year, cover image, description, the Kwaai Press URL, an optional PDF, price, and an access mode of `free`, `code` or `paid`.

- Free editions open directly.
- Code editions prompt for an access code before opening.
- Paid editions are Phase 2 and should be modelled but not sellable.

Seed the two supplied back issues, June and July, with their PDFs available to download.

**Ask Dewald to confirm the edition numbering before seeding.** The current site sells July as "Issue 8". The August production brief calls August "Edition 03", which makes June "Edition 01". These contradict each other and the archive will carry whichever is chosen permanently.

### 5.3 Access codes for Smart Value Club members

- Codes are generated per edition, not one permanent code per member.
- A publisher screen generates a batch of codes for an edition, exports them as CSV, and shows how many have been redeemed.
- Redeeming a code sets a cookie or session so the reader is not asked again for that edition on that device.
- A code can be marked used or revoked.

Rotating per edition limits the damage when a code is shared, which it will be. Do not attempt to prevent sharing beyond this. It cannot be prevented and should not be described as protection.

### 5.4 Metadata, because the current site's is wrong

The live site's title and description describe a recipe and wellness publication: "Discover recipes, healthy cooking inspiration, wellness tips". That is what currently appears in Google results and WhatsApp link previews.

Set correct metadata: title, description, `og:image` using the current edition cover, `og:locale` `en_ZA`, and a canonical URL.

### 5.5 Legal pages

Privacy policy and terms of service pages, with placeholder content clearly marked as awaiting Dewald's attorney. Do not write legal text.

The privacy policy matters: this site will collect email addresses, and Digital Flyer (Pty) Ltd is a registered POPIA responsible party with Dewald as Information Officer.

---

## 6. THE OLD SITE: DO NOT LOSE THINGS

Before the DNS is switched, Dewald must extract from WordPress:

- Existing WooCommerce customer accounts and order history for issues 6, 7 and 8
- Any email list or subscriber records
- All edition PDFs and cover images
- The full URL list of existing indexed pages

Provide a short plain-language checklist for him to do this. **Do not switch the DNS until he confirms the export is done.** Once the domain points elsewhere, that WordPress site is unreachable.

Set up redirects from the old URLs (`/editions`, `/shop`, `/product/...`, `/my-account`) to their nearest new equivalent so existing links and search results do not break.

---

## 7. OUT OF SCOPE

- Any checkout, cart, payment or subscription flow
- Any Paystack integration
- Reader accounts, logins or profiles
- Comments, ratings, reviews
- Analytics beyond what Vercel already provides
- Email sending beyond capturing addresses
- Advertiser self-service
- Migrating the WordPress database programmatically
- Anything inside Kwaai Press. This site links to it.

---

## 8. WHAT YOU DECIDE VERSUS WHAT NEEDS DEWALD

**You decide:** page structure, styling within house rules, how editions and codes are stored, redirect implementation.

**Stop and ask Dewald:**
- Edition numbering, before seeding anything
- Anything that would require a payment flow
- Anything touching existing Growth or KatisoBiz behaviour
- Anything requiring a new paid service

---

## 9. ACCEPTANCE CRITERIA

1. The page reads well on a phone and on desktop.
2. June and July are downloadable, and any edition with a Kwaai Press URL opens from a cover thumbnail.
3. A code-gated edition prompts for a code, opens on a valid code, refuses an invalid or revoked one, and does not prompt again on the same device for that edition.
4. Code batches generate, export as CSV, and show redemption counts.
5. `moxiemag.co.za` returns no `x-robots-tag: noindex` and a normal `robots.txt`, verified by fetching headers directly.
6. Growth, KatisoBiz and The Desk all return exactly what they returned before this build, verified the same way.
7. Page metadata is correct and the link preview shows the current cover, not the recipe text.
8. No testimonial, review or invented social proof appears anywhere.
9. Old URLs redirect rather than 404.
10. No payment, checkout or subscription code exists anywhere in the build.
11. The export checklist in section 6 exists and is written in plain language.

---

## 10. HOW TO REPORT BACK

One report. What was built, every criterion pass or fail, the header check output in full, the edition numbering Dewald confirmed, and the export checklist.

Do not switch DNS as part of this build. Deploy to a preview, report, and let Dewald make the switch after he has confirmed the WordPress export.
