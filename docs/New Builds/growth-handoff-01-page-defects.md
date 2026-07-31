# Claude Code Handoff 01: Growth member page defects and template tells

## Context

DigitalFlyer Growth is a self-serve platform for South African one-person businesses. Members sign up, complete an onboarding flow, and the system generates a public landing page for them at `growth.digitalflyersa.co.za/{clientSlug}`.

Stack: Next.js on Vercel, Supabase for data and storage, Sentry for error reporting. The member page route is `/[clientSlug]`.

These pages are the public face of the product and the inventory of the marketplace. A live audit of five pages found a consistent set of rendering defects and generic template copy that make every page look machine-generated. This handoff fixes those and nothing else.

This is the first of four handoffs. Contact actions, the image pipeline and the section library follow separately. Do not pull work forward from them.

## Goal

Remove every defect and every visible tell that these pages came out of a generator. No new features. No redesign. No layout changes beyond removing things.

Success looks like: a member page that a stranger would not immediately recognise as one of many.

## What to build

### A. Truncated summary field

The about section renders a short summary that is hard-truncated mid-word, and the same truncated string is used for `meta description`, `og:description` and `twitter:description`.

Observed on live pages:
- `/mikeys-handyman` renders "At Mikey's Handyman we understand that your home is one of your most valuable as"
- `/seven-passes-initiative` renders "The Seven Passes Initiative is a community based organisation committed to build"
- `/cape-town-butler` renders "Cape Town Professional Butler Training and Services where excellence in hospital"

Find where this truncation happens. Two things to fix:

1. On the page itself, this summary line sits directly above the full about body and repeats it. Remove the summary line from the rendered page. The about section shows the full about body only.
2. For meta tags, truncate on a word boundary at approximately 155 characters and append an ellipsis. Never cut mid-word.

### B. Duplicate service list

`/seven-passes-initiative` renders its complete service list twice: once inside the hero block and again under the services section.

Find the condition that causes the hero variant to render services. A service list must render exactly once per page.

### C. Broken map embeds

Map embeds are built from the street line alone, with no suburb, city, province or country. Observed query strings: `Pretoria`, `6 Bester Street`, `Scheiding Street`, `287 Thea Avenue`, `Shop 28 Upperdeck`. None of these resolve to the member's actual location. A map pointing at the wrong place is worse than no map.

Fix:
- Build the map query from the full address: street, suburb, city, province, and "South Africa".
- If the member has only supplied a city or a suburb with no street address, do not render an embedded map. Render the area served as text instead.
- If the address cannot be resolved with confidence, suppress the map rather than rendering a wrong one.

### D. Dead calls to action and empty sections

Observed:
- `/nefeli-property-maintenance` has a button reading "See what people say" that jumps to a section reading "No reviews yet. Be the first."
- `/tats-by-mags` has a heading reading "Tap through to see the details" with nothing rendered beneath it.

Apply one rule across the whole page: **a section with no content does not render, and a call to action that targets a section that did not render does not render either.**

This applies to reviews, packages and offers, gallery, map, and any other conditional section.

Specifically on reviews: remove "No reviews yet. Be the first." from public pages entirely. Where a member has zero reviews, the reviews section does not appear in the page flow. Keep the review submission route reachable by direct link so members can still solicit their first review. Do not advertise emptiness on the page.

### E. Platform branding on member pages

Currently the member's page markets DigitalFlyer above the member:
- The header shows the DigitalFlyer logo linking to `/pricing`
- The header shows a "← Marketplace" back-link
- `/nefeli-property-maintenance` displays "Premium · Nefeli Property Maintenance", exposing the member's subscription tier to the public

Fix:
- Remove the subscription tier badge from public pages completely. No customer needs to know which tier their plumber pays for.
- The member's own name and logo is the topmost brand element on the page.
- Move DigitalFlyer attribution to the footer only, as one small line, linking to the marketplace rather than to the pricing page.
- The existing "Manage this page" footer link is for the member and stays.

### F. Generic template copy

- The heading "Everything you need, in one place." appears above the services section on every page audited. Remove it. Use a heading derived from the member's own data, preferring their trade or their own words from onboarding. Where nothing suitable exists, use "Services".
- Remove the eyebrow numbering "01 ·", "02 ·", "03 ·", "04 ·" from all sections.
- Section headings such as "About {business}", "Find us" and "Get in touch" are acceptable. Leave them.

### G. Page titles and category strings

The current title pattern is `{Business} | {Category} in {City} | DigitalFlyer Growth`. This produces:
- "Cape Town Butler | General Education in Pretoria | DigitalFlyer Growth"
- "Tats by Mags | General Beauty & Wellness in Hartbeespoort | DigitalFlyer Growth"

A tattoo studio filed as General Beauty and Wellness, and a business named Cape Town Butler shown as being in Pretoria, both read as errors to a human and to Google.

Fix in this pass:
- Drop the "General " prefix from any category string rendered on the page or in metadata.
- Drop "| DigitalFlyer Growth" from member page titles.
- Where the member has supplied a primary service or trade, use it in the title in preference to the assigned category.
- Include suburb as well as city where available.

Do not restructure the category taxonomy in this pass. Instead, produce a report (see reporting below).

## Out of scope

Do not build any of the following. They are later handoffs.

- Call buttons, WhatsApp buttons, `tel:` or `wa.me` links, reference codes, lead event tracking
- Any change to the lead form's behaviour or the contact-reveal flip
- Image uploads, image normalisation, focal points, quality checks
- Generated Open Graph share cards
- Removing or replacing the Pexels stock image fallback
- Any new sections, any redesign, any change to colours, type or spacing
- Any change to pricing, marketplace, dashboard or onboarding
- Restructuring the category taxonomy

## Decisions

**The agent decides:** implementation approach, file and component organisation, how the empty-section rule is expressed in code, how address confidence is determined, and how the services heading is derived from member data.

**Nothing in this handoff needs Dewald.** If you hit something that appears to need a product decision, stop, leave that item unfixed, and raise it in the report rather than guessing.

## Working method

Work on a branch. Do not push to production. Deploy to a Vercel preview and give Dewald the preview URL in your report so he can compare against live before anything is merged.

## Acceptance criteria

Test against all eight live member pages:

`/dr-gerhard-bothma-pty-ltd`, `/mikeys-handyman`, `/cape-town-butler`, `/experto-bdm-services`, `/nefeli-property-maintenance`, `/tats-by-mags`, `/simply-water-boksburg`, `/seven-passes-initiative`

On every one of them:

1. No text is truncated mid-word anywhere on the page or in any meta tag
2. No content block renders twice
3. Every map either resolves to the member's actual location or is absent
4. No call to action links to an empty or non-rendered section
5. No "No reviews yet" text appears on any public page
6. No subscription tier is visible to the public
7. The member's name or logo is the topmost brand element; DigitalFlyer appears in the footer only
8. The string "Everything you need, in one place." appears nowhere
9. No numbered section eyebrows appear
10. No page title contains "General " or "| DigitalFlyer Growth"
11. Nothing listed under Out of scope has changed

## How to report back

One report at the end. Cover:

1. What changed, by file, in plain language
2. The Vercel preview URL
3. **Category report:** every category currently assigned to a member, with a count of members in each, and every category flagged that begins with "General" or that appears to be a poor fit for the members assigned to it
4. **Data problems found:** any member records with missing, malformed or contradictory data found while doing this work. One known example to include: the business name stored as "Mikeys Handyman" while the member's own body text uses "Mikey's Handyman". List these; do not fix them.
5. Anything found and deliberately not fixed, and why
6. Anything in this brief that turned out to be wrong about how the code actually works
