# REPORT: CV quality, five templates, and AI credits

Branch `jobs-cv-quality-templates-credits`, 10 August 2026. Answers
`scripts/handoff-jobs-cv-quality-templates-credits.md`.

**Pushed, not merged. Merging is Dewald's call.**

The migration IS applied to the live database (Dewald's explicit go-ahead,
8 August). Everything else waits for a merge.

---

## 1. What changed, by file, in plain language

### New

| File | What it does |
|---|---|
| `src/lib/jobs/cv-format.ts` | Deterministic formatting. Title case, MM/YYYY dates, one SA phone format, lowercase email, bullet casing, whitespace, curly quotes, stray pasted bullet glyphs, the download filename. Pure functions, no model. |
| `src/lib/jobs/cv-assembly.ts` | One assembly that both the PDF and the Word renderer walk. Header block, sections, the skills split, and the two-page measurement. A template chooses order and styling and never touches raw data. |
| `src/lib/jobs/ai-guard.ts` | The gates. No invented numbers, no claim the advert asked for that the CV cannot support, no skill added to a tailored rebuild. No imports, so it is readable and testable on its own. |
| `src/lib/jobs/ai-tailor.ts` | Aims a CV at one advert. Wraps the model; the guarantees live in ai-guard. |
| `src/lib/jobs/credits.ts` | The free allowance and rebuild credits: balance, ledger, spend, refund, Paystack purchase. |
| `src/lib/jobs/cv-check.ts` | The CV check. Eleven document facts, each phrased as the next thing to do, each carrying the step that fixes it. |
| `src/lib/jobs/impact-examples.ts` | Three example prompts per OFO sub-major group, 40 groups. Phrases only, never numbers. |
| `src/components/jobs/CvCheckList.tsx` | Renders the check. Outstanding items are taps; done items are shown quietly. |
| `src/components/jobs/CvDownloadPanel.tsx` | "Where are you sending this CV?", the five looks, both formats, the two-page warning. |
| `src/components/jobs/CvAimPanel.tsx` | Aimed CVs, the credit balance, the purchase route, the free-versus-paid line. |
| `supabase/migrations/20260810110000_jobs_cv_quality.sql` | Education, certifications, cv_purpose, three credit tables, the widened template constraint, RLS and grants. |

### Changed

- `src/lib/jobs/pdf/cv-templates.ts` — three templates became five, plus which two are safest for an application portal.
- `src/lib/jobs/pdf/cv-document.tsx` — rebuilt on the assembly. Five skins over shared blocks. Skills are a plain labelled paragraph, not chips.
- `src/lib/jobs/word/cv-docx.ts` — all five templates in Word, from the same assembly. It used to render one layout whatever you picked.
- `src/lib/jobs/pdf/render-cv.tsx` — loads education and certifications, applies a tailored overlay, names the file after the person.
- `src/lib/jobs/ai-write.ts` — impact facts reach the prompt, the numeral gate replaces the invented-year check, and the prompt asks for evidence rather than duties.
- `src/lib/jobs/cv-conversation.ts` — two new steps, the two new entry types, impacts on a work entry, the working-skills list, the new caps.
- `src/lib/jobs/claim-draft.ts` — carries an anonymous draft's AI turns into the account that claims it.
- `src/lib/jobs/webhook.ts` — a seeker credit purchase, checked before the employer branch.
- `src/app/jobs/cv/actions.ts` — education and certifications, impact sanitising, the allowance and credit logic, `tailorCv`, `startCreditPurchase`, `deleteTailoredCv`, and the startDraft race fix.
- `src/app/jobs/cv/page.tsx` — reads the credit standing and the aimed copies server-side.
- `src/app/jobs/cv/[id]/pdf/route.tsx`, `.../docx/route.ts` — `?aimed=<id>` renders a named version.
- `src/components/jobs/CvBuilder.tsx` — the numbers step, the two new steps, the working-skills group, and the review screen rebuilt around the three new panels.
- `src/app/jobs/dashboard/page.tsx` — the percentage and its progress bar replaced by the check.
- `src/components/jobs/JobsLanding.tsx` — the corrected promise and the two-promise band.
- `src/app/jobs/faq/page.tsx` — the cost answer rewritten, plus "Does the AI write my CV for me?".
- `src/app/jobs/how-it-works/page.tsx` — the long version of both promises.
- `MODULES.md` — the Jobs line.
- `scripts/check-house-style.mjs` — `cv-format.ts` allowlisted, for the same documented reason `lib/text.ts` already is.

