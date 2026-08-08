# HANDOFF: KatisoBiz Jobs, CV quality, five templates, and AI credits

Written 8 August 2026, for Claude Code. Run this straight through. One report
at the end.

Companion documents you must read first, they are the source of truth for what
already exists and you must not rebuild any of it:
`docs/REPORT-jobs-prelaunch.md`, `docs/SPEC-katisobiz-jobs-public-launch.md`,
`INTERFACE-STANDARD.md`.

---

## Context

KatisoBiz Jobs is live on `jobs.katisobiz.co.za`. The CV builder works: OFO
2021 occupations, guided questions, CV import parsed in memory and never
stored, Write with AI capped at 3 turns per CV, a wording check capped at 3,
PDF and Word download in three looks, a seeker dashboard, an employer side
with structured adverts and an applicant pipeline.

Nothing in this handoff is a complaint about that work. It is all additive.

What we now know from research into what actually gets a CV read:

- A first scan lasts six to seven seconds. It checks job title match, evidence
  of scale and impact, and career progression.
- Employers ignore duty lists. They read numbers, percentages, quantities.
- Large South African employers and every recruitment agency run applicant
  tracking software. Two-column layouts, tables, text boxes and icons are the
  highest-frequency cause of a CV being scrambled or dropped by that software,
  and the worst offenders are the older enterprise systems that big local
  employers still run.
- Word (.docx) is the safest file for an online application portal. PDF is
  fine for emailing a person.
- Mirroring the words used in the actual job advert is the single highest
  return tactic available to a candidate.

Our AI is correctly forbidden from inventing facts. That means it cannot
produce an impact bullet unless the person supplies the number. So we ask for
the number.

## Goal

Three outcomes, in this order of importance:

1. CVs coming out of this product contain evidence, not duty lists.
2. Five templates that all survive machine reading, with a download step that
   tells the person which file to send where.
3. A seeker AI allowance of two free rewrites per CV, then paid rebuild
   credits, without breaking the promise that building, downloading and
   applying are free forever.

---

## Job 1: The numbers step

The biggest quality lever in the whole product. Build it first.

- On each work history entry, after the duties, add one optional question in
  plain language: **"What can you put a number to in this job?"**
- Under it, three short free-text lines with placeholder prompts, plus three
  tappable example chips drawn from the person's OFO sub-major group. A
  plumber sees examples like "houses finished in a week"; a cashier sees "till
  points covered" or "customers served a day". Curate these the same way the
  320 branch skills were curated, one small set per sub-major group. They are
  examples only, never inserted into the CV by tapping.
- Skipping is one tap and never blocks anything.
- Store these as impact facts attached to the work entry.
- Write with AI then builds bullets in the Accomplished X, as measured by Y, by
  doing Z shape, restating only what the person typed. **No number may ever
  appear in a bullet that the person did not enter.** Extend the existing
  invented-year rejection check to reject any numeral in the output that does
  not appear in the input.
- Where a person supplies no numbers, the AI must produce a clean action
  bullet, never a fabricated metric, and never a hedge like "improved
  efficiency significantly".

## Job 2: The CV check

Replace the bare completeness percentage with a checklist that tells the person
what to fix and takes them straight there.

- This checks a document, not a person. It is never shown to an employer, never
  stored on the candidate record for search, and never used to rank or order
  anyone. Alerts not scores, portfolio rule.
- Items, each a tap that opens the exact screen that fixes it:
  headline occupation set; phone number valid; suburb and province set;
  professional summary of three to four sentences; at least one work entry;
  every work entry has a start and end date; at least one bullet carries a
  number; skills present; education present; CV fits two pages.
- Wording is encouraging and specific. "Add one number to your Shoprite job and
  employers can see what you handled", not "incomplete".

## Job 3: Five templates

Replace the current three. All five are free. Templates are never gated behind
credits or an account.

**Rules that apply to all five, no exceptions:**

- Single column. Real paragraph flow. No tables, no text boxes, no floating
  frames, no sidebars, no icons, no graphics, no photos, no charts.
