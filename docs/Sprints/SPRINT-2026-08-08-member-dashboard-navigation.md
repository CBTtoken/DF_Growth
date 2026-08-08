# Sprint handoff: The member dashboard, on a phone

**Written 8 August 2026 by the session that finished the two-doors sprint,
straight after Dewald walked the real flow on a phone and reported what he
found. Not started.**

Mark progress at the top of this file as you go, per the Sprints folder
convention.

---

## Why this sprint exists

Dewald, 8 August 2026, three observations that are really one problem:

> "The edit your page section, it is 1 looooooongggg scrolling page, can we
> not make it easier and better looking, menu driven, or page sections,
> something that make logical sense like they can see and feel what they
> adding on their page?"

> "Your page and Edit your page, is a bit confusing to have them in two
> separate places or even have to menu options?"

> "Remember our users will be mostly on a phone, so we need to think about
> easy layout, easy structure and clearly what they busy with, navigation
> is key here."

The dashboard grew by accretion. Nobody has sat down and designed it as one
thing, and it now has two doors into the same data with no clear reason.

## The finding that makes this smaller than it looks

**`/dashboard/edit` is not a different form. It is the onboarding wizard's
own step components stacked vertically on one page.**
`src/components/dashboard/EditPageClient.tsx` imports and renders
`Step1BusinessInfo`, `Step2BusinessProfile`, `Step3BrandKit`,
`Step5LandingCopy` and `Step6Packages` one after another.

This matters for two reasons.

First, it corrects the brief. Dewald thought the backoffice form was better
built than the onboarding steps, with nicer dropdowns for things like town.
It is literally the same components, so anything true of one is true of the
other. What differs is presentation: the wizard shows one step at a time
with a progress bar, the edit page shows all five at once.

Second, it means this sprint is mostly navigation, not forms. The fields,
validation, dropdowns and Server Actions all already work and are already
shared. Do not rebuild them. Give the edit page the same one-thing-at-a-time
shape the wizard already has, and the long scroll problem goes away without
touching a single input.

## What exists today

- `/dashboard` renders `DashboardTabs` with tabs: Overview, Your Page,
  Reviews, Marketing, Account, and Booking & Shop for Growth and above.
- `/dashboard/edit` is a separate route rendering the five stacked steps.
- The heaviest sections by far are `ShopSection.tsx` (54KB),
  `OrdersSection.tsx` (25KB) and `BookingSection.tsx` (21KB), all inside the
  tabbed dashboard.
- `PageChecklist` sits on the Overview tab and links into sections by
  anchor.

## The work

### 1. Decide the structure before writing any code

`INTERFACE-STANDARD.md` asks for this explicitly, and this is exactly the
sprint it was written for. Write down, in this file, before building: what
the sections are, what is on top, what sits behind a tap, and what the one
primary action is on each. Get Dewald to agree the list. A wrong structure
is a sentence to fix now and a week to fix later.

Suggested starting point, to be argued with rather than accepted:

- **Your page** is the one destination. "Edit your page" stops being a
  separate place.
- Inside it, sections a member would name themselves: Your details, How you
  look, Your words, Your photos, Your prices.
- One section open at a time on a phone. Save, then move on.

### 2. Merge the two doors into one

`/dashboard/edit` should stop being a parallel destination. Either fold its
five steps into the Your Page tab as sections, or keep the route and have
the tab link into it per section. Whichever wins, a member must never see
two menu entries that lead to the same fields.

Leave a redirect behind rather than a dead route, per the standing rule
about old traces.

### 3. Build for 390px first

Not "check it on mobile at the end". Lay it out at 390 and let the desktop
version be the one that gets extra room. Primary action in the lower half
where a thumb reaches. Nothing important behind hover: that rule was learned
the hard way on 8 August, when the dashboard's hero-photo control turned out
to be invisible on every phone because it lived behind
`opacity-0 group-hover:opacity-100`.

### 4. Make it obvious what a section does to the page

Dewald's words: "something that make logical sense like they can see and
feel what they adding on their page." A small preview, or plain wording that
names where the thing appears ("this is the line under your business name at
the top of your page"), beats a field label on its own.

## Constraints

- Every existing member uses this screen. A regression here is worse than
  the current mess, so nothing ships without being walked on a real phone.
- Do not rebuild the step components or their Server Actions. They are
  shared with onboarding, and changing them changes both.
- One branch, named for the work. Preview deployment before main. Verify
  live with strings the pages actually render.
- Update CHANGELOG.md, MODULES.md, HOUSE-RULES.md (if a rule changes) and
  this file before calling it done.

## Out of scope

- The onboarding wizard's own flow and step order. It already does one thing
  at a time, which is the shape this sprint is copying.
- Shop, Orders and Booking internals. They can move as whole sections, but
  their own behaviour is a separate job.
- Any change to what the fields are or what they validate.

## Open questions for Dewald

- Does "Your Page" mean the public page, or the place you go to edit it? The
  current naming uses it for both and that is part of the confusion.
- Should Booking and Shop stay as top-level tabs, or sit inside a "Selling"
  group? They are only relevant to Growth and above.
