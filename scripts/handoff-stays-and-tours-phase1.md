# Handoff: Stays and Tours, phase 1

**For Claude Code. Written 6 August 2026.**

**Queued. Dewald activates this when he is ready. Do not infer any position in
the queue from this document.**

---

## Context

A new Growth member runs a guesthouse and a tour company from one brand. He is
the first of a segment worth building for, since guesthouses know other
guesthouses, and the current alternative for him is paying commission on every
booking to a large platform.

Nothing here is bespoke to him. Every part of it must work for any guesthouse or
tour operator that joins later.

**What exists today and why it does not fit.** Growth's Booking module is
slot-based with hours and buffers, built for appointments, not for date ranges
across a room inventory. Growth's Events module is a free community board with
open submissions from non-members, which is the wrong home for a commercial tour
with seats and money attached.

**Naming.** This module is **Stays and Tours**. Do not call it Bookings. That
name is already taken by the appointment module and the collision would be
permanent. This is the fourth naming decision in this portfolio after BizUp,
RE:Biz and the R89 plan, so treat it as settled and use it consistently in
tables, routes and interface copy.

## Goal

A guest picks dates, sees what is actually available with real rates, books and
pays a deposit, all without the member being asked anything. The member's
calendar is owned by the system. He manages room types, rates, tours and terms
himself.

---

## Job 1: room types, not rooms

**Model room types, never individual rooms.** A guesthouse has four Standard
Doubles and one Family Room. It does not have Room 3 and Room 4 in software.

Each room type has: name, description, photos, maximum adults, maximum children,
how many of them exist, and a rate per night.

Availability is arithmetic. Four Standard Doubles, two booked on those dates,
two shown as available.

Which physical room a guest gets is the member's decision on the day, in his
head, as it has always been. **Do not build room assignment and do not build
moving a guest between rooms.** Both require individual rooms and bring every
hard problem in hotel software with them for no benefit at this size.

**Rates in phase 1 are one rate per room type per night.** Not per person, not
seasonal, not weekend loading, no minimum-night rules. Those are phase 2 and are
listed as out of scope below.

## Job 2: search and availability

The guest enters check-in date, check-out date, number of adults and number of
children.

- Only room types that physically fit the party are shown. A party of two adults
  and two children never sees a room type with a maximum of two.
- Only room types with at least one unbooked unit across the whole date range
  are shown.
- Show the nightly rate and the total for the stay before the guest commits.
- If nothing is available, say so plainly and offer nothing false. No fake
  alternatives, no "similar dates" guessing in phase 1.

## Job 3: the hold

Between the guest choosing to pay and the payment confirming, that room unit is
held so nobody else can take it.

- Hold length **5 minutes**.
- **Release must be a scheduled job, not something that runs when a page is next
  loaded.** A room held by an abandoned checkout at 11pm must be free again at
  11:05pm, not at 8am when somebody visits the site.
- A completed payment converts the hold into a booking. A failed or abandoned
  payment releases it.

## Job 4: money

**The member's own Paystack account. Money never passes through DigitalFlyer.**

- Deposit is taken at booking. The member sets the deposit as a percentage or a
  fixed amount per room type.
- The balance is tracked in KatisoBiz, using the existing part-payment and
  balance-owing mechanism, which already works and must not be rebuilt.
- The member sets how many days before arrival the balance is due.
- The existing KatisoBiz payment reminder is used for the balance. **Member
  sends it themselves. Never automatic.**
- The existing review request fires when the booking is fully settled.

## Job 5: amenities

Two levels, both managed by the member as tick boxes, both shown as icons on the
page.

- **Property level:** pool, parking, WiFi, breakfast, pet friendly, and similar.
- **Room type level:** ensuite, bath, shower, aircon, kitchenette, and similar.

Store these as structured data, not free text, even though phase 1 only displays
them. They become marketplace filters later and the data has to exist first.

Propose the starting list in the report for Dewald to approve or extend.

## Job 6: tours

**Reuse the Events display components. Do not reuse the Events tables, routes or
rules.** Tours are commercial, seated and paid. Events are free, public and open
to non-member submission. Sharing a container would put a paid tour on a surface
anyone can post to.

Each tour has: title, description, itinerary, photos, a date, a departure time,
a price, a seat count, and a deposit setting.

- Each tour gets **its own indexable page** carrying the itinerary and photos.
  This is what Google finds and what the member shares.
- Seats remaining is shown and decrements on booking.
- At zero seats the page shows fully booked and collects names and contact
  details for the next date. That list is visible to the member in his
  dashboard.
- Tours appear on the member's page as a compact row of cards, not full
  descriptions. The detail lives on the tour's own page.

Booking a tour follows the same hold, deposit and balance flow as a stay.

## Job 7: guest messaging

Guests message the member through **Growth Chat**, the existing chat already used
between the public and members on the Board. Not WhatsApp, not the Meta API,
nothing for the member to set up.

- The link is offered **after booking**, on the confirmation, not before payment.
- The member receives an email notification and replies inside Growth.
- The conversation is attached to the booking so the history sits with it.

**Guest details are personal information belonging to non-members.** The same
standing rules apply: never store what is not needed, personal information never
appears in a page an unauthenticated request can fetch, and the retention policy
for these conversations is written in this sprint, not afterwards.

