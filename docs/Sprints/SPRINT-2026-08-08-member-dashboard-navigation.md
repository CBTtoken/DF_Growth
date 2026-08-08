# Sprint handoff: The member dashboard, on a phone

**Written 8 August 2026 by the session that finished the two-doors sprint,
straight after Dewald walked the real flow on a phone and reported what he
found.**

**BUILT 8 August 2026 on branch `member-dashboard-navigation`. Awaiting
Dewald's walk on a real phone before merge, per this file's own
constraint.** Structure agreed with him before any code was written, and
recorded below. What was built is in `CHANGELOG.md` under 8 August.

---

## The structure, agreed before building (item 1 of the work)

Dewald was given three choices per question and picked the recommendation
in each. This is the agreed list.

**Top level, six tabs:** `Home | Your page | Selling | Reviews | Marketing |
Account`. "Selling" replaces "Booking & Shop": one word, still top level,
because tucking it into a group would add the third level the interface
standard warns against.

**Your page is the one destination**, and it means the place you go to
change your page. The public page is reached by the "View your page" button
at the top, which is the screen's single primary action. Inside, six
sections, one open at a time, in this order:

1. **Your photos** — the gallery and the front-page picker
2. **How your page looks** — page style, then colours and logo
3. **Your details** — business name, call and WhatsApp numbers
4. **Where you are, and what you do** — town, trade, description, socials
5. **Your words** — headline, story, button text
6. **Your prices** — packages and specials, optional

Each header carries a plain-language line saying what that section changes
on the live page, and a green tick or a count of what is still to add.

One deviation from the agreed list, and why: section 4 was agreed as "Where
you are". It is Step2BusinessProfile, which also holds the tagline and the
business description, and those two are checklist items members are sent
here to fix. Splitting the step was out of scope by this file's own rules,
so the label grew to match what is actually inside it rather than the
label promising less than the section holds.

**The header** was five equally weighted pills. Now one primary action and
a quiet row of board, messages and log out. "Edit your page" is gone.

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

Both answered on 8 August, before building. Kept for the record.

- Does "Your Page" mean the public page, or the place you go to edit it?
  **Answered: the place you go to change it.** The public page is the
  "View your page" button, which is now the screen's one primary action.
- Should Booking and Shop stay as top-level tabs, or sit inside a "Selling"
  group? **Answered: stay top level, renamed "Selling".** A group would add
  a third level for no gain.

## What the next session needs to know

- The whole thing was laid out and measured at 390px, but it was **not
  walked signed-in on a phone**, because doing so needs a member login and
  this session had no way to sign in to one. That walk is the sprint's own
  exit condition and is the only thing left.
- The checklist deep links (`PageChecklist` → `?tab=your-page&open=...`)
  were verified working end to end on a stand-in page. They were completely
  broken before this sprint: `/dashboard#photos` pointed at an element in a
  tab that was not mounted, so it scrolled nowhere.
- Tabs and Your page sections hide rather than unmount, on purpose, so a
  half-typed answer survives a stray tap. If a future change swaps that for
  conditional rendering it will silently start throwing typing away.
- Tab content only mounts once a tab has been opened, so Selling's Shop,
  Orders and Booking still cost nothing for a member who never taps it.
