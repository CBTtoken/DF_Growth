# Stays and Tours, phase 1: what was built

**Sprint report. 8 August 2026.**
**Handoff:** `scripts/handoff-stays-and-tours-phase1.md`
**Branch:** `stays-and-tours-phase1`

---

## 1. What changed, by file

### The database

`supabase/migrations/20260812100000_stays_and_tours.sql`, applied live and
verified. Seven tables and three functions.

| Table | What it holds |
|---|---|
| `stays_properties` | One row per member. The on/off switch, the intro, property amenities, check in and out times, how many days before arrival the balance falls due, and the member's own cancellation terms. `growth_client_id` is the primary key, a real one-to-one. |
| `stays_room_types` | Room TYPES, never rooms. Name, description, who fits, how many of them exist, one rate a night, the deposit rule, room amenities and which of the member's photos belong to it. |
| `stays_bookings` | A booking or a five minute hold. Dates half open, frozen rate, guest details, payment state, an unguessable guest token, the KatisoBiz invoice, the chat thread, and the cancellation record. |
| `stays_blocks` | Nights nobody may book. Counted inclusive of both nights, because that is what a person means by "the 5th to the 7th". |
| `tours` | A trip, with its own slug for its own indexable page. |
| `tours_bookings` | Seats on a trip, same shape as a stay. |
| `tours_waitlist` | Names collected when a trip is full. |

Three functions carry the logic that must never be reimplemented in
TypeScript:

- `stays_units_taken(room_type, check_in, check_out)` counts bookings and
  blocks in one sum and returns the worst night in the range.
- `stays_create_hold(...)` and `tours_create_hold(...)` do the availability
  check and the insert inside one transaction that has already row-locked
  the room type or the tour.

RLS on all seven, scoped through `growth_members` the same way every other
tenant table is. One anonymous read policy, on published `tours` only:
everything else holds guests' names, emails and phone numbers.

### The library

| File | What it does |
|---|---|
| `src/lib/stays/amenities.ts` | The two amenity lists, as slugs with labels. |
| `src/lib/stays/types.ts` | Shared shapes. |
| `src/lib/stays/money.ts` | Rand formatting, deposit maths, nights, dates. |
| `src/lib/stays/queries.ts` | The owner lookup, room types, tours, and `searchAvailability`. |
| `src/lib/stays/expire-holds.ts` | The sweep, and `HOLD_MINUTES = 5`. |
| `src/lib/stays/confirm.ts` | Turning a paid hold into a booking, including the late-payment clash case. |
| `src/lib/stays/katisobiz.ts` | The balance as an ordinary KatisoBiz invoice with the deposit as an ordinary part payment. |
| `src/lib/stays/notify.ts` | The two emails a booking sends. |
| `src/lib/stays/retention.ts` | The guest chat retention policy, written out and implemented. |
| `src/lib/stays/copy.ts` | Every word a guest reads, in one file, so it can be approved in one place. |
| `src/lib/schemas/stays.ts` | Zod for both audiences. |

### What a guest sees

| Route | What it is |
|---|---|
| `/[clientSlug]` | Two new sections: **Stay with us** (photos, intro, amenities, date picker) and **Explore with us** (a compact row of tour cards). Room types deliberately absent until dates are chosen. |
| `/[clientSlug]/stay` | The search result. Noindex, never cached: one visitor's own answer to one question. |
| `/[clientSlug]/tours/[tourSlug]` | A tour's own indexable page, with its own title, description, canonical and share image. In the sitemap. |
| `/[clientSlug]/confirmation/[token]` | The guest's own booking, behind a 48 character token, noindex, never cached. Guest chat lives here and nowhere else. |

Components under `src/components/stays/`: `StaySection`, `ToursSection`,
`DatePicker`, `RoomResultCard`, `TourBookingForm`, `GuestChat`,
`AmenityRow`.

### What the member sees

`/dashboard/stays`, its own route rather than a seventh tab, reached from a
card in the Selling tab. Six named sections with one open at a time:

1. **Coming up** — arrivals, departures and trips for the next fortnight, grouped by day, with what is owed
2. **Bookings** — everything, stays and tours together, filtered by Coming, Money owing, Been and gone, Cancelled
3. **Rooms and rates** — room types, prices, deposits, amenities, photos
4. **Tours** — trips, seats sold, and the waiting list under each one
5. **Blocked dates** — nights nobody may book
6. **Your details** — amenities, check in times, balance due days, cancellation terms

Server actions in `src/app/dashboard/stays/actions.ts`. Every one starts
from the member's own session and every write is scoped to their own
`growth_client_id` as well as the row id, because an id in a form field is
a value a browser sent.

### Elsewhere

