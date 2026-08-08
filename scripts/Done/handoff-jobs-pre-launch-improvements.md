# Handoff: KatisoBiz Jobs, pre-public improvements

**For Claude Code. Written 7 August 2026.**

**The product is live at jobs.katisobiz.co.za and is not yet public. This is the
cheap time to fix structure. After real CVs exist it stops being cheap.**

---

## Context

First full walkthrough by Dewald. The bones are good, it is light and fast. Three
things are not ready: the taxonomy has no logic, neither side has a working
dashboard, and the home page says too much.

The taxonomy is the one that cannot wait. It is close to impossible to change
once thousands of CVs are filed under it, and it decides whether search and
alerts work at all.

## Goal

A job seeker can build a proper CV, download it, and manage everything from one
sensible dashboard. An employer can post a structured vacancy and see who
applied. Both sides use the same occupational structure so matching works.

---

## Job 1: adopt the OFO taxonomy

**Replace the current category and skill selection entirely.**

Use the **Organising Framework for Occupations (OFO), version 2021**, published
by the Department of Higher Education and Training. It is South Africa's
official occupational classification, aligned with ISCO-08. Version 2021 holds
roughly 1,554 occupations in 10 major groups, each broken down through
sub-major, minor and unit groups to a six-digit occupation code.

- **Source the real list.** DHET and several SETAs publish it. Do not retype it,
  do not generate it, and do not approximate it. If you cannot obtain the full
  official list, stop and tell Dewald rather than inventing a substitute.
- Store the full hierarchy with the six-digit codes. Codes are what make this
  worth using.
- **Selection is a searchable dropdown that narrows as you type**, not blocks of
  buttons. A person types "plumb" and sees the plumbing occupations. The list is
  far too long for browsing.
- A person picks their occupation. **Skills shown are only those belonging to
  that occupation's branch.** A bricklaying skill can never appear under sales
  and marketing. That failure must be structurally impossible, not filtered out.
- Free-text skills are still allowed alongside, but they are stored separately
  and never used for matching.

**Add an experience level**, separate from occupation, as a single choice: New
starter, Experienced, Senior, Management, Executive.

**The same occupation structure and level list are used by employers when posting
a vacancy.** That shared structure is what makes matching work. Do not build two
different pickers.

## Job 2: CV import

**Two routes in, one destination.**

- **Upload an existing CV** as PDF or Word.
- **LinkedIn.** LinkedIn does not permit a third party to pull a member's
  profile, so do not attempt an integration. Instead, guide the person to export
  their own profile from LinkedIn as a PDF and upload that. Write the
  instructions plainly in the interface.

**Both routes parse the document into the structured fields and then discard the
file.** The uploaded file is never stored and never served. This matters: a
stored PDF cannot be searched, cannot be matched, cannot power alerts, and
creates a retention and scraping problem for no benefit.

- Parsed fields are shown to the person for confirmation and correction before
  anything is saved. Never accept a parse silently.
- **Strip ID numbers and bank details during parsing.** South African CVs
  traditionally carry ID numbers. They are never stored, in any field, at any
  point. Show the line: we do not ask for your ID number, and no real employer
  needs it before an interview.
- If parsing fails, fall back to the guided build rather than failing the
  person.

## Job 3: Write with AI

Currently the system only suggests improvements. Add a **Write with AI** action
that drafts the whole CV from what the person has entered.

- The person always sees the result and can edit every part of it before saving.
  Nothing is published without them accepting it.
- It writes in plain South African English. No corporate jargon, no
  motivational-poster language, no invented achievements, qualifications,
  employers or dates. **It may only rewrite what the person actually supplied.**
- **Cap regenerations per CV.** Choose a sensible limit and state it in the
  report. This cost scales with unemployment rather than with revenue, so an
  uncapped regenerate button is a real financial exposure.
- Store the generated output. Never re-run the model to redisplay something
  already generated.
- Use the cheapest model that does the job well.

## Job 4: downloads

The person can download their CV as **PDF and as Word**, both clean and
professional, both free, whether or not they are listed anywhere.

The CV belongs to them. That is the point of the tool.

## Job 5: the job seeker dashboard

Right now completing the flow drops the person on the home screen. That is the
most damaging bug in the product because it makes the whole thing feel broken at
the exact moment the person finished the work.

Build a dashboard as the landing place after login and after completing the CV.
It carries:

- CV status and a completeness indicator, with what is missing
- Edit CV, and download as PDF or Word
- Listing status: listed or not, with the days remaining and a one-tap renew
- Availability: available now, available from a date, or not looking
- Jobs applied for, with status per application
- Job alerts matching their occupation and area
- Profile and contact details

Familiar and simple. The reference point is a professional profile page, not a
form. Phone first, light, low data.

## Job 6: employer job posting structure

The current post has too little structure. Make it a form with required fields,
the same approach used on the Board.

Required: job title chosen from the OFO list, experience level, area or town,
employment type (permanent, contract, temporary, part-time), when the role
starts, and a closing date.

Required detail sections: duties and responsibilities, non-negotiable
requirements, preferred requirements, qualifications required, and what the
selection process looks like and what applicants can expect.

Optional: salary range, and whether it is shown publicly.