- Standard section headings only: Professional summary, Work experience,
  Skills, Education, Certifications. Never a creative heading.
- Dates as MM/YYYY.
- Body text 10 to 12pt in Calibri, Arial or Georgia. Margins 0.5 to 1 inch.
- Maximum two pages. If content overflows, tighten spacing first, then tell the
  person which section is longest and offer to shorten it. Never silently cut.
- The top third of page one always carries, in this order: full name, headline
  occupation, years of experience, area, contact number and email, and the
  three top skills. That block is what the six second scan reads.
- Skills split into two labelled groups, practical skills and working skills.
  Do not use the words "hard" and "soft", they do not translate well in plain
  South African English.
- PDF and Word are generated from the same data assembly for all five, the way
  the existing Word export already reuses `loadOwnedCvData`.

**Formatting, not dumping.** What the person typed is the content. How it looks
on the page is ours to fix, and it must be fixed deterministically in the
renderer, not by asking the AI. None of this changes a single word of meaning.

- Names, job titles, company names and place names get title case. A CV typed
  entirely in capitals comes out properly cased. A CV typed entirely in
  lowercase comes out properly cased.
- Bullets start with a capital and a verb, and carry no full stop unless the
  bullet is a full sentence. Consistent across every bullet on the page.
- Dates normalise to MM/YYYY however they were typed. "Jan 2019", "2019/01",
  "01-2019" and "January 2019" all render identically.
- A current job renders as "MM/YYYY to present".
- Phone number renders in one standard South African format regardless of how
  it was typed, including a pasted +27 form.
- Email renders lowercase.
- Collapse double spaces, strip trailing spaces, strip stray bullet characters
  someone pasted in from another document, normalise curly and straight quotes.
- Empty sections do not render at all. No heading with nothing under it, ever.
- Long unbroken pasted paragraphs in the summary are left as written, but the
  CV check flags them.

**The five:**

1. **Plain.** No colour, no rules, nothing. The safest possible document.
2. **Clean.** Georgia, generous line spacing, a hairline rule under each
   heading. Reads as considered without any decoration.
3. **Amber.** KatisoBiz amber name band across the top, ink body. Our house
   look. Still one column, the band is a filled paragraph not a shape.
4. **Compact.** For long histories. Tighter leading, smaller headings, built to
   hold fifteen years on two pages without shrinking below 10pt.
5. **Trades.** Skills, tickets, licences and certifications sit directly under
   the header, above work experience, because for an artisan the ticket is the
   qualifier. Same single column structure, different section order.

Names shown to people are Dewald's call, listed above as working names.

## Job 4: The download step

Currently the person picks a look. Add one question above it, in plain language.

- **"Where are you sending this CV?"** with three answers:
  - *Filling in a form on a company website* → recommend Word, Plain or Clean.
    One line of explanation: "Big companies read CVs with software before a
    person sees them. Word files come out cleanest."
  - *Emailing it to a person* → PDF, any template.
  - *Printing it or handing it over* → PDF, any template.
- The recommendation is a nudge with the recommended option preselected, never
  a lock. Any template plus any format stays downloadable.
- Filename on download: `Firstname-Surname-CV.pdf` and `.docx`. Never a
  database id.

## Job 5: The free allowance and AI credits

**Free forever, never gated, never behind a credit:** building a CV, editing
it, importing one, every template, both file formats, applying for a job, being
found by employers, the spelling and wording check.

**Free AI allowance per CV:** two Write with AI turns, down from three. Only a
successful call spends a turn. Generated drafts stay stored so redisplay never
re-runs the model.

**Credits:**

- R45 buys 5 rebuilds. One-off Paystack payment on DigitalFlyer's own account,
  billing DigitalFlyer's own product, which is inside the portfolio rule. No
  subscription. Credits never expire. Say plainly at the point of purchase that
  credits are not refundable once spent.
- **A rebuild is one full AI rewrite** of the professional summary and the work
  history bullets, from the person's own facts.
