# Handoff: codebase health audit and the living reference documents

**For Claude Code. Written 6 August 2026.**

---

## Context

The codebase has grown faster than its documentation. Confusion now appears
between sessions: a new session reconstructs the picture from whatever files it
happens to open, and gets it wrong. Recent examples include a folder described
as containing a lead switchboard that actually held a scrapped signup wizard, an
account figure in the record that was off by a third, and reports of work being
overwritten and then repaired without a record of what happened.

Separately, nothing has ever been checked for performance. No index review, no
query audit, no dependency review, no look at what happens under real traffic. A
jobs section is planned that will bring more traffic than everything else
combined, and it must not arrive first.

This sprint fixes both. It is deliberately unexciting.

## Goal

Three documents in the repo that are true, that every future session reads
first, and that every future sprint updates. Plus a full picture of where this
codebase will hurt when traffic arrives, with the safe problems fixed and the
risky ones written down.

## The rule that governs this whole sprint

**Audit first, fix only what is mechanically safe.**

You may fix: missing indexes, obviously dead files with no references, dependency
patch updates, unbounded queries where a sensible limit is clearly correct, and
anything where the fix cannot change behaviour.

You may **not** fix, and must list instead: anything that changes behaviour, any
refactor, any schema change beyond adding an index, any RLS change, any
dependency major version bump, and anything you are unsure about.

**A finding written down is worth more than a fix made on a guess.** If in
doubt, list it.

---

## Job 1: `HOUSE-RULES.md` at the repo root

The document a new session reads before touching anything. Standing rules only.
It does not describe features.

Contents:

**Naming.** Every naming decision and every retired name. BizUp is retired,
public URLs are moving off it, internal names remain. RE:Biz is retired. The R89
plan is Unlimited Documents, never Unlimited. The accommodation module is Stays
and Tours, never Bookings, because Booking already exists as the appointment
module. Record the pattern too: three naming problems have already cost real
work, so new names get checked before they enter table names or routes.

**Standing product rules.**
- No fabricated testimonials, social proof or invented facts anywhere, ever
- No credentials, passwords or API keys stored in The Desk or any document
- The system never moves money. Members connect their own Paystack or Bob Pay.
  DigitalFlyer's own Paystack account bills DigitalFlyer's own products only
- Members send their own messages. Nothing sends on a member's behalf
  automatically
- Personal information never appears in a page an unauthenticated request can
  fetch
- Individually public facts become sensitive when aggregated into a structured,
  repeatable record
- Never store what you do not need. ID numbers and bank details are never held
- Alerts, not scores. Never rank or score people
- Never put friction on the scarce side of a marketplace

**Terminology.** Marketplace, never directory or listing. SARS-ready, never SARS
compliant. Rand and South African context by default. No em dashes anywhere in
copy. No load shedding references, it ended in May 2026. Member greetings open
"Good day {name}," never "Hi there".

**The deny list.** Never without Dewald: deleting files, force pushing, touching
secrets or environment variables, changing Vercel settings, writing to
production data, payment credentials. Legal questions go to Dewald's attorney,
never answered in code or copy.

**Working conventions.** The three minute rule. One report at the end, not
running commentary. Preview deployments, never straight to main. Webhooks on
preview deployments need the Vercel protection bypass appended.

Add to this file every sprint. Never let it contradict the code.

## Job 2: `MODULES.md` at the repo root

The map. What exists, what state it is in, and where its detail lives.

One entry per module: Growth pages and onboarding, the marketplace, the Shop,
Events, Booking (appointments), the agent programme, KatisoBiz documents,
KatisoBiz reports and exports, Find a Trade, The Board, the WhatsApp inbox,
Stays and Tours, jobs, and anything else you find.

Each entry carries:

- **What it is**, in two or three plain sentences
- **What it is not.** This matters as much as what it is. Events is a free
  community board with open submissions, not a ticketing system. Booking is
  slot-based appointments, not accommodation. KatisoBiz is documents and money
  owed, not accounting
- **Status:** live, built but switched off, partially built, specced only, or
  parked with its trigger
- **Who it is for:** public, member, admin, or a combination
- **Where its spec lives,** by filename
- **Known gaps and known lies.** Anything the interface promises that the system
  does not deliver
- **Last updated,** with a date

**Anything you find in the code that is not in that list gets added.** Anything
in the list you cannot find in the code gets flagged loudly, because that is a
document describing something that does not exist, which is the exact failure
this sprint is fixing.

## Job 3: `CHANGELOG.md` at the repo root

A running record so nobody has to reconstruct history from chat.

One entry per sprint, newest first, each with: the date, the branch, what
shipped in plain language, what was deliberately not done, what was deleted, and
whether it reached main or is still waiting.

**Reconstruct backwards as far as you reliably can** from git history and
existing docs. Where you cannot be certain, say so in the entry rather than
guessing. An honest gap is fine, an invented entry is not.

From now on, every sprint adds its entry before reporting back. If work was
overwritten and repaired, that goes in the entry. If something is waiting on
Dewald, that goes in the entry with what it is waiting for.

## Job 4: database audit

This is the part that decides whether the site survives traffic.

- **Indexes.** Every foreign key, every column used in a WHERE or ORDER BY on a
  public page, every column joined on. List what is missing. Add the ones that
  are clearly missing and safe.
- **Unbounded queries.** Anything that could return an unlimited number of rows,
  particularly on public pages. The marketplace, the Board, the Shop and Find a
  Trade are the likely offenders.