- `vercel.json` — a third cron entry, `/api/cron/expire-stay-holds`, every minute
- `src/app/api/cron/daily/route.ts` — guest chat retention added to the daily run
- `src/app/api/cron/board-cleanup/route.ts` — now skips threads attached to a booking
- `src/app/sitemap.ts` — every published, still-upcoming tour
- `src/app/faq/page.tsx` — a Stays and Tours category, twelve questions
- `src/app/guide/page.tsx` — "Rooms, nights and trips", nine tasks
- `src/components/landing/ClientLandingPageView.tsx` — one new optional prop

---

## 2. The preview URL

Not deployed at the time of writing. Everything below was verified against
the live database and a local production-mode run. See section 12.

---

## 3. How availability is calculated

Two rules, both acceptance criteria.

**Only rooms that physically fit.** A party of two adults and two children
never sees a room type with a maximum of two. Filtered in the query
(`max_adults >= adults`, `max_children >= children`) and checked again in
the hold action, because search runs on a URL anybody can edit.

**Only rooms free on every night.** Not free on average, not free at the
start. For each night in the range, the units taken are bookings plus
blocks; the room's availability across the range is its count minus the
worst night. A room type with four units, three booked on Tuesday and one
on Wednesday, has one free, not three.

Blocked nights are counted in the same sum as booked ones, because to
somebody searching, a room being painted and a room being slept in are the
same thing.

An expired hold counts for nothing whether or not the sweep has run.

**How a fully booked range was tested.** On a throwaway member with a room
type of two units:

| Test | Result |
|---|---|
| Empty range | 0 taken |
| One confirmed booking over two of three nights | 1 taken |
| Plus a block of one unit on the middle night | 2 taken, which is full |
| Holding across that middle night | refused, `not_available` |
| Holding a range that avoids it | granted |
| A live hold | 1 taken |
| The same hold, expired | 0 taken |
| Cancelling the booking | back to 1, the block only |

Then through the real interface: a three night search spanning a night with
both units blocked returned "Nothing is free for those dates", and a search
for three adults against a two adult room returned the same. No invented
alternatives, no "similar dates" guessing.

---

## 4. How the hold release runs, and the proof

Five minutes, and released by a scheduled job rather than a page load. That
distinction is the whole of handoff Job 3: the existing appointment Booking
module releases its holds inside the read path, which works for a business
whose page is looked at all day and fails completely for a guesthouse whose
page nobody opens between eleven at night and eight in the morning.

`/api/cron/expire-stay-holds` has its own entry in `vercel.json` at
`* * * * *`, rather than a slot in the 6am daily run. Two indexed updates
that usually touch nothing.

**Proof it fires without a page load.** A hold was created, its expiry
pushed into the past, and the cron endpoint called directly with the cron
secret and no page open anywhere:

```
{"ran":true,"stays":1,"tours":0}
```

The row flipped from `held` to `expired`. The same endpoint without the
secret returns 401.

Belt and braces: availability ignores an expired hold on sight, in SQL and
in TypeScript, so correctness never depends on the sweep's timing. The
sweep exists so the dashboard and the tables tell the truth without a
reader having to know that rule.

---

## 5. All guest-facing copy, for approval

Every word lives in `src/lib/stays/copy.ts`. In full:

### Stay with us

- Section heading: **Stay with us**
- Above the picker: **Choose your dates and we will show you what is free.**
- Fields: **Check in**, **Check out**, **Adults**, **Children**
- Button: **See what is available**

### The results page

- Heading: **What is available**
- Line under it: *"2 nights, Sun, 20 September 2026 to Tue, 22 September 2026."*
- Fold: **Change your dates**
- Nothing free: **Nothing is free for those dates** / *"We have no rooms open for the dates and party size you chose. Try different dates, or send us a message and we will tell you what else we can do."*
- Per room: **per night**, **Total for your stay**, **Pay now to secure it**, *"The rest is due 7 days before you arrive."*, **Only one left** / **3 left**
- Buttons: **Book this room**, then **Pay the deposit, R500** or **Request this room** when the member has no gateway
- Under the button: **We hold this room for five minutes while you pay.**
- Form: **Your details**, **Your name**, **Email address**, **Phone number**, **Cancellation**

### The confirmation

- Paid: **You are booked** / *"Thank you. Mila's Place has your deposit and your dates are held in your name."*
- Unpaid: **We have your booking** / *"Thank you. Mila's Place has your booking and will contact you on 082 000 0000 to arrange payment."*
- Cancelled: **This booking was cancelled** / *"Mila's Place cancelled this booking. If that is not what you expected, please contact them."*
- Rows: **What**, **When**, **Good to know**, **Total**, **Deposit paid**, **Still to pay**

### Guest chat

- **Message the owner**
- *"Anything you need before you arrive, ask here. They get an email and reply in the same place."*
- Placeholder: *"Ask about arrival times, directions, breakfast, anything"*
- Sent: *"Sent. They will get an email and reply here."*

