# Handoff: the DigitalFlyer page poster

**For Claude Code. Written 4 August 2026. Not to be started until the current
templates, shop and blog sprint is finished.**

---

## Context

DigitalFlyer's own Facebook page has roughly 15,700 followers and organic reach
below five percent, so a post reaches around 780 people. That is the honest
starting position and it is not the point of this build.

The point is that members share their own spotlight. A hundred members each
sharing a post about their own business is real distribution, and it costs
nothing. Reach on our page is the seed, not the mechanism.

Two things are settled before you start.

**Facebook Groups cannot be posted to by any application.** Meta deprecated the
Groups API in April 2024 and removed the publishing permissions from every
version. This is true even for a group we own. Do not build a group path, do
not build a browser-extension workaround, and do not hold anyone's login
credentials.

**This build posts only to the DigitalFlyer SA page.** It does not post to
member pages. Members will get a tool in their own dashboard later, which they
drive themselves. That is a separate build and it is not this one.

## Goal

A scheduler that keeps the DigitalFlyer page alive on its own, publishing
member spotlights, new member announcements and our own posts at sensible
intervals through the day and week, with Dewald approving a queue rather than
writing posts.

---

## What to build

### 1. The Meta connection

- Publish to the DigitalFlyer SA page through the Graph API using a Page access
  token derived from a long-lived user token, so it does not expire.
- Support text, link and photo posts. Video and Reels are out of scope for this
  build but do not design in a way that makes them hard to add.
- Always specify an API version explicitly in calls. Unversioned calls default
  to the oldest available version.
- Respect rate limits, which are formula-based per app and per Page.

**Two things to establish before building, and to report:**

1. Whether posting only to a page we own, from an app we own, requires App
   Review and Business Verification, or whether Standard Access with our own
   Page token is sufficient. Advanced Access exists for acting on other
   people's pages. If our case needs no review, say so plainly, because it
   changes the timeline.
2. Whether a post published through the API can tag or mention another Facebook
   page. This matters: a spotlight that tags the member's own page is worth
   considerably more than one that does not. If it is not possible, say so and
   we will design around it.

### 2. Post types

Four, drawn from data we already hold.

| Type | Trigger | Content |
|---|---|---|
| **New member** | A Growth page is published for the first time | Business name, trade, town, one line about what they do, one of their own job photos, link to their page |
| **Member spotlight** | Rotation, see below | Same shape, for a member already live |
| **Board highlight** | A member posts a Special or Offer, once the Board is public | The post, its photo and price, link to the post's own page |
| **Evergreen** | Fills gaps in the schedule | Our own written posts, supplied as a content file, no member data |

**The writing rule for spotlights and new member posts: the member is the hero
and DigitalFlyer is small in it.** These posts exist to be shared by the member.
The moment one reads as a DigitalFlyer advert with a member attached, nobody
shares it and the build has failed. See `/jetting-worx` and `/molotsi-plumbers`
announcements for the tone already established.

**Never write "verified".** No verification mechanism exists and there is no
badge. Any KatisoBiz mention stays factual, for example that they quote and
invoice from a phone. Never make a claim about the quality or reliability of a
member's service, because we cannot stand behind it.

### 3. Rotation, which is the part to get right

Spotlight selection follows the ranking doctrine already used elsewhere in the
portfolio: rotate among everyone eligible rather than concentrating on the
best-performing members. A member who can never be featured has no reason to
stay.

- Every active member with a published page and at least one photo is eligible.
- Nobody is featured twice until everybody eligible has been featured once.
- Enforced shuffle within the eligible set, the same pattern as the description
  generator.
- No scoring, no ranking by engagement, no paid placement, ever.

### 4. Scheduling

- A target number of posts per day and per week, configurable.
- Spread across the day with jitter rather than fixed clock times, so it does
  not look automated. Not truly random: no posts overnight, and a minimum gap
  between posts.
- Morning and evening slots behave differently. Evening carries the longer
  posts, morning the short ones. The existing 14 day content calendar is
  written to this pattern and should be importable as evergreen content.

### 5. The approval gate

- The queue generates at least a week ahead.
- Dewald sees the queue in the dashboard and can approve, edit or kill any item.
- Nothing publishes without approval on this first version.
- An item that is not approved by its scheduled time is skipped, not delayed
  into a pile-up.

### 6. Telling the member

**This is not optional and it is half the value of the build.** When a spotlight
or new member post publishes, the member is notified with the post link and a
short line asking them to share it. In-app notification at minimum. If a
WhatsApp path exists by then, use it.

A spotlight that the member never sees is a post to 780 people. A spotlight the
member shares is the whole point.

---

## Out of scope

- Posting to Facebook groups. Not possible.
- Posting to member pages on their behalf.
- Instagram, Google Business Profile, LinkedIn.
- Image generation. Posts use photos members already uploaded.
- Video and Reels.
- Any change to member pages, the marketplace, the Board or KatisoBiz.

---

## The agent decides

- Data model for the queue, scheduling implementation and how jitter is applied.
- How post copy is generated, and whether from templates or a model call.
- Dashboard layout for the approval queue.
- How the eligible set and the shuffle are stored so rotation survives a restart.
- Retry behaviour when Meta rejects or rate-limits a post.

## Needs Dewald

- Final wording of the evergreen content file.
- The target posting frequency.
- Approval of the first ten queued posts before anything publishes.
- Any decision that would put a claim about a member in a post.

---

## Acceptance criteria

1. A post publishes to the DigitalFlyer SA page from the scheduler, unattended,
   at a scheduled time.
2. Rotation demonstrably cycles through all eligible members before repeating.
3. Nothing publishes without approval.
4. A member is notified when their spotlight goes up, with the link.
5. No post contains the word "verified", an invented statistic, a review count,
   or a claim about a member's service quality.
6. Token expiry does not silently stop the scheduler. A failure is visible.
7. House style holds: no em dashes, "marketplace" never "directory" or
   "listing", Rand, South African English.

---

## Report back

One report at the end. It must answer:

- Whether App Review was needed for our own page, and if so what state it is in.
- Whether page tagging in API posts is possible.
- What happens when the token expires and how we find out.
- Anything found in the code that contradicts what this document assumes.