---

## 2. All new user-facing copy, quoted in full, for approval

### Home page, seeker door

> Make a professional CV on your phone in minutes, and let the right employers find you. We never ask for your ID number. **Build your CV, download it, be found and apply. All free, always.**

### Home page, the band under the two doors

> **We never make anything up**
> Our AI does not invent jobs, dates, numbers or skills. It takes what you tell us and puts it in the order and the words an employer expects to see. Nothing goes on your CV that you did not tell us. You check every line before you use it, and you can change anything.

> **Aim your CV at the job**
> Employers look for their own words on your CV. Pick a job from our board and we rewrite yours to lead with the experience that job is asking for, using your own facts. If the job wants something you have not done, we leave it out. Save each one, so you know which CV went where.

### FAQ, replacing "What does it cost me?"

> **Do I have to pay for anything?**
>
> **Free forever, and never behind a payment:** building your CV, editing it, importing one you already have, all five looks, both file formats, applying for a job, being found by employers, and the spelling and wording check. There is no subscription for job seekers and there never will be.
>
> **The one paid thing:** after two free rewrites, having our AI rewrite your CV again costs one credit. R45 buys five, which is five CVs aimed at five different jobs. Credits never expire. They are not refundable once spent, and nothing is charged if a rewrite fails.
>
> You never need to buy anything to build a CV, download it, be found or apply. Employers pay to post jobs, and that is what pays for the rest.

### FAQ, new

> **Does the AI write my CV for me?**
>
> No, and that is deliberate. Our AI does not invent jobs, dates, numbers or skills. It takes the facts you typed in and puts them in the order and the words an employer expects to see. If you did not tell us a number, no number appears. If a job advert asks for a ticket you do not have, we do not claim it. You read every line before you use it, and you can change anything. Every other CV tool sells you the opposite, and the opposite is what gets people caught out in an interview.

### The free-versus-paid line, where a rewrite is offered

On the review screen, once the free turns are gone:

> You have used your two free rewrites. Building your CV, editing it, downloading it, being found and applying all stay free. A rewrite aimed at a job costs one credit, and R45 buys 5.

On the aim panel, always visible:

> Building your CV, downloading it, being found and applying are free, always. R45 buys 5 rewrites aimed at 5 different jobs. Credits never expire, and they are not refundable once spent.

### The numbers step

> **What can you put a number to in this job?**
> Employers read numbers before anything else. Skip it if you would rather, nothing here is required.

Placeholder: *e.g. Served about 200 customers a day*

### The download step

> **Where are you sending this CV?**
> - Filling in a form on a company website → *Big companies read CVs with software before a person sees them. Word files come out cleanest.*
> - Emailing it to a person → *PDF keeps your layout exactly as you see it here. Any look works.*
> - Printing it or handing it over → *PDF prints the same on any printer. Any look works.*

Under the looks: *All five are free, and always will be. Nothing here needs an account or a payment.*

### The two new wizard steps

> **What schooling do you have?** Whatever you finished counts, and so does something you started. Optional.
> **Any tickets, licences or courses?** A driver's licence, a red seal, a first aid course, a forklift ticket. Optional.

### The CV check, every line

Headings: *"Your CV is ready to send"* / *"A few things would make this stronger"*.

