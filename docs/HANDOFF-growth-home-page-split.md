# Handoff: split the Growth front page, and give it a real home at `/`

**For Claude Code. Written 4 August 2026.**

---

## Context

`growth.digitalflyersa.co.za/pricing` is currently the home page. The logo links
to it, every call to action anchors to it, and it is the URL pasted into
WhatsApp when somebody asks what DigitalFlyer is.

Two problems follow from that.

The brand's front door is a URL that says "pricing", so every visitor arrives
framed on cost before they know what the product is. And there is no separate
pricing page for somebody who wants the detail.

The page also does five jobs at once. It sells memberships, recruits agents,
advertises free event listings, explains booking and shop, and pitches the
marketplace. Three of those speak to different audiences, and every extra
audience costs conversions from the main one.

Prospects are coming back confused about what they actually get. The evidence
suggests that is not caused by page length. It is caused by tier bullets like
"Business Profile", "Ready To Share Anywhere", "Monthly Optimisation" and
"Growth Reporting", which a plumber cannot translate into anything.

## Goal

A short home page at `/` whose only job is to start a free trial, a proper
pricing page at `/pricing`, and every other section moved to a page where it
belongs.

**Nothing on the current page is to be deleted.** Sections move. If a section
has no obvious destination, it goes into a holding page rather than being
removed, and it is listed in the report.

---

## What to build

### 1. Routing

- Home page at `/`.
- Pricing page at `/pricing`, keeping the existing URL so nothing already
  shared breaks.
- The logo links to `/`, not to `/pricing`.
- Anything currently anchoring to `#pricing` on the home page links to
  `/pricing` instead, unless the plan cards are on screen at that point.
- Check the sitemap, canonical tags and the Open Graph URL on both pages. The
  current canonical on the front page points at `/pricing` and will be wrong
  the moment `/` exists.

### 2. The home page at `/`, in this order

1. **Hero.** Headline, one supporting line, the price visible without
   scrolling, and one primary button: start free, no card required. One
   secondary link to pricing. The existing hero photo is reused.
2. **Sound Familiar.** The existing section with the four pain bullets, moved
   up from position six. This is the strongest copy on the site and almost
   nobody currently scrolls to it.
3. **What you get.** Three plain items, each with a real screenshot. Not
   feature names. What the member ends up holding.
4. **KatisoBiz, free.** A short block: quoting and invoicing on a phone, ten
   documents a month free, no card. Links out to katisobiz.co.za. See the
   warning under "corrections" before writing this copy.
5. **The two plans**, side by side, in plain language. Foundation and Growth
   only.
6. **Build it for me, R450.** Currently buried at the bottom of the pricing
   block. For a time-poor operator this is the strongest offer on the site and
   it should be a section of its own.
7. **Real member pages.** Three of them, with a link to the marketplace.
8. **One closing call to action**, then the existing contact form.

Nothing else on the home page.

### 3. The pricing page at `/pricing`

Receives the full detail: both plans with every inclusion, the annual and
monthly toggle, the build-it-for-me offer, the Enterprise line, the terms
checkboxes and the marketing opt-in, and a link to the FAQ.

### 4. Sections that move, and where they go

| Section on the current page | Destination |
|---|---|
| How It Works, the four steps | `/how-it-works`, which already exists |
| This Isn't Just A Webpage, the technical and SEO detail | `/how-it-works` |
| Booking and Shop detail | A new page, `/booking-and-shop` |
| List Your Event, Free | `/events`, which already exists |
| Become An Agent | `/agents`, which already exists |
| What You Also Get Access To, the three included tools | Split: marketplace to the home page "what you get" block, KatisoBiz Nomads to `/how-it-works`, KatisoBiz to the new home page KatisoBiz block |

Every destination page gets a link back to `/` and to `/pricing`.

### 5. Corrections to make while moving, all of them required

**The fabricated dashboard.** The current page shows a mock dashboard reading
1,247 page views, +18 percent, a Google rating of 4.8 and 42 reviews. There are
zero reviews on the platform. Replace with a real screenshot, or with the
genuine zero state, or remove the panel. Do not invent numbers anywhere on
either page.

**The KatisoBiz R49 promise.** The Growth tier currently says the KatisoBiz R49
plan is included free. Nothing applies that automatically: `growth_client_id`
is null on every account, and signing up separately at katisobiz.co.za creates
a second unconnected account. Reword to something the system can honour, along
the lines of the R49 features being part of a Growth plan and switched on by
us. **Do not write any home page copy implying the two accounts connect
themselves.** Flag this in the report as a product gap, not just a copy fix.

**Marketplace Presence appears in both tier lists**, which makes the Growth
list read as padded rather than better. Remove the duplication.

**Enterprise comes out of the three-column row** and becomes one line of text
with the contact link. Three columns where one cannot be bought makes the
choice harder.

**Plain-language pass on every tier bullet.** Business Profile, Ready To Share
Anywhere, Monthly Digital Asset, Marketing Assets, Monthly Optimisation and
Growth Reporting all need rewriting into something a tradesman can picture.

**Important:** before rewriting each one, check what it actually does in the
live code. Any bullet that does not map to something real must be flagged to
Dewald in the report rather than quietly reworded into something better
sounding. If a promised feature does not exist, we need to know that more than
we need better copy.

---

## Out of scope

- No change to the signup flow, the checkout, the intake wizard or Paystack.
- No change to the ten page templates or anything a member's own page renders.
- No new features. This is a restructure of existing content.
- No change to pricing.
- No touching the Board, KatisoBiz or the marketplace themselves.

---

## The agent decides

- Component structure, file layout and how sections are shared between pages.
- How redirects and canonical tags are implemented.
- Responsive behaviour and where sections stack on a phone.
- The exact plain-language wording of tier bullets, within the rule above.
- Whether a moved section needs a small intro paragraph on its new page so it
  does not start mid-thought.

## Needs Dewald

- Any bullet that turns out not to map to a real feature.
- Final approval of the home page headline and the hero line.
- Whether to keep HelpLift and Standing 365 in the member showcase. Both are
  Dewald's own ventures and the section is headed "real members, real customers
  finding them". Jetting Worx at `/jetting-worx` is a genuine third-party page
  and is the better example.
- Anything that would change what a member is charged or what they are
  promised.

---

## Assets

No new design work is needed. The three existing photographs are reused.

What is needed is three real screenshots, which Dewald can take on his phone:

1. A real member page open on a phone.
2. A member dashboard, either a real one or the zero state.
3. A KatisoBiz quote being built on a phone.

Until those exist, build with placeholders that are visibly placeholders. Do
not substitute a mockup with invented numbers in it.

---

## Acceptance criteria

1. `/` loads a home page. `/pricing` loads a pricing page. Neither is the other.
2. The logo goes to `/`.
3. Nothing that was on the old page has been deleted. Every section is either on
   `/`, on `/pricing`, or on a named destination page, and the report says which.
4. No invented statistic, rating, review count or page view number anywhere.
5. No copy stating or implying that a Growth plan switches KatisoBiz on
   automatically.
6. Enterprise is not a purchasable-looking column.
7. Both pages carry correct canonical tags, correct Open Graph URLs, and are in
   the sitemap.
8. Both pages work on a phone, which is where most visitors are.
9. House style holds throughout: no em dashes, "marketplace" never "directory"
   or "listing", "SARS-ready" never "SARS compliant".

---

## Report back

One report at the end, not progress updates. It should contain:

- Where every section from the old page now lives.
- Every tier bullet that could not be matched to a real feature in the code.
- Anything found while working that contradicts what this document assumes.
- Any place a placeholder is still standing in for a screenshot.
