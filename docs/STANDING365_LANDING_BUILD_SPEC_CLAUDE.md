# STANDING365_LANDING_BUILD_SPEC_CLAUDE.md

## 1. Project Overview

Standing 365 is a 365 day devotional book by Dewald Rosema (author name/brand: AM I...), written for people going through hard seasons. This spec covers a custom built landing page for the book, replacing the current bare bones legacy Core product page as the primary place people land, read about the book, and buy a copy.

Correction from the earlier version of this spec: this page is not a standalone product outside the ecosystem. It is being built inside DigitalFlyer Growth itself, as Dewald's own member page, and it doubles as the first real, live implementation of a feature already on the Growth backlog, members being able to request an additional, custom built landing page beyond the standard self serve template. Building this one for real, now, proves the pattern before that request flow is opened up to other members.

Audience type: public facing, end user product. Real buyers, real money, real pre-orders.

Brand direction: matches the existing Standing 365 brand already visible at the current live page (standing365.digitalflyer.co.za) and the book cover itself. Claude Code should pull real colour, type, and imagery direction from the existing live page and the book cover before styling anything, and confirm the palette and fonts with Dewald before finalising the design system rather than guessing.

## 2. Relationship To The Growth Custom Landing Page Backlog Feature

This build is the pilot for a feature already scoped for Growth. Members will eventually be able to request an additional, custom built landing page beyond their standard self serve page, at a flat R450 one time setup fee, reasonable revisions included, available to every Growth tier, request based rather than self serve at first.

Standing 365 is that feature's first real instance, built for Dewald's own account rather than billed. Because of that, Claude Code should build this as a distinct, reusable page type inside Growth, not a one off hack, so the next genuine member request for a custom page can follow the same underlying pattern instead of starting from zero. Concretely, this means:
- A page record that is flagged as a custom built page, rendered through its own hand coded component tree, separate from the standard template renderer used by self serve Growth pages
- Order or commerce style data (if the custom page needs its own purchase flow, as this one does) kept in its own clearly separated table, not folded into Growth's standard leads table
- Nothing about this pilot should assume every future custom page needs a purchase flow, most likely will not, this one happens to because it is a real book with real pre-orders

## 3. Tech Stack

