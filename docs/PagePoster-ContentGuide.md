# The DigitalFlyer page poster: a working guide for content planning

Written for Dewald and his content partner to plan the actual posts
together. This explains how the tool behaves, not the code behind it, so
it can be handed to anyone doing the writing.

---

## What it is, in one paragraph

A scheduler that keeps the DigitalFlyer SA Facebook page posting on its
own, every day, without anyone manually opening Facebook. It never
publishes anything on its own initiative, though. Everything it wants to
post sits in a queue first, and Dewald approves, edits or kills each one
before it goes anywhere. The whole point is that the page stays alive
without becoming a chore, while still being entirely under control.

## The three daily slots

Every day has exactly three fixed moments, chosen to spread across the
times people are actually scrolling:

| Time (South African) | What goes there | Always fills? |
|---|---|---|
| **08:15** | One of our own posts, about a Growth or KatisoBiz feature | Yes, if there's content queued for it |
| **13:30** | A second feature post | Only when there's something extra queued, never forced |
| **20:15** | One post about a member | Yes, following the priority below |

Each time wobbles by a few minutes either side (08:15 might actually post
at 08:12 or 08:19) so it reads as a real person posting, not a script
firing on the exact second.

## The 20:15 member slot: who gets picked, and why

This slot follows a strict priority order, checked fresh every day:

1. **A brand new member**, if one has just gone live and hasn't been
   welcomed yet. Every member gets exactly one of these, once, ever.
2. **A fresh Board offer or listing** a member has posted recently, if
   one exists and hasn't already been reposted.
3. **The next member in the spotlight rotation.** This is fair by
   design: whoever has gone the longest without being featured (or has
   never been featured at all) goes next, chosen at random among equals
   so it can't be gamed or predicted. Nobody is skipped forever, and
   nobody is favourited over anyone else.

The copy for these is generated automatically from the member's own page
(their business name, trade, town, and a line from their own
description), never invented. The tone deliberately keeps DigitalFlyer
small in the post and the member as the actual subject, since the point
is for the member to want to share it themselves.

## The 08:15 / 13:30 slots: this is the part that needs content

These two slots are entirely "our own voice" posts, no member involved.
This is the part Dewald and his content partner need to plan and write
together, since the tool has nothing to say here on its own, it only
has what gets typed in.

### The feature list, right now

Posts in these slots are tagged to one of a fixed set of platform
features, each with its own reusable image:

- **Growth: Events**
- **Growth: Bookings**
- **Growth: Your webpage**
- **Growth: Shop**
- **KatisoBiz: Quotes**
- **KatisoBiz: Invoices**
- **KatisoBiz: Slips**

**This list is a starting point, not the whole picture.** Growth alone
also has testimonials, the social asset generator, page view stats, the
review system, the agent referral programme, the marketplace itself, and
the Board. KatisoBiz has price lists, reports, statements, banking
details, and its own WhatsApp reminders. If the planning session decides
any of these deserve their own recurring feature post, say so and it's a
five-minute code change to add them to the list, nothing structural.

### How a batch of posts actually gets added

There's a box on the admin screen (`/admin/page-poster`) built exactly
for planning a stretch of posts in one sitting rather than one at a
time. One line per post, this shape:

```
feature key | the post text | link (optional)
```

A real example, three posts:

```
growth_bookings | Take bookings straight from your page, no back-and-forth needed. | https://growth.digitalflyersa.co.za/how-it-works
katisobiz_slips | Snap a slip, done. Expenses recorded in seconds, no shoebox required. |
growth_shop | Sell straight from your own page. Set it up once, customers order any time. | https://growth.digitalflyersa.co.za/shop
```

- The **feature key** must match one of the keys above exactly (e.g.
  `growth_bookings`, not "Bookings" or "growth bookings"). Leave it
  blank for a general post with no specific feature.
- The **text** is exactly what gets posted, so it should already be in
  final house style: no em dashes, South African English, Rand where
  money's mentioned, no invented statistics or claims.
- The **link** is optional, leave the space after the last `|` empty if
  there isn't one.
- A line starting with `#` is ignored, useful for leaving a note or a
  section heading while drafting without it becoming a post.

Paste in ten, twenty, however many lines at once. They queue up and get
picked one at a time, oldest-unused first, into whichever of the two
slots needs filling that day. Once every post in the batch has had a
turn, it starts again from the top, so nothing needs re-adding, it just
needs topping up occasionally with fresh material.

### Images

One image per **feature**, not per post. Upload it once on the same
admin screen and every post tagged with that feature automatically
carries it. A screenshot of the actual feature in use, or a simple
branded graphic, both work, whatever represents it best.

## The approval step, always

Nothing above ever posts on its own. Everything lands on
`/admin/page-poster` first, editable right there before approving, or
killable outright. An unapproved post past its scheduled time is simply
skipped, not delayed into a backlog.

## What to actually plan, together

The useful next conversation isn't really about the tool, it's about
content: which features genuinely deserve their own recurring post,
what the CTA line for each one should say, whether the current seven are
the right seven or need trimming or expanding, and how many posts to
draft in the first batch. The tool will do the posting reliably once
that's decided, it has no opinion of its own about what to say.