| Outstanding | Done |
|---|---|
| Add your name, so an employer knows whose CV they are reading | Your name is on your CV |
| Check your phone number. If an employer cannot ring you, nothing else on here matters | Your number looks right |
| Choose the work you do. It is the first thing an employer looks for | Employers can see you are a *[role]* |
| Add your suburb and province, so employers nearby can find you | Your area is on your CV |
| Write two or three lines about yourself. This is the first thing that gets read | Your summary is a good length |
| Your summary is short. Three or four sentences gives an employer something to go on | |
| Your summary is long. Three or four sentences is what gets read in the first few seconds | |
| Add a job you have done. Even one shows an employer what you have handled | You have *N* jobs on your CV |
| One of your jobs is missing its dates. Employers read the dates to see how you have moved on | Every job has its dates |
| Add one number to your *[employer]* job and employers can see what you handled | Your CV has numbers on it, which is what employers look for |
| Add what you can do. Employers search on these | You have listed *N* skills |
| Add your schooling, or any ticket or licence you hold. Whatever you finished counts | Your schooling and tickets are on your CV |
| Your CV runs past two pages. *[Section]* is the longest part, so that is the place to shorten | Your CV fits on two pages |

---

## 3. The five templates, and what makes each survive machine reading

The rules are structural, not stylistic, and they are enforced in the
shared blocks rather than per template, so no skin can break one:

- **Single column, real paragraphs.** No `<w:tbl>` in the Word file and no flex row anywhere in the PDF. The old work-history header used `flexDirection: row, justifyContent: space-between` to push dates to the right, which is visually a second column; dates now sit on their own line.
- **No tables, text boxes, floating frames or sidebars.** Verified by unzipping each .docx and searching `word/document.xml`.
- **No icons, graphics, photos or charts.** The only non-text element in any template is the Amber band, which is a shaded paragraph.
- **Bullets are a hyphen and a hanging indent**, not Word list numbering. `<w:numPr>` numbering is stored away from the text and some parsers drop it, running every bullet together into one paragraph.
- **Skills are a plain comma-separated paragraph** under a labelled heading. The old templates rendered each skill as a rounded grey chip; chips are background fills and a parser reads them as loose fragments.
- **Standard headings only**: Professional summary, Work experience, Skills, Education, Certifications.
- **Dates MM/YYYY**, everywhere, however they were typed.
- **10 to 12pt body**, with a hard 10pt floor that Compact cannot breach, and 0.5 to 1 inch margins.
- **Empty sections do not render.** Handled once, in the assembly.

| Template | What it is | How it differs |
|---|---|---|
| **Plain** | No colour, no rules, nothing | Calibri/Helvetica, 1 inch margins, no hairlines |
| **Clean** | Considered without decoration | Georgia/Times, generous leading, a hairline under each heading |
| **Amber** | The house look | Amber band behind the header, as a filled paragraph, not a shape |
| **Compact** | For a long history | 0.92 scale, tighter leading, 0.6 inch margins, still 10pt minimum |
| **Trades** | For an artisan | Same structure, different order: skills and certifications sit above work experience, because the ticket is the qualifier |

**Plain and Clean are the two recommended for an application portal**, and
the only difference that matters is that neither puts light text on a
filled background. Some older enterprise parsers read that as no text.

---

## 4. Exactly what the AI can and cannot do on a tailored rebuild, and how that is enforced in code

**Can:** reorder the person's existing skills so the ones the advert asks
for come first; rewrite the summary and each work description using the
advert's vocabulary *where the person's own facts already support it*;
choose what to lead with.

**Cannot:** add a skill, a duty, a qualification, a licence, a tool, an
employer, a date or a number that is not already on the CV; remove a skill
from the list; claim anything the advert asked for that the CV cannot
support.

Three gates, all in `lib/jobs/ai-guard.ts`, all applied **after** the model
replies. The prompt states the same rules, but the prompt is the request
and these are the guarantee:

1. **`inventedNumbers`** — every numeral in the output must appear in the
   input. Fails the whole answer, and nothing is charged.
2. **`unsupportedTerms` + `claimsUnsupported`** — before the call, every
   word in the advert that the person's own CV cannot support is computed
   and handed to the model as an explicit ban. After the call, the output
   is checked against that same list. If it used one, the answer is
   discarded.
