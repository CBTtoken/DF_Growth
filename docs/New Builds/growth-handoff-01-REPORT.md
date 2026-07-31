# Handoff 01 report: member page defects and template tells

Branch: `handoff-01-page-defects` (commit `c02b1b0`, not merged, not pushed)
Verified against all 34 active member pages, not only the audited eight.

---

## 1. What changed, by file

**New: `src/lib/landing/page-copy.ts`**
The small decisions a member page makes about what to call things and whether it
is honest enough to show a map. One module so the public page, the dashboard
preview and the template preview can never drift apart.

- `displayCategory` strips the "General " prefix off a category.
- `primaryService` takes the member's first service line when it reads like a
  trade rather than a sentence.
- `servicesHeading` picks the heading that replaces "Everything you need, in one place."
- `memberPageTitle` builds the page title.
- `firstProse` picks the first candidate field that is actually a sentence.
- `resolveLocation` decides between a map, an area line, or nothing at all.

**New: `src/app/[clientSlug]/review/page.tsx`**
The direct review link the brief asked to keep reachable. One page, one form,
opens ready to type, `noindex`. Not linked from the public page: it is a link
the member sends a customer, not a call to action a visitor stumbles into. This
had to be built, because the submission form previously existed only inside the
reviews section, and that section now disappears when a member has no reviews.
Without it, a member with zero reviews would have had no way to ask for their
first one.

**`src/app/[clientSlug]/page.tsx`**
The DigitalFlyer strip comes off the top of member pages. Title now uses the
member's own trade, drops "General ", and opts out of the layout's brand
suffix. Meta description now prefers the member's own about copy. Query also
fetches `province` so the map can resolve.

**`src/components/landing/ClientLandingPageView.tsx`**
The eyebrow numbering machinery is deleted. `hasContent` was previously only
used to number sections and two of its entries lied about what actually
rendered; it is now the single source of truth for what appears, and every hero
link that targets a section is gated on it. Footer gains a single
"Page by DigitalFlyer" line to the marketplace.

**`src/components/landing/AboutSection.tsx`**
No longer renders the tagline above the about body.

**`src/components/landing/ServicesList.tsx`**
Heading now comes from the caller.

**`src/components/landing/LocationMap.tsx`**
Map query carries street, city, province and country. Where the address cannot
be placed with confidence, the section states the area in words instead, under
"Where we work", with no map.

**`src/components/reviews/ReviewsSection.tsx`**
Returns nothing when there are no reviews. All three "No reviews yet. Be the
first." messages are gone.

**`src/components/reviews/ReviewSubmissionForm.tsx`**
Gains a `startOpen` option for the direct link page.

**`src/components/landing/HowItWorksSection.tsx`**
Gains `id="how-it-works"`. It never had one, so the step-by-step hero's
"See the full process" link had done nothing on every page using that template.

**Heroes.** `DarkHero` stops captioning the panel "Premium ·" and only shows
"See what people say" when there is something to see. `ShowcaseHero` drops the
placeholder card and the "Tap through to see the details" line. `ChecklistHero`
renders the member's full service list rather than a silent first six, and
nothing at all when there are none. `BentoHero` only links to services when
services exist.

**Eyebrow numbering removed from** StorySection, PackagesSection, TrustBadges,
PhotoGallerySection, and the preview and sample routes.

**`src/app/dashboard/preview/page.tsx`** fetches `province` so the member's own
preview matches their live page.

---

## 2. The Vercel preview URL

**https://df-growth-ks6emc09r-digital-flyer.vercel.app**

Open it while logged into Vercel. Deployment Protection is on, so the URL
redirects to a Vercel login for anyone else, which is what makes it safe for a
preview to read the live database.

Start with `/seven-passes-initiative`, `/nefeli-property-maintenance`,
`/tats-by-mags` and `/mikeys-handyman`. Those four changed the most.

### What had to be fixed first

The preview build failed three times before this, and not because of these
changes. Every Supabase environment variable on the `df-growth` project was set
for **Production only**:

```
SUPABASE_URL                    Production
SUPABASE_SECRET_KEY             Production
SUPABASE_SERVICE_ROLE_KEY       Production
NEXT_PUBLIC_SUPABASE_URL        Production
NEXT_PUBLIC_SUPABASE_ANON_KEY   Production
```