### Explore with us

- Section heading: **Explore with us** / *"Trips we run ourselves."*
- Card: **R950 per person**, **One seat left** / **4 seats left** / **Fully booked**
- Tour page: **Departs**, **How long**, **Meeting point**, **What we do**, **The plan for the day**
- Booking: **How many seats**, **Book your seats**
- Full: **Fully booked** / *"This trip is full. Leave your name and we will let you know as soon as we set the next date."* / button **Tell me about the next one** / after: *"Thank you. We will be in touch when the next date is set."*

### Errors

- *"We could not confirm you are a person. Please reload the page and try again."*
- *"Too many attempts, please wait a few minutes and try again."*
- *"Somebody just took the last one for those dates. Please try other dates."*
- *"There are not that many seats left. Please try fewer."*
- *"That is no longer available."*
- *"Leave an email address or a phone number so we can reach you."*

---

## 6. The proposed amenity lists

For approval or extension. Adding to either is one line in
`src/lib/stays/amenities.ts`.

**Property level, 18:** Free WiFi, Free parking, Secure parking, Breakfast,
Swimming pool, Garden, Braai area, Guest kitchen, Guest lounge, Outdoor
dining, Laundry, Pet friendly, Family friendly, Non smoking, Wheelchair
access, Airport shuttle, Backup power, Self check in.

**Room level, 16:** En-suite bathroom, Shared bathroom, Bath, Shower, Air
conditioning, Fan, Heater, Kitchenette, Fridge, Tea and coffee, TV, Desk,
Safe, Private entrance, Patio or balcony, Sleeper couch.

Stored as slugs rather than free text even though phase 1 only displays
them, because they become marketplace filters later and free text would
give us "Wi-Fi", "wifi" and "Free Wifi" as three different amenities that
no filter could ever be built on.

---

## 7. The guest chat retention policy

Written in `src/lib/stays/retention.ts` and implemented, not left as an
intention.

**A guest conversation attached to a booking is kept until 90 days after
the guest leaves, or 90 days after the trip runs, and is then deleted in
full: every message and the thread itself. The booking keeps its own
record; only the conversation goes.**

Ninety days covers the stay and the short period afterwards where a
question actually still comes up: a charger left behind, a disputed
balance, a review that needs answering. After that it is a non-member's
name, email address and phone number sitting in a table nobody is asking to
look at again.

**This uncovered a real conflict, now fixed.** The Board's own ten day
clear-out deletes every `board_messages` row older than ten days, and guest
chat runs on the Board's tables. A guest booking in June for December would
have written in June and had the arrival time, the dietary request and the
"we are bringing a cot" deleted in July, five months before the stay. The
Board's cleanup now skips threads attached to a booking, and those threads
are deleted by this policy instead.

**The ninety day figure is the one thing here that is a judgement call
rather than a consequence. It needs your approval.** It is a single
constant, `CHAT_RETENTION_DAYS_AFTER_DEPARTURE`.

---

## 8. What went into HOUSE-RULES.md

The Stays and Tours naming row was corrected: the module is built, the
handoff is in git, and Stays and Tours copy never says "reservation",
"inventory" or "unit".

A new section with six standing rules: model room types never rooms; a hold
is released by a scheduled job never by a page load; a room with no rate is
never offered; room types are not visible before dates are chosen; a
booking never renames a person; tours reuse the Events card shape and none
of its tables, routes or rules. Plus the note that the balance goes into
KatisoBiz's existing part-payment machinery and nothing chases it.

---

## 9. Everything deleted, and everything left for you

**Deleted:** nothing that existed before this sprint.

**Test data created and then removed in full:** one throwaway
`growth_clients` row (`zz-stays-test`) with its landing page, property, room
type, two bookings, two blocks, one tour, one tour booking, one waiting
list entry, one chat thread and its message, one `growth_members` row, one
Supabase Auth user, and a temporary `zz_stays_test_results` table. All
verified gone.

**One thing I changed that was not mine, and why.** The test booking used
`info@digitalflyer.co.za` as the guest's email. `resolveVisitor` keys a
board identity on email and overwrites its display name, so it renamed your
existing board identity (two published Board posts against it) to "Sprint
Test Guest". I restored it to **"Dewald"**. If it was something else, one
line fixes it:

```sql
update board_identities
set display_name = 'WHATEVER IT WAS'
where id = '5e0e8bed-0921-400a-a97b-cd5e3c810825';
```

That is also the bug in section 11.

**Left for you, nothing deleted:** there is a second `growth_clients` row
for Mila's Place, `milas-place`, status `pending_intake`, plan
`foundation`, same email as the live one. It looks like a duplicate signup.
I have not touched it. Deleting a row of your data is your call.

---

## 10. Queries likely to get slow at scale