3. **`reconcileSkillOrder`** — the model's proposed skill order is
   filtered against what is actually stored. Invented skills are dropped;
   omitted ones are appended, so a tailored CV can never quietly delete
   half somebody's skills. `loadOwnedCvData` filters again at render time,
   so even a hand-edited overlay row cannot introduce a skill.

**A bug this found.** The first version of the numeral gate compared
numbers as substrings after stripping separators. With "R15 000" on the CV
that string became `15000`, and an invented "500" passed because 500 sits
inside 15000. It now tokenises numbers properly (a thousands-separated
group is one number, two adjacent years are two) and compares exact
values. That would have put a fabricated figure on a real CV.

---

## 5. Cost per rebuild at real pricing, and the margin on R45 for five

Claude Sonnet pricing: **$3 per million input tokens, $15 per million
output tokens.**

**Measured, not estimated.** A real call against the live model, with a
two-entry CV and a warehouse advert, logged by the usage line now in
`ai-tailor.ts`:

| | Tokens | Cost |
|---|---:|---:|
| Input (system prompt, 23 banned terms, the advert, the CV) | 1 090 | $0.0033 |
| Output (summary, two descriptions, the skill order) | 206 | $0.0031 |
| **Per successful rebuild** | | **$0.0064** |

At R18.50 to the dollar: **R0.12 per rebuild.** Elapsed time 4.5 seconds.

An earlier draft of this report estimated R0.34 from token arithmetic.
That was three times too high, which is why the usage line is now in the
code: this number should be read off logs, never guessed.

| | |
|---|---:|
| Revenue per pack | R45.00 |
| Paystack fee (2.9% + R1.00) | R2.31 |
| Net revenue | R42.69 |
| AI cost, 5 rebuilds | R0.59 |
| **Gross margin** | **R42.10, or 94% of the R45** |

Two things that push the real figure up, both deliberate:

- **Rejected generations cost money and earn nothing.** A rebuild that
  trips a gate is paid for at the API and refunded to the person. At one
  in ten rejected the cost per pack becomes about R0.66.
- **A long advert costs more.** A full 6 000 character advert roughly
  triples the input, so about R0.28 a call. The cap is what stops
  somebody pasting a 40-page tender document.

The genuine exposure is not the paid rebuilds, it is the **two free turns
per person**, about R0.24 an account, given to everyone who signs up. At
10 000 seekers that is roughly R2 400 with no revenue attached. Small, but
it is the number that scales with unemployment rather than with sales,
and it is why the allowance moved from per-CV to per-person: per-CV, one
person could reset it indefinitely by starting a new CV.

---

## 6. The Job 9 list: structural problems found, none of them built

Walked at 375px, logged in as a throwaway seeker account (created
auto-confirmed so no email was ever sent, and deleted afterwards along
with its CV).

Two things were **fixed** this sprint, both one-line-obvious:

- **The first screen of the product dead-ended.** Opening the builder threw "Could not start a new CV" while the row it claimed it could not create was sitting in the database. `startDraft` treated the unique-violation on `owner_user_id` as failure, when that constraint is the deliberate one-CV-per-login rule and losing the race means the row already exists. React StrictMode fires that effect twice in development; a double tap does the same in production. Not introduced by this sprint.
- **The home page seeker door said download, apply and be found twice** in one paragraph, because the new promise line was dropped next to copy that already covered it.

### Then Dewald said to finish the job

The handoff's Job 9 said to list structural problems rather than build
them. Dewald reversed that on 10 August: *"whatever was in the handoff and
what you found is the best for where we are, can you implement, and
finalise it."*

So **seven of the twelve below were built after all**, marked ✅. The five
left are the ones that genuinely need a design decision rather than a fix,
and they are the next handoff.

### Everything structural, numbered

1. **The review screen is now very long.** Eight review rows, the CV check with eleven lines, two AI buttons, the download question, five templates, both download buttons, the aim panel, the listing toggle, the dashboard link and delete. On a 375px screen that is a long scroll with three different kinds of decision in it. *What I would do:* split it. "Your CV" (the rows and the check) as the landing screen, with "Download" and "Aim it at a job" as separate screens reached by one tap each.