A preview deployment therefore has no database credentials, and the build dies
prerendering `/board/category/skilled-trades-repairs`, a page nothing in this
handoff touches. Production deploys from two hours ago succeeded normally.

A preview deployment therefore had no database credentials, and the build died
prerendering `/board/category/skilled-trades-repairs`, a page nothing in this
handoff touches. No Vercel preview of this project had ever worked, so the
"deploy to a preview" instruction in both handoffs could not be followed as
written. Both handoffs assume it works.

Fixed on 2026-07-31 by adding four **new** Preview-scoped entries
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SITE_URL`). The existing Production entries
were never opened or edited. Values were piped straight from the local
`.env.local` so nothing was copied by hand or printed anywhere.

Two traps worth recording, because they nearly cost a production outage:

- The Vercel UI no longer has per-environment tick boxes on one entry. It is one
  entry per environment, which is why `ANTHROPIC_API_KEY` appears three times in
  the list. Editing the Production entry and switching its dropdown to Preview
  **moves** it rather than adding, so Production would have lost the variable.
- Variables marked **Sensitive** are write-only. The Edit dialog shows an empty
  Value box because the value cannot be read back, so saving that form would
  have written a blank over the real value.

`NEXT_PUBLIC_SITE_URL` for Preview is set to `https://growth.digitalflyersa.co.za`
rather than the localhost value in `.env.local`.

Nothing is merged and nothing is on production.

---

## 3. Category report

Every category currently assigned to an active member, most-used first.
**Bold** entries begin with "General".

| Members | Category | Who |
|---|---|---|
| 6 | **General Digital Services** | Traffic Fine Manager, J9CreativB Digital Creator, WerkBewys, Cuddles and Custody, Refurb Online, JozyMee Marketing & Creative Solutions |
| 5 | **General Construction & Small Renovation** | Gemini Aluminium & Glass, Dolphin Pool Services, Obvious Wood Maintenance, Mikeys Handyman, Andries The Handyman |
| 4 | **General Beauty & Wellness** | Forever Wellness, Mushroom Guru, Tats by Mags, Dr Gerhard Bothma |
| 3 | Business Consulting & Coaching | Simply Water Boksburg, Experto BDM Services, Unity Ventures |
| 2 | **General Education** | Seven Passes Initiative, Cape Town Butler |
| 2 | House Sitting & Property Maintenance | Nefeli Property Maintenance, Mila's Place |
| 2 | Social Media, Marketing & Copywriting | Pixel Perfect, Impactful Creations |
| 1 | Book | Standing 365 |
| 1 | Community | KatisoBiz Nomads |
| 1 | **General Arts & Crafts** | Veronique Handmade |
| 1 | Graphic Design & Branding | Domify.co.za |
| 1 | Jewelry & Accessories | Cute a Roo |
| 1 | Manufacturing & Industry - Farming | Simthu Agri Env Solutions |
| 1 | Non-Profit Organisation | Helplift Network Vaal Triangle |
| 1 | Plumbing | Watershed plumbing |
| 1 | Precious Metals | Sell Gold 2 Us Pretoria North |
| 1 | *(no category)* | Buffelskop |

**19 of 34 members sit under a "General " category**, which is more than half.
"General X" is a real catch-all subcategory inside the taxonomy, so this is not
corrupt data, it is members picking the safe option. It is still a filing label
rather than a trade, and it is why so many pages read the same.

**Categories that are a poor fit for the members in them:**

- **Simply Water Boksburg** is filed under *Business Consulting & Coaching*. It
  refills water containers. This one is plainly wrong.
- **Dr Gerhard Bothma** is filed under *General Beauty & Wellness*. He is a
  consultant, coach and public speaker.
- **Mushroom Guru** is filed under *General Beauty & Wellness*. Likely a grower
  or supplier.
- **Cape Town Butler** is filed under *General Education*. Hospitality training
  is closer to the truth, and their own first service line is better than both.
- **Tats by Mags** under *General Beauty & Wellness* is defensible, tattooing
  does sit under that parent, but "Beauty & Wellness" is not what a customer
  searches for.
- **Buffelskop** has no category at all.

