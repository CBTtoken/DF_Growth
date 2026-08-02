# CLAUDE CODE HANDOFF: THE DESK v2

**Prepared for Dewald Rosema | 1 August 2026 | Builds on The Desk v1, shipped this morning**

---

## 1. CONTEXT

The Desk v1 is live at `desk.katisobiz.co.za`, inside the Growth app and the Growth Supabase project. Two tables, `desk_items` and `desk_assets`. It has now had a day of real use and this handoff is written from that use, not from planning.

Everything below is either a defect found in use, or a gap the operator hit while working. Nothing here is speculative.

**What v1 got right and must not be lost:** capture is instant and unvalidated, Today returns one item and never a list, parking requires a written trigger, and there are no notifications, badges or unread counts anywhere. Those are load-bearing. Do not compromise any of them while adding what follows.

---

## 2. BUILD ORDER

Build in this order. Each step leaves the tool usable if you stop.

1. The lag fix
2. Dump and Sort corrections
3. Streams, grouping and counts
4. Venture end states
5. Horizon and recurring
6. Notes, register tabs, go-away section
7. The handoff button

---

## 3. THE LAG FIX

**Defect.** Every interaction is a full server round trip. The v1 report notes the whole app works with JavaScript disabled, which was your choice, not a requirement. The cost is a visible delay between click and change on every screen, and it is the single most complained-about thing about v1.

Make the common interactions immediate: Done, Skip, Blocked, accepting Sort proposals, filter and tab changes. Optimistic update on the client, reconcile with the server behind it.

Capture must stay reliable above all else. If a save fails, say so plainly and do not lose what was typed.

---

## 4. DUMP AND SORT CORRECTIONS

### 4.1 Blank lines separate items, not every line

**Defect.** v1 treats one line as one item. A paragraph written as a single thought across several lines becomes several fragments.

Correct rule: a blank line separates items. Single line breaks stay inside one item. Leading and trailing whitespace trimmed, empty blocks ignored.

### 4.2 Sort proposes splits

**Gap.** A single dump often contains several unrelated things. Sort currently proposes fields for a blob but never breaks it up.

Sort must now be able to propose splitting one captured item into several, alongside the four fields it already proposes.

Rules, unchanged from v1 and still binding:

- It proposes, it never writes. Nothing saved until accepted.
- Titles are never rewritten, corrected or tidied. The operator is dyslexic and his words pass through untouched. When a split happens, each new title must be a verbatim span of the original text, not a rephrasing.
- It never invents an item and never merges two separate captures.
- One batched call, not one per item.

The proposal screen needs a one-tap merge to undo a split the operator does not want. Splitting is ambiguous and will sometimes be wrong, so undoing it must be trivial.

---

## 5. STREAMS, GROUPING AND COUNTS

### 5.1 New field: `stream`

`area` (personal or business) stays as is. Add `stream` above `venture`:

- `own` — DigitalFlyer SA and everything under it: Growth, KatisoBiz, The Board, CBT, Kwaai Press, The Desk, HelpLift
- `client` — SVC, Moxie, FortisLex, Alite
- `life` — home, family, health, admin, the go-away package

The operator's stated reason: he wants to see how much of his capacity goes into other people's businesses versus his own. That comparison is the point of the field, so make it visible, not just filterable.

Set `stream` on the existing rows from their `venture` using the mapping above. Anything unmapped gets `own` and appears in a list for him to correct.

`venture` stays free text.

### 5.2 A grouped view

v1 shows a flat list. Add a screen that shows, at a glance:

- Each stream, with its ventures under it
- Per venture: open, waiting, done, parked counts
- Tap a venture to see its items

This replaces "one long list and you choose what I should do" with "here is where everything sits". It does not replace Today. Today still hands back one item.

### 5.3 Notes

`notes` exists on `desk_items` but there is no way to edit it from the item view in normal use. Make it editable inline wherever an item is open, without a separate edit screen.

---

## 6. VENTURE END STATES

**Gap, and the operator's own words:** an empty list reads as finished when it is only finished for today.

New table, `desk_ventures`: name, stream, `end_state` (free text, what done looks like for this venture), `status` (active, parked, killed), notes.

On the grouped view, each venture shows its end state and its counts against it. That is the roadmap: not dates, not a plan, just where this thing is going and how far along it is.

Do not build priority or urgency fields. Everything becomes urgent within a fortnight and the field stops meaning anything. The end state does that work better.

---

## 7. HORIZON AND RECURRING

### 7.1 Horizon

One flat list of everything dated inside the next 30 days, personal and business together, sorted by date, pulling from both `desk_items` (`due_date`) and `desk_assets` (`renewal_date`).

**Not a calendar.** No month grid, no week columns, no time slots. The operator has few appointments and many deadlines, and a grid is a browsing tool for the opposite problem.

### 7.2 Recurring items

Add recurrence to `desk_items`: none, weekly, monthly, quarterly, annually. When a recurring item is marked done, the next instance is created with the next due date.

This exists because of one specific need: a monthly platform check that must come back on its own or it will not happen. Seed it as a recurring monthly item, first week of the month:

> Platform check: Vercel spend, Supabase database size and usage, confirm a database dump restores.

---

## 8. REGISTER TABS AND THE GO-AWAY SECTION

### 8.1 Register tabs