- **Tailor to a job costs one rebuild.** The person picks a live vacancy from
  our own board, or pastes an advert from anywhere. The AI restates their own
  facts using that advert's own words and reorders their skills to lead with
  the ones the advert asks for. It may never add a skill, a duty, a date or a
  number that is not already on the person's CV. If the advert asks for
  something they do not have, the rebuild simply does not claim it.
- Tailored versions save as named copies, so someone can hold five aimed CVs
  and know which went where.
- A credit is only spent on a successful generation.
- Ledger: credits purchased, credits spent, what each was spent on. Keep it
  simple and auditable.

**Pitch it as what it is.** Not "AI credits". On the button and in the FAQ it
is *five CVs aimed at five different jobs, R45*.

## Job 6: Copy corrections, mandatory

The current copy promises seekers never pay anything. Credits make that false
as written. The promise stays true in substance and the wording must change
everywhere it appears.

- Home page seeker door, replace "nothing here ever costs you money" with:
  **"Building your CV, downloading it and applying are free. Always."**
- Anywhere a rewrite is offered past the free two, one plain line: what the
  free allowance is, what R45 buys, and that everything else stays free.
- New FAQ entry: **"Do I have to pay for anything?"** Answer names exactly what
  is free forever and exactly what the R45 is for.
- The MODULES line owed for Jobs changes from "never charges a job seeker" to
  "never charges a job seeker to build, download, be found or apply".
- House style holds: no em dashes, "Good day {name}" never "Hi there", no
  invented social proof, plain South African English.

## Job 7: Small things while you are in there

- Two-page enforcement, as described in Job 3.
- The vacancies browse "type of work" dropdown still shows the formal OFO
  sub-major names. Add a curated friendly display name per group, 40 of them,
  official name kept underneath as data.

## Job 8: Say the two things out loud on the home page

Both of these are currently true of the product and invisible to a visitor.
They go on the home page, in the seeker half, as a short band under the two
doors. Not a wall of text. Two headings and a few lines each.

**One: our AI does not make things up.** Every competitor's pitch is "AI writes
your CV". Ours is the opposite and it is the more trustworthy offer, especially
to someone who is worried about being caught out in an interview. Draft copy,
Dewald approves the final wording:

> **We never make anything up**
> Our AI does not invent jobs, dates, numbers or skills. It takes what you tell
> us and puts it in the order and the words an employer expects to see. Nothing
> goes on your CV that you did not tell us. You check every line before you use
> it, and you can change anything.

**Two: one CV aimed at the job you are applying for.** This is the reason
somebody buys rebuilds, so it has to be explained before they hit the paywall,
not at it. Draft copy:

> **Aim your CV at the job**
> Employers look for their own words on your CV. Pick a job from our board and
> we rewrite yours to lead with the experience that job is asking for, using
> your own facts. If the job wants something you have not done, we leave it
> out. Save each one, so you know which CV went where.

Rules for this band: no numbers we cannot stand behind, no invented success
stories, no testimonials. It explains what happens, nothing more. The How it
works page carries the longer version of both, and the FAQ answers "does the AI
write my CV for me?" with a straight no and an explanation of what it does do.

## Job 9: Walk the whole thing and report, fix only what is plainly broken

Dewald has walked both sides and says parts of the flow and both dashboards are
still confusing. This job is a survey, not a rebuild. Scope discipline matters
more here than anywhere else in this handoff.

Walk these on a real phone-width screen, as a person who has never seen it:

- Cold visitor to finished CV, both routes: guided build, and import.
- Cold visitor who taps apply on a job before having a CV or an account.
- Returning seeker logging in: is it obvious what to do next, and does every
  screen have a way back to the dashboard.
- Employer signup to first published advert to first applicant triaged.
- Every dead end, every screen where the next action is unclear, every place
  where a person could reasonably think something saved when it did not.

Then:

- **Fix in this sprint** only things that are plainly broken or one-line
  obvious: a missing back link, a button that lies about what it does, a screen
  with no next action, a label nobody would understand, an orphan page.