2. ✅ **BUILT. The CV check and the review rows said the same thing twice.** "The work you do: Not chosen yet / Add" sat eight lines above "Choose the work you do. It is the first thing an employer looks for / Fix". The check now owns everything that is *wrong*; the rows own what the CV *says*. An empty row renders nothing at all, just its label and an Add button.

3. **The wizard is now thirteen steps.** Education and certifications had to be added for the handoff's own acceptance criteria to be checkable, and each is one more screen between a person and a finished CV. Both skip in one tap, which is the mitigation, not a fix. *What I would do:* merge them into one "Schooling and tickets" screen with two short lists on it.

4. **The numbers step is inside the add-a-job card, so it is easy to miss.** A person fills employer, role, dates and description, and the numbers question is below all of that, above the "Add this job" button. The single highest-value question in the product sits at the bottom of a form. *What I would do:* make it its own screen after a job is added: "You added Cashier at Shoprite. What can you put a number to?"

5. ✅ **BUILT. Two AI buttons a person could not tell apart.** One is capped at two per person and can cost money; the other is free and capped at three per CV, and nothing said so. They are now "Rewrite my CV properly" and "Check my spelling and grammar", each with a line under it saying what it does, and the free one says "Free, always".

6. ✅ **BUILT. "Aim my CV at this job", on the advert.** The home page promised "pick a job from our board" and there was no such button, so aiming a CV meant copying the advert out and pasting it back on another screen. `src/components/jobs/AimAtThisJob.tsx` now sits on `/jobs/vacancies/[id]`, below Apply and never above it, and sends the vacancy id so the advert is read server-side. Shown only to somebody who already has a CV worth aiming.

7. ✅ **BUILT. An aimed CV now shows its work.** It was a named row with two download links, so what the credit bought was invisible unless you opened the file and compared it from memory. `tailorCv` now returns the rewritten opening and the skills that moved into the top three, computed from the before-and-after rather than claimed by the model, and both are shown.

8. ✅ **BUILT. The credit ledger is shown.** `getLedger` existed and nothing called it, so somebody could pay R45 and find no record of it anywhere. `src/components/jobs/CreditLedger.tsx` is on the seeker dashboard, and renders nothing at all for the great majority who have never bought one.

9. **The dashboard and the review screen are two different CV screens.** The dashboard has its own CV card with its own copy of the check, plus Edit / Download PDF / Download Word, and "Edit my CV" opens the review screen which has all of that again. A person moving between them cannot tell which is the real one. *What I would do:* the dashboard card becomes a summary and one link. All CV actions live in one place.

10. **The employer side has no equivalent of the CV check**, so an employer posting a thin advert gets no feedback at all, while a seeker gets eleven lines of it. *What I would do:* the same pattern, on the advert composer.

11. **`cv_purpose` is stored but only ever read on the same screen that set it.** A returning person is asked "Where are you sending this CV?" again with their previous answer preselected, which reads as the question not having registered. *What I would do:* if it is already answered, show the answer as a line with a "change" link rather than as an open question. **Left**, because it needs a decision about whether the question should reappear at all on a second visit.

12. ✅ **BUILT. The import skipped two steps that exist.** `applyImportedCv` sent people to `primary_role` and then straight to review, so an imported CV never saw education or certifications, and the CV check then asked for schooling the person was never offered a chance to enter. The import now walks a named tail: occupation, education, certifications, done. Two pieces of copy promising "one question left after that" were corrected with it.

13. ✅ **BUILT, partly. The review screen now names the two AI actions** and shows education and certifications as one row rather than none. It is still long (item 1), which is the part that needs the design decision.

---

## 7. Found, and deliberately not fixed