This matters more than it did before. The services heading on a member's page is
now derived from their category, so a wrong category is now visible to their
customers rather than hidden in a filter. Dr Gerhard Bothma's services list
currently sits under the heading "Beauty & Wellness".

Taxonomy restructuring was out of scope for this pass, as instructed.

**Your call, 2026-07-31: the heading now reads plain "Services" on every page**
until the taxonomy is cleaned up. A neutral heading beats a confidently wrong
one. The switch back is one line in `lib/landing/page-copy.ts`. The page title
still uses the member's own trade, where nothing sits underneath to repeat it.

---

## 4. Data problems found, listed and not fixed

**Taglines stored hard-cut at exactly 80 characters. 14 members:**

simply-water-boksburg, experto-bdm-services, unity-ventures, veronique-handmade,
gemini-aluminium-glass-construction, mikeys-handyman, refurb-online,
jozymee-marketing-creative-solutions, seven-passes-initiative, cape-town-butler,
domify-co-za, simthu-agri-env-solutions-projects-pty-ltd,
sell-gold-2-us-pretoria-north, pixel-perfect

The truncation is in the stored data, not in the rendering. Something wrote
these at `.slice(0, 80)`. The about section and the meta description no longer
expose it, but **the marketplace card still shows the cut string**, and that was
outside this handoff's scope.

One of these is worth reading in full:
`jozymee-marketing-creative-solutions` has a tagline of *"When I found
DigitalFlyer SA I knew immediately this was different and for my bu"*. That is a
testimonial about us that got saved into the member's own tagline field.

**`mikeys-handyman.business_description` is a pasted Google Tag Manager
snippet**, not a description. Found because switching the meta description away
from the broken tagline published the tag manager code straight into Google's
snippet for that page. Guarded against in code (`firstProse` skips any candidate
that is not prose), but the stored value is still junk.

**`seven-passes-initiative.business_description`** reads like an internal brief
written by us, not by the business: *"This page will live permanently and act as
the hub for the organisation..."*.

**Business name and body copy disagree**, the known example plus one more:
- Stored `Mikeys Handyman`, body copy uses `Mikey's Handyman`.
- Stored `Watershed plumbing`, lower-case p mid-name.

**Cape Town Butler is stored as being in Pretoria** with city `Pretoria` and
province `Gauteng`. Their about copy confirms they really did move, so the data
is correct and the name is now misleading. Nothing to fix in data.

**Addresses that are not addresses.** These 16 members now get an area line or
nothing instead of a map pointing at the wrong place:
- Area only: `mikeys-handyman` ("Pretoria"), `andries-the-handyman`
  ("Hartbeespoort dam"), `standing365` and `werkbewys` ("Online")
- Postal, not physical: `cuddles-and-custody`
  ("Postnet Suite #6  Private Bag 12")
- No address at all: katisobiz-nomads, veronique-handmade, traffic-fine-manager,
  j9creativb-digital-creator, refurb-online,
  jozymee-marketing-creative-solutions, domify-co-za, cute-a-roo,
  simthu-agri-env-solutions, impactful-creations, buffelskop

**Phone numbers, as a baseline for Handoff 02.** 28 of 34 are stored clean as
`27XXXXXXXXX`. The exceptions:
- `buffelskop`: `0824813649` (local format)
- `helplift`: `+27 69 317 0292` (spaces and plus)
- `mushroom-guru-pty-ltd`: `021-854-5126` call, `062-453-8446` WhatsApp. **The
  call number is a Cape Town landline.**
- `refurb-online`: WhatsApp stored as `788763095`, missing its leading digit,
  against a call number of `27788763095`. This one is broken and would produce a
  dead `wa.me` link.
- No number at all: `werkbewys` (a real member), plus `katisobiz-nomads` and
  `standing365` (our own custom pages, not members)

So for Handoff 02: **one real member ships with the form only**, not the "many"
the brief expects.

---

## 5. Found and deliberately not fixed

**The services item numbering inside the dark-mode services grid.** The
spotlight-tiles layout numbers each service card 01, 02, 03 down the list. These
are card ordinals inside one section, not the "01 ·" section eyebrows the brief
named, so I left them. They do carry a similar machine-made feel. Say the word
and they go.