- **Do not fix, list instead**, anything that means moving a screen, changing
  the order of the flow, merging or splitting a dashboard, or renaming a
  concept. Those go in the report as a numbered list, each with what is
  confusing, why, and what you would do. That becomes the next handoff.
- Do not redesign either dashboard in this sprint. If you find yourself
  reaching for a layout change, that is a list item.

---

## Out of scope

Do not build any of these, do not half-build them, do not leave stubs.

- Match scores or percentages of any kind, anywhere, for anyone.
- A seeker subscription. There is none and there will not be one.
- Cover letter generation. Parked, trigger is the first 50 paid rebuilds sold.
- Photos on a CV.
- Candidate listing expiry.
- Any ID number field, any bank detail field, any stored uploaded file.
- Changing a login email inside the app.
- Anything touching the Board, Growth or the WhatsApp inbox.

## You decide, without asking

Internal template naming and file structure, how impact facts are stored on a
work entry, the exact checklist thresholds, how the PDF and Word assembly is
shared across five templates, the credit ledger table shape, the example chip
copy per sub-major group, migration file naming.

## Dewald decides, stop and ask

- Final template names shown to people.
- Whether the spelling and wording check stays free (recommendation: yes, it is
  a spelling check and charging for it reads badly).
- The exact wording of the free-versus-paid line on the home page.
- Whether the two free turns should be per CV or per person.

## Acceptance criteria

Verified by walking the real flows at 375px, not by type-check.

1. A work entry with three numbers typed produces impact bullets containing
   exactly those numbers and no others. A work entry with no numbers produces
   clean action bullets and no invented metric.
2. Feeding the AI a job advert demanding a skill the person does not have
   produces a CV that does not claim that skill.
3. All five templates export as PDF and Word, from the same data, with the
   header block correct and no content lost between formats.
4. No template output contains a table, text box, icon, image or second column.
   Check the generated file, not the code.
5. A two-and-a-half page CV comes out at two pages with a named section
   flagged as longest.
6. The download question preselects Word for the portal answer and still allows
   every other combination.
7. Two free turns spend correctly, the third is blocked with an honest
   explanation and a purchase route, and a failed call spends nothing.
8. Buying credits adds five, a tailored rebuild spends one, a failure spends
   none, and the ledger matches.
9. With zero credits, download, apply, edit, import, all templates and being
   found all still work.
10. No page anywhere still claims that nothing on Jobs ever costs money.
11. The CV check appears nowhere in employer-facing views and in no query that
    orders candidates.
12. No horizontal overflow at 375px on anything touched.
13. A CV typed entirely in capitals, with mixed date formats, a pasted +27
    number, double spaces and stray bullet characters comes out correctly
    cased, consistently dated and clean, in all five templates, with not one
    word of meaning changed.
14. A CV with no education and no certifications renders with no empty
    headings.
15. The home page states plainly that the AI invents nothing, and explains
    aiming a CV at a job, before any paywall is reached.
16. The flow walk in Job 9 produced a numbered list of structural problems, and
    nothing on that list was built in this sprint.

## How to report back

One report at the end, in `docs/`. Sections:

- What changed by file, in plain language.
- All new user-facing copy quoted in full for approval, including the free
  versus paid lines and the FAQ entry.
- The five templates described, and what you did to guarantee each survives
  machine reading.
- Exactly what the AI can and cannot do on a tailored rebuild, and how that is
  enforced in code rather than in the prompt.
- Cost per rebuild at real pricing, and the margin on R45 for five.
- The Job 9 list: every structural flow or dashboard problem found, numbered,
  each with what is confusing, why, and what you would do about it. This is the
  most valuable part of the report. Do not shorten it.
- Found and deliberately not fixed.
- Where this brief was wrong about the code.
- The entries owed to `HOUSE-RULES.md`, `MODULES.md` and `CHANGELOG.md`,
  written out ready to paste.

Branch, push, do not merge to main. Merging is Dewald's call.