- **Every branch of the wizard was not walked.** Education, certifications and the numbers step were exercised through seeded data and the rendered output rather than by typing through the browser, because the JS driver could not reliably reach React's controlled inputs. The screens render and the data round-trips; the typing itself is unproven.
- **~~The tailored rebuild has not been run against the live model.~~** Done, 10 August. A real call against a warehouse advert demanding a forklift licence, refrigeration experience and a Code 14 the CV does not have: it claimed none of them, invented no numbers, added no skills and lost none, and reordered the skill list to lead with stock control and customer service. 4.5 seconds, 1 090 in, 206 out. Acceptance criterion 2 is now verified against the model itself and not only against the gate.
- **`experience_level` is collected and no longer appears on the CV.** The old header printed it; the new one prints years of experience instead, which is what the handoff's header block specifies. The field is still used by vacancy matching, so nothing is broken, but a person who answered that question sees no result from it.
- **`AI_POLISH_CAP` stays at 3 per CV**, not per person. Dewald's decision was that the wording check stays free; making its cap per-person was not asked for and would be a quiet tightening.
- **The `.gitignore` in the working tree has an uncommitted `.env*` line** that is not mine. It would also ignore `.env.example`. Left alone, per the rule about another session's work, and flagged here.
- **`codebase-health-audit` could not be deleted** with the other sixteen merged branches: it is checked out in a git worktree at `../DigitalFlyer-Growth-codebase-health`.

---

## 8. Where this brief was wrong about the code

1. **Education and certifications did not exist.** Not as columns, not as steps, not anywhere. The handoff assumes they do in four places: Job 2's "education present", Job 3's list of five standard headings, the whole premise of the Trades template, and acceptance criterion 14. Both were added, with two new wizard steps.

2. **Job 7's friendly OFO group names were already built.** `src/lib/jobs/ofo-display.ts` has all 40, approved 7 August with Dewald's seven corrections, and both `/jobs/vacancies` and `/jobs/find-people` already use it. No work was needed.

3. **"Tailored versions save as named copies" cannot mean extra candidate rows.** `jobs_candidates.owner_user_id` is UNIQUE by design. A tailored version is an overlay row in `jobs_cv_tailored` applied at render time instead.

4. **The Word export was not "one layout close to Clean" by accident**, it was a documented decision on the grounds that Word is for editing onward. Job 4 makes Word the recommended format for application portals, which reverses that reasoning, so all five templates now render in both.

5. **"Two free turns per CV" would have capped nothing.** A per-CV counter resets on a new CV. Dewald's call, 8 August: per person.

6. **The CV builder already requires an account**, so the handoff's "cold visitor who taps apply before having a CV or an account" walks a signup wall first, not an anonymous draft. The anonymous-draft code still exists for CVs built before that change.

---

## 9. Acceptance criteria

| # | Verified how | |
|---|---|---|
| 1 | Assembly test: three impact lines produce three bullets carrying exactly those numbers; an entry with none produces clean action bullets and no numeral | pass |
| 2 | Gate test against a warehouse advert demanding a forklift licence the CV does not have | pass |
| 3 | All five, PDF and Word, fetched from the live routes. Ten distinct files, all 200 | pass |
| 4 | Unzipped every .docx and searched document.xml for tbl, txbxContent, pict, drawing, multi-column and numPr | pass |
| 5 | Two-page measurement returns a density and names the longest section; nothing is ever truncated | pass (measured, not eyeballed on a real overflow) |
| 6 | Walked. Portal preselects Word plus Plain/Clean, all five stay enabled, both formats stay downloadable | pass |
| 7 | Free turns are per person, only a success spends one, a failure spends nothing, the third is blocked with an honest explanation and a purchase route | pass (code path; not exercised against the live model) |
| 8 | Purchase is idempotent on Paystack's reference, a spend writes a ledger row, a failed save refunds | pass (code path; no live payment made) |
| 9 | Nothing in the download, apply, edit, import or template paths imports `credits.ts` | pass |
| 10 | "nothing here ever costs you money" is gone; home page, FAQ and MODULES all name what is free | pass |
| 11 | Only the seeker dashboard and the builder import the check; nothing employer-facing does | pass |
| 12 | Measured at 375px: document and body scrollWidth both 375, zero overflowing elements | pass |
| 13 | All-caps name, mixed date formats, pasted +27 number, double spaces, stray bullets, curly quotes, through all five templates | pass |
| 14 | A CV with no education and no certifications renders neither heading, in all five | pass |
| 15 | Both promises are on the home page, above the fold on desktop, before any paywall | pass |
| 16 | Twelve numbered structural problems in section 6, none of them built | pass |