Tabs on the Register: **Business**, **Personal**, **All**. These are filters on the existing `area` field. Each tab shows its own monthly Rand total. Renewals inside 30 days stay pinned at the top.

### 8.2 The go-away section

A plain document section, personal only: where the important documents are, who to contact, what happens to each business, funeral and faith wishes, anything the operator wants his family to find.

Free text sections he can name himself. Nothing structured, nothing clever.

### 8.3 No credentials, ever

**Passwords, API keys, recovery codes and secrets do not go in The Desk. This is not negotiable and must not be added later without a security review.**

The reasons, recorded so they are not relitigated:

- The Desk has no zero-knowledge encryption. Everything passes through the server in the clear, so the application can read whatever is stored.
- It lives in the Growth Supabase project alongside member data. A flaw in a private single-user tool would become a member data breach.
- The operator is the registered Information Officer for Digital Flyer (Pty) Ltd, which carries POPIA notification obligations.

`where_login_lives` stays what it is: a plain-words pointer, for example "password manager" or "unknown".

---

## 9. THE HANDOFF BUTTON

**Gap.** Much of what is in The Desk is work for Claude Code, not for the operator, but v1 seeded everything as `blocked_by = me`, so the list reads as one long personal to-do.

Interim behaviour available today with no code: setting `blocked_by = CC` moves an item to Waiting On and out of the Today rotation. That already works.

What to build: on Waiting On, the CC group gets a **Draft handoff** button that produces a markdown draft in the house handoff shape, containing the selected items with their titles, next actions, ventures and notes.

It is a draft, not a finished handoff. Context and acceptance criteria are written by a human. Copy to clipboard, nothing more.

---

## 10. SEED ADDITIONS

Add these, they came out of a day of use and are not yet recorded.

**Security, `stream = own`:**
1. Enable 2FA on Supabase, Vercel, Paystack, Meta and the domain registrar
2. Audit who else has access to each of those accounts
3. Confirm a Supabase database dump restores cleanly, then keep it
4. Do not run long jobs inside a Vercel function, Kwaai Press PDF rendering is the first case

**Kwaai Press, `stream = own`:**
5. Check domain availability for Kwaai Press
6. Check CIPC and the trade marks register for anything similar
7. Record Kwaai Press as the canonical name in the master reference before anything else picks it up
8. Kwaai Press as a rentable product for other publications, `status = parked`, `park_trigger = "Three Moxie issues shipped through it"`

**The Desk, `stream = own`:**
9. Desk v3, MCP server so Claude chats read and write The Desk directly, `status = parked`, `park_trigger = "Seven consecutive days of opening The Desk"`

**Life, `stream = life`:**
10. Go-away package, product version for others, `status = parked`, `park_trigger = "Attorney input on custodian and access process"`

---

## 11. OUT OF SCOPE

- Notifications, email, push, badges, unread counts. Still a hard rule.
- A calendar grid in any form.
- Credential storage of any kind.
- A second user, sharing, invites, permissions.
- Charts, streaks, scores, progress bars, gamification. Counts are numbers, not a scoreboard.
- Reply or message drafting.
- A mobile app.
- WhatsApp or voice capture.
- Any AI beyond the Sort function.

---

## 12. WHAT YOU DECIDE VERSUS WHAT NEEDS DEWALD

**You decide:** how the lag fix is implemented, schema details beyond the fields named, screen layout, how the grouped view is presented.

**Stop and ask Dewald:**
- Anything touching existing Growth, KatisoBiz or Board tables
- Anything requiring a new paid service
- Any venture whose stream is genuinely ambiguous
- Any case where a v1 behaviour in section 1 would have to be compromised

---

## 13. ACCEPTANCE CRITERIA

1. Done, Skip, Blocked and Sort acceptance all respond immediately, with no visible round-trip delay.
2. A three-line paragraph with no blank lines captures as one item. Two paragraphs separated by a blank line capture as two.
3. Sort proposes a split on a multi-topic capture, writes nothing until accepted, and every proposed title is a verbatim span of the original text.
4. A split can be merged back in one tap.
5. Every existing item has a stream, and anything unmapped is listed for correction rather than guessed.
6. The grouped view shows streams, ventures and counts, and comparing own against client capacity is visible without arithmetic.
7. A venture's end state displays alongside its counts.
8. Horizon lists dated items and asset renewals inside 30 days, in date order, personal and business together.
9. A recurring item marked done creates its next instance with the correct next date.
10. Register tabs show correct per-tab monthly totals.
11. The go-away section saves and reopens free text.
12. No field anywhere in the application accepts or stores a password, key or secret.
13. Draft handoff produces a copyable markdown draft from the CC group on Waiting On.
14. Still true from v1: parking without a trigger fails, no notification or badge exists anywhere, Today returns exactly one item, capture does not spellcheck or flag anything, and all pages return `noindex, nofollow`.
15. The Growth and KatisoBiz public sites still return their normal `robots.txt` with no `x-robots-tag: noindex`. Verify by fetching headers directly.

---

## 14. HOW TO REPORT BACK

One report at the end. What was built, every criterion pass or fail, the schema changes as applied, any venture you could not map to a stream, and anything in this document that turned out to be contradictory.

If you run out of time, stop at a completed step in the section 2 order and say where you stopped.
