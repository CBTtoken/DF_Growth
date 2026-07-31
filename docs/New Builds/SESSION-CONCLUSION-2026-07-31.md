# Session conclusion, 2026-07-31

## What we settled on

**Ship the two handoffs. Park the generated-page system until it can see photographs.**

---

## 1. Ready to merge, real and verified

**Handoff 01, member page defects.** Branch `handoff-01-page-defects`.
Preview: https://df-growth-ks6emc09r-digital-flyer.vercel.app

Truncated summaries, duplicate service lists, maps pointing at the wrong town,
buttons that scroll to nothing, "No reviews yet. Be the first.", the
DigitalFlyer logo sitting above the member's own name, "Everything you need, in
one place.", section numbering, and "General " in every page title. All gone,
verified against all 34 active member pages.

**Handoff 02, contact actions and lead tracking.** Branch
`handoff-02-contact-actions`. Both migrations are live.

The contact gate is gone. WhatsApp and Call sit in the hero and again at the
foot, with the number as selectable text. Every tap is recorded, deduplicated
in the database. Verified end to end.

Still outstanding on Handoff 02: the onboarding and dashboard number fields,
the hide-call-button setting, and the member lead counter. Architecture
independent, straightforward.

---

## 2. Parked, with a clear blocker

**The generated-page system.** Preview:
https://df-growth-1zi73ueb2-digital-flyer.vercel.app/generated/{slug}

Two tiers, both working:
- No photographs: prepared sections, 8 palettes, 6 type pairings, per-section
  layouts and bands.
- With photographs: a layout grammar, elements placed on a 12-column grid.

It produces genuinely different pages, grounds every claim, and refuses
unverifiable ones. It is better than the current template system.

**It is not better than a hand-built page, and the reason is specific.**

### The blocker: the generator cannot see

It is told "this member has 8 photographs" and nothing else. It assigns aspect
ratios blind, and photographs are mapped onto slots in upload order. A human
building Buffelskop looked at every image and decided which one earns the
hero, which is a tall bag shot that wants portrait, and where to crop.

No amount of layout work substitutes for knowing what is in the picture. This
is why generated Buffelskop is worse than real Buffelskop, and it is the whole
gap.

### The fix, for when we pick this up

Run every uploaded photograph through Claude's vision at upload time and store
what it says: subject, orientation, where the subject sits in frame, dominant
colours, safe crop range, and whether it is good enough to publish. Once every
photo carries that, composition around images becomes possible, and so does
sensible cropping.

That is Handoff 03's territory and it is now clearly the highest-value
remaining piece of work. Nothing else in the generated system should be touched
before it.

---

## 3. Decisions taken today, for the record

- **No full dark mode, ever.** Deleted, not deprecated.
- **Two tiers split on the member having photographs of their own work.** Stock
  imagery never promotes a member into the photo-led tier, or we recreate the
  generic look we removed.
- **The Pexels picker stays.** Only the automatic stock fallback goes. Members
  choosing an image deliberately is fine; the system inserting one silently is
  not.
- **Two free rebuilds, then R50.**
- **Member approves their own page.** info@ gets a daily digest of newly
  published pages, which fits the existing daily cron.
- **Adult, gambling and MLM are a terms clause requiring written permission,
  not a classifier.** Removal without refund if discovered. Detection is a
  losing game against people who are trying.
- **Members choose a main colour plus two or three supporting**, shown as
  swatches on real buttons and headers, never hex codes. Contrast is computed,
  never chosen.
- **New:** where a member wants something beyond what generation can give
  them, offer a "talk to us about a custom design" route rather than pretending
  the generator can do it. Honest, and it is a revenue line.

---

## 4. Answers to the last three questions

**Is it mobile optimised?** Verified. Every grid collapses to one column, every
column span drops to `auto`, no horizontal overflow at 375px. The section
library ships **zero client JavaScript**, which is less than the current
template system.

**Does lead-gen remain the core?** Yes, and it is not negotiable by a design
pass. Contact placement is ours: WhatsApp and Call above the fold and repeated
at the foot, form last. The generated pages do not have this wired yet, which
is a deliberate gap in the prototype, not a design position.

**Will it always be generic without real input?** Largely yes, and that is
worth saying to members plainly rather than papering over. A page built from
seven fields of text and no photographs has a ceiling. The honest product
answer is the one Dewald reached: explain it, make the upgrade path obvious,
and offer a custom route for members who want more.

---

## 5. Where the code sits

Nothing is merged. Nothing is on production.

- `handoff-01-page-defects` — ready to merge
- `handoff-02-contact-actions` — contains everything since, including the
  generated-page prototype under `/generated`, which is `noindex` and touches
  no live page

Two live data problems found along the way and not fixed, both worth attention
independently of any of this:

1. **`mikeys-handyman.business_description` is a pasted Google Tag Manager
   snippet.** It was reaching Google's search snippet until Handoff 01.
2. **`mushroom-guru-pty-ltd` publishes unverifiable health claims**: "43%
   immune improvement", "348 times more potent", pre-clinical trial references.
   The member's own notice says the products are not SAHPRA evaluated. The
   generator stripped all of it unprompted. The live page still carries it.