## Job 8: cancellation and blocking

- The member writes his own cancellation terms as free text. Shown at booking
  and repeated on the confirmation.
- Cancelling a booking records status, reason, and whether a refund was given,
  and **releases the dates back into availability immediately**.
- **The system never moves money.** Any refund is made by the member in his own
  Paystack. Your system records that it happened and nothing more.
- The member can block dates on any room type, for anything sold elsewhere or
  for maintenance. Blocked dates behave exactly like booked dates in search.

## Job 9: the member's dashboard

One place, built for someone checking a phone in a garden:

- Arrivals and departures for the coming days
- All bookings, filterable, stays and tours together
- Balances outstanding
- Manage room types, rates, deposits, amenities, terms
- Create and manage tours
- Block dates
- The waiting list for fully booked tours

## Job 10: the page

**Do not build a long scrolling page.** Two clean sections.

- **Stay with us.** Photos, a short description, property amenities, and the
  date and guest picker. **Room types appear only after dates are chosen.**
- **Explore with us.** A compact row of tour cards, each linking to its own
  page.

Everything long lives one click away.

---

## Out of scope, phase 1

These are real and they are phase 2. Do not build them and do not leave
half-built hooks for them.

- iCal sync with external platforms
- Seasonal rates, weekend loading, per-person rates, minimum-night rules
- Individual room assignment or moving guests between rooms
- Showing a guest the tours running during their booked stay, the cross-sell
- Marketplace filtering by amenity
- Any refund processing
- Channel management of any kind

Also out of scope: the Board, the WhatsApp inbox, jobs, Growth's existing
Booking module, and payment provider configuration.

## What you decide, and what needs Dewald

**Decide yourself:** schema, routes, how holds and their release are
implemented, dashboard layout, how availability is calculated, and how the tour
waiting list is stored.

**Stop and ask Dewald:** the starting amenity lists, the default deposit
percentage, all guest-facing copy, and the retention period for guest chat
records.

**Never without Dewald:** deleting files, force pushing, secrets or environment
variables, Vercel settings, production data, payment credentials.

Three minute rule applies. Carry on with what you can and raise it in the
report.

## Acceptance criteria

1. A room type with a maximum of two adults never appears for a party of three
2. A room type with all units booked across any night in the range never appears
   for that range
3. The nightly rate and the stay total are shown before the guest commits
4. A held room cannot be booked by a second guest during the hold
5. **An abandoned checkout releases its hold within 5 minutes without any page
   being loaded**, verified by leaving one and waiting
6. A completed deposit payment creates a booking and reduces availability
7. The deposit lands in the member's own Paystack account, and no money passes
   through DigitalFlyer at any point
8. The balance appears in KatisoBiz with the correct amount owing
9. Blocked dates behave identically to booked dates in search
10. Cancelling a booking releases the dates immediately and records status,
    reason and refund state
11. No refund is ever processed by the system
12. A tour page is indexable, shows seats remaining, and decrements on booking
13. A fully booked tour collects waiting list entries visible to the member
14. Guest chat is reachable only after booking, notifies by email, and is
    attached to the booking
15. The member can change every rate, room type, amenity, tour and term himself
    with no admin involvement
16. Room types are not visible on the page before dates are chosen
17. Nothing listed under Out of scope exists, including partially

---

## Close-out, required on every sprint from now on

The codebase is growing faster than its documentation and confusion is already
appearing between sessions. Finishing a sprint now includes leaving the repo in
a state the next session can trust.

**Before reporting back:**

1. **Update the repo house rules file.** If it does not exist, create it at the
   repo root as `HOUSE-RULES.md`. It holds: the naming decisions and which names
   are retired, the standing rules (no fabricated social proof, no credentials
   stored, personal information never in an unauthenticated page, member sends
   their own messages, the system never moves money), the terminology rules
   (marketplace never directory, SARS-ready never SARS compliant, no em dashes),
   and a short map of what each module is and is not. Add to it every sprint.
   Never let it contradict the code.
2. **Delete what the sprint made dead.** Superseded files, unused routes,
   scrapped folders, commented-out blocks. **List every deletion in the report
   and delete nothing that is ambiguous.** Ambiguous items get listed for Dewald
   instead.
3. **Report anything found that is stale, contradictory or unsafe**, whether or
   not it was in scope. Findings are more valuable than fixes here.
4. **Flag any query that will get slow at scale**, particularly anything
   unindexed that runs on a public page. Say what you found even if you did not
   change it.

## How to report back

One report at the end. Cover:

1. What changed, by file, in plain language
2. The Vercel preview URL
3. How availability is calculated, and how you tested a fully booked range
4. How the hold release runs, and proof it fires without a page load
5. All guest-facing copy, quoted in full, for approval
6. The proposed amenity lists
7. The guest chat retention policy you wrote, and what it deletes and when
8. What you added to `HOUSE-RULES.md`
9. Everything deleted, and everything ambiguous left for Dewald
10. Any query likely to get slow at scale
11. Anything found and deliberately not fixed, and why
12. Anything in this brief that turned out to be wrong about how the code
    actually works