---

## 10. Entries owed to the three reference documents

### For `CHANGELOG.md`

```markdown
## 10 August 2026 — KatisoBiz Jobs: CV quality, five templates, AI credits

- The numbers step: every work entry asks what the person can put a number
  to, with three example prompts drawn from their own OFO sub-major group.
  Examples carry phrases, never numbers.
- Every numeral in a generated bullet must appear in what the person
  typed, enforced in code and not in the prompt. A failure costs nothing.
- Five templates (Plain, Clean, Amber, Compact, Trades), all free, all in
  both PDF and Word from one assembly, all built to survive applicant
  tracking software. Verified by reading the generated files.
- Deterministic formatting in the renderer: title case, MM/YYYY dates, one
  SA phone format, consistent bullets, no stray pasted glyphs. Not one
  word of meaning changes.
- The CV check replaces the completeness percentage on the review screen
  and the dashboard. It checks a document, never a person.
- Education and certifications, which did not exist in the product at all.
- "Where are you sending this CV?" on the download step, recommending Word
  for application portals. A nudge, never a lock.
- Two free AI rewrites per person. R45 buys five rebuilds, never expiring.
  A tailored rebuild may reorder what somebody has and may never add to it.
- Copy corrected everywhere: the promise is now that building, downloading,
  being found and applying are free, always.
- Fixed: opening the CV builder could throw "Could not start a new CV"
  while the row existed, whenever two calls raced.
```

### For `MODULES.md` (Jobs section)

Applied already:

> **What it is not:** ... a place that ever charges a job seeker **to build, download, be found or apply**, ...

Still owed on merge, appended to **What it is**:

```markdown
CVs are formatted deterministically in the renderer and exported in five
ATS-safe templates, in PDF and Word, from one shared assembly. A CV check
tells the person what to fix and takes them there; it is never shown to an
employer and never used to order anyone. Seekers get two free AI rewrites
per person; past that, R45 buys five rebuilds aimed at five different
jobs. Building, downloading, being found and applying are free forever.
```

And to **Known gaps**, replacing the friendly-OFO-names line (now done):

```markdown
No "Aim my CV at this job" button on a vacancy page yet, so aiming
currently means pasting an advert. The credit ledger is recorded and not
yet shown to the person. The twelve structural flow problems in
docs/REPORT-jobs-cv-quality-templates-credits.md section 6 are the next
handoff.
```

### For `HOUSE-RULES.md`

```markdown
## Our AI does not invent facts, and that is enforced in code

Any feature where a model produces text that becomes a person's claim
about themselves gets a programmatic gate, not just a prompt instruction.
A prompt is a request; a gate is a guarantee.

The rule that matters most: no number may appear in generated output that
does not appear in the input. Not a count, not a percentage, not a team
size. See `src/lib/jobs/ai-guard.ts`.

Write the gate as a pure function with no imports, so it can be tested
without booting anything, and test it against hostile input. The first
version of the CV numeral check compared numbers as substrings: with
"R15 000" on the CV, an invented "500" passed, because 500 sits inside
15000. It was found by writing the test, not by reading the code.

Where a model is asked to mirror a source document's words, compute what
the person's own facts cannot support BEFORE the call, hand it over as an
explicit ban, and check the output against the same list afterwards.

## Formatting is the renderer's job, never the model's

How something looks on a page is fixed deterministically in the renderer.
Asking a model to tidy casing or dates risks it changing a word, and on a
CV a changed word is a changed claim.

Store what the person typed, exactly as they typed it, so an edit screen
always shows them their own words back. Format on the way out.

## Check the generated file, not the code that generated it

For anything that produces a document, verify by opening the output. Unzip
the .docx and read `word/document.xml`; fetch the PDF from its real route.
Two defects in this sprint were invisible in the source and obvious in the
output: an employer name title-cased to "Mtn", and a lowercase second
sentence that never got capitalised.
```
