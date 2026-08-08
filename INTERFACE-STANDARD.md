# Interface standard

**Standing document. Every handoff that touches a screen references this.
Keep it at the project root.**

Our user is a solo operator on a phone. Non-technical, busy, often mid-job, and
frequently annoyed before they even open the screen. They will not learn an
interface. They will abandon it.

The test that decides everything below: **could Henry Molotsi use this without
anybody explaining it to him?** If not, it is not finished.

---

## Before building a screen

Describe the structure in the report or in a comment before writing it: what
sections exist, what is on top, what is hidden behind a tap, and what the one
primary action is. A wrong structure is cheap to fix in a sentence and
expensive to fix in code.

## After building a screen

Look at it at 390 pixels wide, which is a normal phone, before calling it done.
Not a narrow browser window on a laptop. If the thing being built cannot be
viewed, say so rather than assuming it is fine.

---

## The rules

### Grouping beats listing

**No screen presents more than about seven items without grouping.** Long flat
lists are the single most common failure. Group into labelled sections, and put
the section a user needs most at the top.

If a list can grow past twenty rows, it needs search or filtering above it, not
more scrolling.

### One primary action per screen

One thing is obviously the main action, styled as such. Everything else is
secondary and looks secondary. Two equally weighted buttons is a decision the
user did not ask to make.

On a phone, the primary action sits where a thumb reaches, which is the lower
half, not the top corner.

### Show the common thing, hide the rare thing

Progressive disclosure. The eighty percent case is visible. The rest sits
behind a tap labelled in plain words. Do not put advanced settings, rarely used
fields or edge cases on the same screen as the everyday task.

### Plain language, always

Labels are the words the user would use, not our internal names. No database
terms, no product jargon, no abbreviations they have not seen. If a label needs
a tooltip to be understood, the label is wrong.

House style applies to interface copy exactly as it applies to everything else:
no em dashes, "marketplace" never "directory" or "listing", "SARS-ready" never
"SARS compliant", Rand, South African English.

### Empty states tell the user what to do

Never a blank box. An empty state says what will appear here and what to do to
make it appear. The Growth dashboard already does this correctly, showing zero
with "Nothing yet this month" rather than nothing at all. Match that standard
everywhere.

### Never invent data in an interface

No placeholder statistics, no sample review counts, no mock page view numbers,
no fake ratings. If a real screenshot or real data is not available, use a
visibly empty state. This has caused a real problem on the pricing page and
must not be repeated.

### Destructive things ask first

Deleting, cancelling, removing, unpublishing. A confirmation step, worded so it
is clear what will be lost. Everything else should be reversible without a
warning.

### Errors say what to do next

Not what went wrong internally. "Add your phone number so customers can call
you" rather than "validation failed on field contact_number".

### Forms

- Ask for the fewest fields that make the thing work.
- Group related fields with headings, do not present a wall of inputs.
- Correct keyboard on mobile: numeric for numbers, email for email.
- Validate as the user goes, not only when they press submit.
- Never lose what somebody has typed. Not on error, not on navigation, not on
  refresh.

### Navigation

- A person can always tell where they are and how to get back.
- Anything more than two levels deep is probably structured wrong.
- Menu items are named for what the user wants to do, not for what the code
  calls it.

---

## When in doubt

Fewer things on screen. Bigger tap targets. Plainer words.

If a screen needs explaining to Dewald before he can use it, it will need
explaining to every member, and there is nobody to do that explaining.