**`simply-water-boksburg` is now a very thin page.** It uses the single-action
template, whose only section is reviews, and it has none. What is left is the
hero, a "Get in touch" prompt and the form. This is the empty-section rule
working correctly, and the page is honest, but it is close to empty. Worth
knowing before you look at it.

**`TimelineHero`'s fallback steps** ("Get in touch", "We handle everything",
"You're sorted") are generic template copy that shows when a member on the
step-by-step template has typed no services. No current member is in that state,
so nothing renders it today.

**`HowItWorksSection` is entirely generic copy** on every page that uses it, and
its heading is "Three simple steps." Nothing in the brief named it, and removing
it would leave a hole in the step-by-step template rather than just removing
something. Flagging rather than acting.

**Member service lines that begin with "General "** are left alone in the body
of the page, for example `nefeli-property-maintenance` lists "General Cleaning".
Those are the member's own words for a service they offer. "General " is only
stripped where it appears as a label: the title and the services heading.

**The marketplace card still shows truncated taglines**, per your decision to
list the data problem rather than fix it.

**Custom pages keep the DigitalFlyer strip and the brand suffix.** HelpLift,
KatisoBiz Nomads and Standing 365 render through `/[clientSlug]` but are our own
pages rather than a member's shopfront, so the "the member is the brand" rule
does not apply to them. Confirm if you disagree.

---

## 6. Where the brief was wrong about the code

**1. "Premium · Nefeli Property Maintenance" is not a subscription tier.** It was
a hardcoded decorative caption in `DarkHero.tsx`, printed on every dark-mode
page regardless of what that member pays. No tier was leaking. Arguably worse
than a leak: it was a premium claim the member never made. Removed either way,
and the caption is now just their name.

**2. There is no suburb field.** `growth_clients` has free-text
`business_address`, `city` and `province`, and nothing between city and street.
Handoff 01 G asks for suburb in titles and C asks for it in map queries. City is
as fine-grained as this can honestly go. Adding a suburb field means touching
onboarding and the dashboard, which G puts out of scope.

**3. The truncated summary is not a render-time truncation.** No code was
slicing it. It is the stored `tagline` value, cut at write time, rendered whole.
That is why fixing it properly is a data job, not a code job.

**4. The duplicate service list is one hero, not a general condition.**
`ChecklistHero` (app-dashboard template) renders the complete list, so
`/seven-passes-initiative` showed it twice. `BentoHero` shows 4 tiles and
`TimelineHero` 3 steps, each with an explicit link to the full section, which is
a preview rather than a duplicate. I left those two alone and dropped the
standalone section only for the checklist template. Tell me if you want the
teasers gone as well.

**5. The audit covers 8 pages; 34 active members render through this route.**
Every change here lands on all 34. I tested all 34.

**6. "Keep the review submission route reachable by direct link" describes a
route that did not exist.** The form only ever lived inside the reviews section.
It had to be built to satisfy the brief, so `/{slug}/review` is new.

---

## 7. One thing I got wrong and corrected mid-build

My first version of the services heading preferred the member's first service
line, following the brief's "prefer their trade". On
`/nefeli-property-maintenance` that produced a heading reading "Carpentry"
directly above a list whose first item was "Carpentry". The first service line
is by definition also the first thing in the list underneath it. The heading now
uses the category. The first service line is still preferred for the page title,
where nothing repeats it.

---

## Acceptance criteria

Checked against all eight named pages, and the mechanical checks against all 34.

| # | Criterion | Result |
|---|---|---|
| 1 | No text truncated mid-word on page or in meta | Pass |
| 2 | No content block renders twice | Pass |
| 3 | Every map resolves to the real location or is absent | Pass |
| 4 | No call to action links to an empty or missing section | Pass |
| 5 | No "No reviews yet" on any public page | Pass |
| 6 | No subscription tier visible | Pass (there never was one) |
| 7 | Member is the topmost brand; DigitalFlyer in footer only | Pass |
| 8 | "Everything you need, in one place." appears nowhere | Pass |
| 9 | No numbered section eyebrows | Pass (see item 5 on card ordinals) |
| 10 | No page title contains "General " or the brand suffix | Pass |
| 11 | Nothing under Out of scope has changed | Pass |