Built inside the existing Growth codebase and the existing Growth Supabase project (Dewald's own production Growth account), not a new standalone repository or a new Supabase project. This is a deliberate change from the ecosystem's usual federated architecture principle, because this is not a new ecosystem layer, it is a feature of Growth itself.

- Next.js App Router, TypeScript, within the existing Growth repo
- Tailwind CSS, matched to the Standing 365 brand direction for this specific page
- Vercel, same Growth project, existing domain and hosting setup, no separate deployment
- Supabase, the existing Growth project, af-south-1 (Cape Town), new tables scoped to this page rather than reusing Growth's lead or member tables
- Paystack, using the existing Paystack integration already wired into Growth, Dewald's own account, online payments activated
- Reuse Growth's existing SEO and Meta tracking infrastructure for this page: per page metadata, JSON-LD schema (Product or Book schema rather than LocalBusiness, since this is a product page, not a business listing), Meta Pixel, and Conversions API, since that infrastructure already exists in Growth and this page should be a strong real world example of it working well

## 4. How This Differs From A Standard Growth Page

Growth's self serve builder produces templated pages from fixed components, built for speed and consistency across many members. Standing 365 needs full custom code, hand built sections, freeform editorial layout, because of the emotional, high polish design this book needs, the kind of page a template system is not meant to produce.

Implement this as a distinct page type within Growth (for example a `page_type` field of `custom` on the page record, rendered via its own component tree rather than the standard template renderer), so this pattern is reusable the next time a real member requests a custom build, rather than being a one off exception living outside the platform's normal structure.

## 5. Page Sections (from confirmed copy)

Build in this order, top to bottom:

1. **Hero.** Headline "A book for the real life", title "Standing 365", pull quote ("Not for the people who have it all together...for everyone still standing in the middle of the hard thing."), one line description, two CTA buttons ("Get Your Copy" scrolls to the order section, "Read more about the book" scrolls to About), supporting line: "Paperback pre-order. Personalised gift edition available. Ships nationwide."
2. **About this book.** Full about copy as supplied, Galatians 6:9 verse as a styled pull quote.
3. **Twelve months, twelve honest conversations.** The 12 topic list (New Beginnings, Relationships, Purpose, Provision, Faith and Doubt, Identity, Calling and Work, Mental Health, Community, Perseverance, Gratitude and Hope, Legacy and Eternity), styled as a clean grid or tag style list, not a plain bullet list.
4. **Own a copy.** Three option cards:
   - Standard Paperback, R299 + R75 delivery nationwide
   - Personalised Paperback, R385 + R75 delivery nationwide, flagged as "Most special"
   - Kindle eBook via Amazon, external link, available immediately, no pre-order wait
   Pre-order batch notice displayed clearly near this section: printed and shipped in batches of 50, customers notified immediately if their order falls in a later batch and kept updated until it ships.
5. **Closing.** Verse repeated, closing line, final "Get Your Copy" CTA, footer with book title and author line.

## 6. Purchase Flow, Data Model

Three purchase paths from the "Own a copy" section:

**Kindle.** External link straight to the Amazon Kindle listing (https://www.amazon.com/dp/B0H298566F). No data capture on our side, no order record needed, this is a pure link out.

**Standard Paperback.** Opens an order form. Capture, in order, before any payment step:
- Full name
- Email
- Phone
- Delivery address (street, suburb, city, postal code)
- Consent checkbox (required, POPIA aligned, same pattern as the rest of Growth: plain language, links to a short privacy note for this order)
Then redirect to Paystack for the R299 + R75 delivery payment. On successful payment, write the order to Supabase and send a confirmation email including expected batch information.

**Personalised Paperback.** Same fields as Standard, plus:
- Recipient's full name (to print on the cover)
- Personal message (to print inside the front cover, reasonable character limit, Claude Code to set a sensible cap, suggest 300 characters, and show a live counter on the field)
Then redirect to Paystack for the R385 + R75 delivery payment. Same confirmation and batch handling as Standard.

**Supabase table (starting point, Claude Code may refine), kept separate from Growth's standard leads and member tables:**
- `book_orders`: id, created_at, edition (standard | personalised | kindle_redirect), buyer_name, email, phone, delivery_address (jsonb), recipient_name (nullable), gift_message (nullable), amount, payment_status, paystack_reference, batch_number (nullable), fulfilment_status, marketing_consent (boolean, optional opt in, unchecked by default, separate from the required legal consent)

## 7. Contact Details, Confirmed

Display in the page footer and in order confirmation emails:
- Support email: dewald@digitalflyer.co.za
- WhatsApp: +27723110570

## 8. Note on Live Testing

Dewald will personally place a live test order using dewald@digitalflyer.co.za against one of the paid packages once the order flow is built, to confirm the real Paystack integration end to end before this page is announced publicly. This is intentional, expected test traffic, not spam or an error to filter out. No special handling needed in the build itself, just do not be surprised by an order from that email address appearing in the admin view in Sprint 3.

## 9. Data Privacy Note

This page collects real personal data, including a home delivery address and a personal gift message, for a real consumer product. Apply the same POPIA aligned pattern already standard across the ecosystem: one required legal consent checkbox, one separate optional marketing opt in unchecked by default, and a short plain language privacy note for this specific order form. Dewald is already registered as Information Officer with the Information Regulator, this page falls under that same registration, no new registration needed, but Claude Code should still write a short, honest privacy note specific to this page rather than copying Growth's wording verbatim, since the data collected here (home address, gift message) is different from Growth's usual lead capture data.

## 10. Image Handling

Claude Code should prompt Dewald directly for the required images at build time rather than guessing placeholders, and handle resizing and cropping to fit each slot responsibly. At minimum, the page will need:
- Hero background or hero visual
- Book cover image, standard edition
- Book cover mockup or example, personalised edition (showing a name on the cover, can be a placeholder name for the demo image)
- Author photo (optional, for a possible short author note, confirm with Dewald whether this is wanted)
- Any lifestyle or supporting imagery for the About section

## 11. Interactive, Loading, and Empty States

- Order form fields show clear focus states and inline validation, especially on the personal message field given the character cap.
- Submit button on the order form shows a loading state while Paystack redirect is being prepared, disabled during that window to prevent double submission.
- On return from Paystack, show a clear success state confirming the order and batch expectation, and a clear failure state with a retry option if payment does not complete.
- If the current batch counter or spot data is ever shown on this page in future, follow the same "only show real live numbers, never fabricate" rule already standard across the ecosystem.

## 12. Build Order

**Sprint 1. Page build.** All five sections above, static content, fully responsive, real brand tokens once confirmed by Dewald, no order logic yet. "Get Your Copy" buttons scroll to the Own a Copy section, Kindle button links out live. Implemented as a `custom` page type within Growth's existing page rendering structure, per section 4.

**Sprint 2. Order flow.** Standard and Personalised order forms, the `book_orders` table, Paystack integration (existing Growth credentials), POPIA consent handling, success and failure states, confirmation email on successful payment.

**Sprint 3. Fulfilment basics.** Simple internal view (can be a protected admin route inside Growth, does not need to be polished) for Dewald to see incoming orders, batch numbers, and fulfilment status, and mark orders as shipped. Batch notification email when a customer's order is assigned or reassigned a batch number.

## 13. Out of Scope, Do Not Build

- No self checkout on Amazon, Kindle purchases happen entirely on Amazon's own platform
- No inventory or print run automation, batch assignment is manual by Dewald in Sprint 3's internal view
- No connection to the legacy Core store or its database, this page replaces that link entirely
- No self serve flow yet for other members to request their own custom page, that comes later, this pilot only needs to prove the underlying pattern works
- No multi language support unless requested
- No customer accounts or login, every order is a guest checkout

## 14. Status

Confirmed and ready to build now, inside the existing Growth codebase and Supabase project, while Dewald runs the full Growth platform test separately. This page needs to be live before the Growth system publishes, treat as a priority build.

Two things still open, not blockers, just need Dewald's input before each is finalised:
- Real brand tokens (colours, fonts) should be confirmed with Dewald before Sprint 1 styling is locked in. Claude Code should pull a strong starting direction from the existing live page and book cover, but confirm before finalising.
- Author photo and the personalised cover mockup image need to be requested directly from Dewald during Sprint 1, per the image handling note in section 10.
- Domain mapping: confirm whether this page keeps its current subdomain (standing365.digitalflyer.co.za) mapped into the Growth Vercel project, or moves to a path within Growth's own domain. Either is technically fine, this is a preference call for Dewald, not an engineering constraint.