- **`searchAvailability`** fetches every booking and block overlapping the
  searched range and folds them per night in memory. Bounded by the range
  rather than by the member's history, so it stays small no matter how long
  they have been trading. It would want moving into SQL only if a member
  ever had hundreds of room types.
- **`bookingChatThreadIds`** loads every chat thread id attached to a
  booking on each daily Board cleanup. Small per member and modest across
  the platform today. Worth becoming a `not exists` in SQL before it is
  thousands. Flagged, not pre-optimised.
- **`withSeats`** counts seats for a whole list of tours in one query
  rather than one per tour, so the row of cards on a member's page is not
  an N+1.
- Every table has the indexes its own queries need, including partial
  indexes on the two hold sweeps so the every-minute cron reads almost
  nothing.

---

## 11. Found, and deliberately not fixed

- **`resolveVisitor` renames people.** Fixed inside Stays and Tours with
  its own `guestIdentity` helper. NOT fixed on the Board itself, where the
  behaviour is correct: there, the person typing the name is the person it
  belongs to. Worth knowing that any future feature reusing board
  identities from a form somebody else filled in has the same trap waiting.
- **`MODULES.md` said the Stays and Tours handoff was "not in git".** It
  is, and has been. Corrected.
- **`src/lib/booking/expire-stale-holds.ts` cites
  `src/app/api/cron/expire-booking-holds/route.ts`**, which does not exist.
  The appointment module's periodic sweep was never built, or was removed;
  its comment still describes it as "pure hygiene on top". Left alone,
  because that module books straight to confirmed today so nothing depends
  on it, but the comment is now describing a file that is not there.
- **`.gitignore` has an uncommitted change** adding `.vercel` and `.env*`.
  Not mine, not committed.

---

## 12. Where the brief was wrong about the code

Two places, both small.

**"Guests message the member through Growth Chat, the existing chat already
used between the public and members on the Board."** True, and the tables
are `board_threads` and `board_messages`. What the brief could not know is
that the Board runs a ten day clear-out over those same tables, which would
have quietly deleted booking conversations. Section 7 covers the fix.

**"The balance is tracked in KatisoBiz, using the existing part-payment and
balance-owing mechanism."** Also true, and it works. What it assumes is
that the member has a KatisoBiz account. Most Growth members do not, and
Mila's Place does not. So raising the invoice is best effort: no account
means no invoice, silently and correctly, and the balance is still shown in
the Stays and Tours dashboard either way.

---

## 13. Mila's Place

His page was rebuilt on this module in the same sprint.

**Done:**

- Thirteen of his own photographs uploaded and ordered, the view over the
  park to the Helderberg set as his hero. This replaced a stock Pexels image
  that had been standing in as his link preview, which meant a share of his
  page was showing a photograph of somebody else's guesthouse.
- Page copy rewritten from his own words: headline, subheadline, about,
  what he offers, and the story.
- **His three house rules are now on the page, before booking rather than
  after**: no smoking or alcohol, only married couples share a room, and
  Saturday check in between 19:00 and 21:00. They are the reason a
  particular kind of guest chooses him, and finding them after paying would
  be the wrong way round.
- Industry corrected from **House Sitting & Property Maintenance** to
  **Guest Houses & B&Bs**, which was making his own page title and his
  marketplace card wrong.
- Property record created with ten amenities, balance due seven days
  before arrival.
- Three room types created from his own description: a room with its own
  bathroom (two of these), a room with a shared bathroom (two of these),
  and the family room.

**Deliberately not done: the module is switched OFF for him.** A date
picker over rooms with no prices answers every search with "nothing
available", which is worse than not being there. It becomes one tap the
moment his rates arrive.

**What I need from him, and it is a short list:**

1. **A price per night for each of the three rooms.** Nothing is bookable
   without it, and it is the only blocker.
2. **The room count.** His description says four bedrooms, two en-suite and
   two sharing, and separately describes a family room. I have set up two
   plus two plus one, which is five. Is the family room one of the four?
3. **His cancellation terms**, in his own words.
4. **Check in and check out times**, other than the Saturday rule which is
   already on the page.
5. **What deposit he wants**, as a share or a fixed amount. The default is
   half.
6. **Tours.** The Kombi in his photographs says he runs them. Titles,
   dates, prices and seats, and each one gets its own page.
7. **Whether he wants to take deposits by card.** He has no gateway
   connected, so today a booking reaches him as a request and he arranges
   payment himself. That works, but it is the difference between a booking
   and a promise.

---

## 14. Two emails you will have received

Testing the booking flow sends real email, and the one address I could send
to without inventing a recipient was your own. You should have two, both
from a booking on the throwaway test member, both since deleted:

- the owner notification, "New booking: Sprint Test Guest"
- the guest confirmation, "ZZ Stays Test has your booking"

They are worth two minutes of your time: that is exactly what a guesthouse
owner and their guest will see.