- **N+1 patterns.** Anywhere a loop issues a query.
- **The expensive query.** Identify the single query most likely to cause
  trouble at ten times current traffic, and say why.
- **RLS coverage.** Every table, whether RLS is on, and whether the policies
  actually restrict what they claim to. **Flag any table holding personal
  information without RLS as urgent.**
- **Row counts** for every table, as a baseline for future comparison.

## Job 5: dead code

- Unused routes, components, files and folders. The scrapped `whatsapp` folder
  is a known one.
- Superseded spec and handoff documents still in the repo. `BIZUP_CLAUDE.md` is
  a known one and must never be handed to a future session.
- Commented-out blocks that are never coming back.
- Unused database tables and columns. **List these, do not drop them.**

Delete only what is unambiguously dead and unreferenced. **List every deletion.**
Anything ambiguous goes on a list for Dewald.

## Job 6: dependencies

- Everything outdated, with current and latest versions.
- Any package with a known security advisory, flagged clearly.
- Anything installed and never imported.
- Apply patch and safe minor updates. **List major version bumps, do not
  apply them.**

## Job 7: page weight and speed

South African mobile data cost is a real constraint on this audience and over 70
percent of traffic is mobile.

- Page weight for the marketplace, a member page, the Board and the KatisoBiz
  quote screen.
- Images: whether they are served resized and in a modern format, or whether a
  member's phone photo is being served at full size to every visitor. **This is
  the most likely single biggest win in the whole audit.**
- What is server-rendered, what is static, what is cached, and what is
  needlessly dynamic.
- Anything blocking first render.

## Job 8: security and configuration posture

- Any secret, key or token reachable in the client bundle.
- Anything sensitive committed to git history.
- Public endpoints with no rate limiting, particularly forms, signup, and
  anything that sends a message or an email.
- Current Vercel and Supabase plan limits, what the current usage is against
  them, and **what actually happens when a limit is hit**. Dewald needs to know
  whether that means a bill or an outage.
- Any place where a failure is swallowed silently rather than surfaced.

---

## Out of scope

- Any new feature
- Any redesign or visual change
- Any refactor beyond the mechanically safe fixes defined above
- Any schema change other than adding an index
- Any RLS change. Findings only
- Any dependency major version bump
- Migrating off Vercel or Supabase. Explicitly parked until the monthly bill
  exceeds the cost of migrating
- The Board, the WhatsApp inbox, Stays and Tours, jobs

## What you decide, and what needs Dewald

**Decide yourself:** the structure and format of all three documents, which
indexes to add, which files are unambiguously dead, which dependency updates are
safe, and how far back the changelog can honestly be reconstructed.

**Stop and ask Dewald:** deleting anything ambiguous, anything that changes
behaviour, and anything you find that looks unsafe rather than merely untidy.

**Never without Dewald:** force pushing, secrets or environment variables,
Vercel settings, production data, payment credentials. Note that deleting files
is normally on this list and is partially permitted in this sprint, for
unambiguously dead and unreferenced files only, with every deletion listed.

Three minute rule applies.

## Acceptance criteria

1. `HOUSE-RULES.md`, `MODULES.md` and `CHANGELOG.md` exist at the repo root
2. Every module found in the code appears in `MODULES.md`, each with what it is,
   what it is not, its status, its spec file and a date
3. Anything in `MODULES.md` that cannot be found in the code is flagged, not
   quietly described
4. `HOUSE-RULES.md` contains every rule listed in job 1 and contradicts nothing
   in the code
5. `CHANGELOG.md` reconstructs history as far as is honest, with gaps marked as
   gaps
6. Every table has a row count recorded and its RLS state stated
7. Every table holding personal information without RLS is flagged as urgent
8. Every missing index is listed, and the ones added are named
9. Every unbounded public query is listed
10. Every deletion is listed, and nothing ambiguous was deleted
11. Dependency status is listed in full, with security advisories called out
12. Page weight figures are given for the four named pages
13. Plan limits, current usage and what happens at the limit are stated for both
    Vercel and Supabase
14. No feature behaviour changed anywhere in this sprint
15. Nothing listed under Out of scope has changed

## How to report back

One report at the end. It is a findings report, not a work report, so the
findings matter more than the fixes.

1. **The five things most likely to break first under real traffic**, in order,
   with why. Put this at the top
2. What changed, by file, in plain language
3. The Vercel preview URL
4. The full index audit: missing, added, and left alone with reasons
5. Every unbounded query, and where it runs
6. RLS state per table, with anything unsafe called out first
7. Row counts per table
8. Everything deleted, and everything ambiguous left for Dewald
9. Full dependency status, security advisories first
10. Page weight figures, and the image finding
11. Plan limits, current usage, and what happens when a limit is hit
12. What went into each of the three documents
13. Anything found that is stale, contradictory or unsafe, whether or not it was
    in scope
14. Anything in this brief that turned out to be wrong about how the code
    actually works

## Standing close-out, from this sprint onwards

Every future sprint ends by updating `HOUSE-RULES.md` where a rule changed,
`MODULES.md` where a module changed, and `CHANGELOG.md` always. Deleting what
the sprint made dead, with every deletion listed. Reporting anything stale,
contradictory or unsafe found along the way. And flagging any query likely to
get slow at scale, even if it was left alone.

This paragraph goes into `HOUSE-RULES.md` as a rule about how sprints end.