- **Write with AI is available here too**, on the same rules. It may only
  restate what the employer supplied.
- **A preview and review step before publishing.** The employer sees the advert
  as an applicant will see it.
- **Hard rule, enforced automatically: no employer may request payment from an
  applicant for anything.** Training, uniform, transport, placement, admin. Any
  post mentioning it is held for review, not published. The advance-fee job scam
  is the most common in the country and it will arrive the week this goes
  public.

## Job 7: the employer dashboard

- Jobs posted, with status: draft, live, closed, expired
- Applicants per job, with status per applicant: new, reviewing, shortlisted,
  declined
- View a full CV, which is what the employer registration exists for
- Post a new job, edit, close, repost
- Saved candidates
- Account and billing

**Every full CV view is logged against the employer account.** That is the
anti-scraping control and it is not optional.

## Job 8: navigation

Walk both sides end to end and fix the flow. The specific rules:

- Logging in always lands somewhere useful, never the home page
- Completing any flow lands on the dashboard with confirmation of what happened
- Every screen has an obvious way back and an obvious next step
- The main menu differs by who is logged in: seeker, employer, or nobody
- Nothing dead-ends

## Job 9: the home page

Far less text. The structure:

- One line saying what this is
- **Two clean sections: I am looking for work, and I have a job to fill.** Each
  says in a few words what you get and what you can do, then one button
- **Live counters:** people looking for work, and jobs available. Show the real
  number even when it is zero. Never inflate it, never fake it, never round it up
- **A running board of available jobs**, cycling through live vacancies. When
  there are none, it stays hidden rather than showing placeholders
- How to get started, in three short steps per side

No walls of text anywhere.

## Job 10: colour and personality

The site needs personality. Bring in colour drawn from the KatisoBiz palette so
it reads as part of the same family.

- Use **KJ** as the placeholder mark, styled to match KatisoBiz. Dewald is having
  a proper logo made in the same style, so build the header so the mark can be
  swapped without a rebuild.
- The product name is **KatisoBiz Jobs**.
- Keep it light. This audience is on a phone, often on expensive data. Colour and
  personality must not cost page weight.

---

## Out of scope

- Any match scoring or ranking of people. Alerts only
- Storing any uploaded file after parsing
- Storing ID numbers or bank details anywhere
- Paying to apply, or any charge to a job seeker, ever
- Facebook auto-posting of job seekers. Roles may be posted, people never
- Vouching. That is a later phase
- Growth, the Board, KatisoBiz documents, the WhatsApp inbox

## What you decide, and what needs Dewald

**Decide yourself:** schema for the OFO hierarchy, how the searchable dropdown
is implemented, parsing approach, dashboard layout, regeneration cap, and which
model to use.

**Stop and ask Dewald:** all user-facing copy, the home page wording, the colour
choices, anything that would store a document, and anything that changes what a
job seeker is asked for.

**Never without Dewald:** deleting files, force pushing, secrets or environment
variables, Vercel settings, production data, payment credentials.

Three minute rule applies.

## Acceptance criteria

1. The full official OFO 2021 hierarchy is loaded with six-digit codes, sourced
   not invented
2. Occupation selection is a searchable narrowing dropdown, not blocks
3. A skill from an unrelated branch cannot appear, structurally
4. Experience level exists as a separate field with the five values
5. Employers pick from the identical occupation list and level list
6. A PDF or Word CV can be uploaded, is parsed into fields, is shown for
   confirmation, and **the file is not stored anywhere afterwards**
7. LinkedIn instructions describe exporting and uploading, with no attempted
   integration
8. ID numbers and bank details are stripped during parsing and stored nowhere
9. Write with AI drafts a full CV, is always editable, invents nothing, and is
   capped per CV
10. CV downloads work as both PDF and Word
11. Login and flow completion always land on a dashboard, never the home page
12. The seeker dashboard carries every item listed in job 5
13. The employer dashboard carries every item listed in job 7
14. Every full CV view is logged against the employer account
15. A job post cannot be published without every required field
16. A post requesting payment from applicants is held, not published
17. The employer previews the advert before publishing
18. Home page counters show real numbers, including zero
19. No dead ends anywhere in either flow
20. Nothing listed under Out of scope exists

## Close-out

Per the standing rule: update `HOUSE-RULES.md` with the OFO decision, the
no-stored-files rule and the no-payment-from-applicants rule. Update
`MODULES.md` with the jobs entry, what it is and is not, status and spec file.
Add the `CHANGELOG.md` entry. Delete what this sprint made dead and list every
deletion. Flag any query likely to get slow at scale, particularly occupation
search across a large CV table.

## How to report back

One report at the end. Cover:

1. What changed, by file, in plain language
2. The Vercel preview URL
3. Where the OFO list was obtained, how many occupations loaded, and how the
   hierarchy is stored
4. How you proved an unrelated skill cannot appear
5. What the parser extracts, what it discards, and how you tested that no file
   remains
6. The AI regeneration cap chosen, and the estimated cost per CV built
7. All user-facing copy, quoted in full, for approval
8. The home page structure, described screen by screen
9. What you added to the three reference documents
10. Anything found and deliberately not fixed, and why
11. Anything in this brief that turned out to be wrong about how the code
    actually works
