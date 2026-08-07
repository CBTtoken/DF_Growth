# KatisoBiz Jobs: functional specification and flow map

**For business analyst review before public launch.**
Written 9 August 2026. Covers `jobs.katisobiz.co.za` as it stands after the
public launch work, merged to main and live.

This document is in three parts:

1. **The walkthrough**, step by step, for a job seeker and for an employer.
   This is the map Dewald asked for.
2. **What was broken and what changed**, so the review can check the fixes
   against the complaints.
3. **The functional specification**: rules, states, money, data and the
   things deliberately not built.

Companion documents: `docs/REPORT-jobs-prelaunch.md` (the build before this
one), `docs/REPORT-katisobiz-jobs-sprints-1-2.md` (the original two sprints),
`INTERFACE-STANDARD.md` (the screen rules every page here is held to).

---

## Part 1: The walkthrough

### 1.1 Job seeker, from a cold start

Every step below is what actually happens now. No account is needed until
step 8, and everything before it is free and stays free.

| # | Where | What the person does | What the system does |
|---|---|---|---|
| 1 | `/` home | Reads one line, picks a door | Shows two doors, live counts, and a plain note that we have just opened |
| 2 | Taps **Build my free CV** | | Creates an unclaimed draft row, sets a 30 day cookie, opens question 1 |
| 3 | `/cv` question 1 | Types their name, **or** taps *I already have a CV, upload it instead* | Saves after every answer, so closing the tab loses nothing |
| 4 | Questions 2 to 10 | Number, occupation, years, level, area, availability, skills, work history, about you | Occupation comes from the official OFO 2021 list, up to three, first is the headline. Skills offered are only from that occupation's own branch |
| 5 | `/cv` review | Sees the whole CV in eight labelled sections | Each section has **Edit**, or **Add** if empty |
| 6 | Optional | *Write my CV with AI* (3 per CV) or *Check my spelling and wording* (3 per CV) | Restates supplied facts only, never invents. Shown for editing, applied only on explicit acceptance |
| 7 | Downloads | PDF or Word, in one of three looks | Free, no account, theirs to use anywhere |
| 8 | Taps **Save my CV** | Email, password, typed code from email | Claims the draft row rather than creating a new one, so nothing typed is lost |
| 9 | `/dashboard` | Lands here, never the home page | Completeness bar, what is still missing, applications, matching jobs, their details |
| 10 | Switches on **Let employers find me** | | Now visible in employer search. Name and number show only to logged in employers, and every view is recorded |

**The upload route, steps 3 to 5 compressed:** upload PDF or Word → check
what we read and fix it → answer **one** question (the occupation) → the
finished CV. The file is parsed in request memory and discarded; it is never
stored. ID numbers are stripped from the text before the model sees it.

**Applying, from any job on the board:**

| Who they are | What the apply box says | What happens |
|---|---|---|
| Logged in, CV has a name | "One tap, free." Optional cover message box | Application saved, employer emailed, lands on dashboard with "Application sent" |
| Logged in, no CV yet | "You need a CV before you can apply... we bring you straight back" | Job remembered, sent to build a CV, offered that job by name when finished |
| Not logged in | "Applying is free and takes one tap once you have a CV here" | Same, plus a *Log in* link that also returns them to this job |

### 1.2 Employer, from a cold start

| # | Where | What they do | What the system does |
|---|---|---|---|
| 1 | `/employers` | Reads what it costs | First post free once ever, R45/mo for 5 a month, R69/mo unlimited, free and unlimited for paying Growth and KatisoBiz members |
| 2 | `/employers/signup` | Business name, email, number, password, typed code | Membership is checked at read time by email, never stored as a snapshot |
| 3 | `/employer` | Their dashboard | Post a job, applicants with a new count, browse candidates, their posts, their business details |
| 4 | `/employer/post` | Fills the structured advert | Occupation, level, title, type, area, dates, duties, must have, nice to have, qualifications, selection process, pay with a show or hide choice |
| 5 | Optional | *Tidy my wording with AI* (10 per account per day) | Fixes wording, adds nothing |
| 6 | Preview | Sees the advert exactly as an applicant will | Same component renders both, so the preview cannot drift from the real thing |
| 7 | Publishes | 30 days | Entitlement checked here, not at draft. A post asking a candidate to pay is held for a person to review |
| 8 | Application arrives | Email lands immediately | Who applied, which job, their cover message in full, and a link. The CV stays behind the login |
| 9 | `/employer/applicants` | Triages | Cover message preview on the list. Opening one logs the view, then shows the full CV, contact details and the message |
| 10 | Marks | Reviewing, Shortlisted, Declined, or Save for later | The seeker sees Sent, Being reviewed, Shortlisted, or Not successful this time |

### 1.3 Navigation, by who is looking

The menu is on every page. It is the same component with three link sets.

| Audience | Main action | Everyday links | Log out |
|---|---|---|---|
| Visitor | Log in | Jobs board, I am hiring, How it works, Questions | n/a |
| Job seeker | My dashboard | Jobs board, My CV, How it works, Questions | Yes |
| Employer | My jobs | Applicants, Post a job, Find people, Questions | Yes |

On a phone this is one **Menu** button; on a wider screen everything is
visible. The mobile panel also names who is signed in, which matters on a
shared phone.

---

## Part 2: What was broken, and what changed

Each row is one of Dewald's findings from the 7 August walkthrough.

| # | The complaint | What was actually wrong | What it is now |
|---|---|---|---|
| 1 | No FAQ or How To menus | Neither page existed, and the menu had two links | `/how-it-works` and `/faq` built, both public, both in the sitemap, both linked from the footer of every page and from the home page |
| 2 | We are new and it is all empty | Two honest zeroes with nothing explaining them read as a failed product | A plain line: we have just opened, the board fills as employers post, build your CV now and you are already listed. Numbers stay real; the sentence does the work |
| 3 | A form to ask questions or suggest things | Nothing existed | On `/faq`, Turnstile checked server-side, lands in the existing admin Support inbox tagged as coming from Jobs, plus an email alert |
| 4 | Something about who built this | Nothing said who was behind it | A band on the home page: part of the KatisoBiz range, "Get found. Get the job. Get paid.", a short overview and links to both sites |
| 5 | The seeker logic does not work | Applying while logged out sent them to the CV builder and **forgot the job**. They then built a CV, signed up, and landed on a dashboard having never applied | The job is parked in a cookie and read back after signup, after login, and on the finished CV, which offers that job by name |
| 6 | Cannot edit contact details | The wizard is a straight line, a finished CV opens on its last screen, and Edit my CV reopened that screen. The only way back was ten taps of Back | The review screen is a hub. Eight sections, each with Edit or Add, each opening one question that saves and returns. Name, number and email are also editable directly on the dashboard |
| 7 | Cannot add or edit job history | Same cause | Same fix, plus the section says "Nothing added yet" with an Add tap rather than sitting invisible |
| 8 | Not clear where to import a CV | Reachable only from the home page and a grey underlined line on question 1 | A full width button on question 1, a link on the dashboard, and named in How it works and the FAQ |
| 9 | No option to skip if they have a CV | Import landed on question 3 and walked them through eight more | Import lands on the occupation question, the only one a file cannot answer, and then goes straight to the finished CV |
| 10 | No menus that make sense, both sides | The header rendered on 5 of 19 pages. Both dashboards, the CV builder, the applicants list and the composer had **no menu at all**, and nothing anywhere logged you out | Header mounted in the layout, so every page has it including future ones. Role aware. Log out added |
| 11 | Auto apply with a cover message | Applying existed but took no message, and nothing told the employer | Optional message on the apply box, shown to the employer on the list and above the CV, and emailed to them |
| 12 | Email it to their registered address | No email at all | Sent on every application, to an address the employer can now change |

### 2.1 Two things found while walking it that were not on the list

- **The employer could not change their own business details.** The business
  name is the byline on every advert and the phone number is printed publicly
  on each one. A typo in either was permanent. Now editable, behind a tap on
  the dashboard.
- **A phone number would have been destroyed by the ID number stripper.**
  The rule that removes anything looking like an ID or bank number matches any
  run of 9 to 16 digits, and an SA mobile number is 10. Caught before it
  shipped; the name is stripped, the phone deliberately is not.

---

## Part 3: Functional specification

### 3.1 Money

| Who | What they pay |
|---|---|
| Job seeker | Nothing, ever. Building, downloading, being found and applying are all free. There is no paid tier for seekers |
| Employer, first post | Free, once ever |
| Employer, after that | R45/month for 5 posts per calendar month, or R69/month unlimited |
| Paying Growth or KatisoBiz member | Free and unlimited, always. Derived at read time from their email, never stored |
| Lapsed subscription | Two week grace, live posts stay up, then they come down and the plan reverts to free |

A held post still spends its free post. Deliberate: an unheld retry must not
be a free retry.

### 3.2 States

**Vacancy:** draft → published (30 days) → expired, closed, or held.
Renew adds 30 days. Repost revives a closed or expired post. Held means a
person reviews it before it can go live. Removed is a moderation takedown.
An expired post keeps its public page, marked as no longer open, and never
appears on the board.

**Application:** new → reviewing → shortlisted → declined. The seeker sees
Sent, Being reviewed, Shortlisted, Not successful this time. One application
per person per job, enforced by the database; tapping twice is a no-op, not
a duplicate.

**Candidate:** draft (cookie only) → owned (signed up) → listed or not
listed → deleted. Listings do not expire. Deletion is immediate and final.

### 3.3 Privacy and safety rules

These are promises made on the public pages and they constrain the build.

- **We never ask for an ID number.** There is no field for one. Anything
  matching an ID or bank number typed into free text is replaced with an
  explanatory notice before it is stored, and stripped from uploaded CV text
  before the model sees it.
- **No job post may ask an applicant to pay.** Posts that do are held
  automatically, with the reason logged.
- **Uploaded CV files are never stored.** Parsed in request memory and
  discarded. There is no storage call in the import path.
- **Full candidate details show only to a registered employer, logged in,
  and every view is recorded** in `jobs_record_views`. This is why the
  application email carries a link and not the CV: an attachment cannot be
  logged, cannot be withdrawn when somebody deletes their CV, and one
  forward puts a person's name and number anywhere.
- **Every anonymous form verifies a Turnstile token server-side.** Signup,
  CV import, report a listing, and the new questions form. Rate limits are
  kept but are not the gate: they live in one serverless instance's memory
  and reset on every cold start.

### 3.4 AI, and what it costs

Model `claude-sonnet-5` on all four paths, not the cheapest, because a
fabricated claim on a CV can cost somebody a job.

| Path | Cap |
|---|---|
| Write my CV with AI | 3 per CV |
| Check my spelling and wording | 3 per CV |
| CV import | Turnstile, plus 5 uploads per IP per hour |
| Employer advert tidy | 10 per account per day |

Only successful calls spend a turn, and generated drafts are stored so
redisplay never re-runs the model. Roughly R0.10 per call, about R1.00 worst
case for one CV that uses everything. The exposure to watch is that this
cost scales with unemployment, not with revenue, which is why every path is
capped.

### 3.5 Data added by this work

```sql
alter table public.jobs_applications
  add column if not exists cover_message text,
  add column if not exists notified_at timestamptz;

alter table public.homepage_inquiries
  add column if not exists source text not null default 'homepage';
```

`cover_message` is nullable: applying with no message stays one tap, and the
CV is the application. `notified_at` is what makes "one email per
application" true across retries. `source` lets the admin Support inbox tell
a job seeker's question from a marketplace lead.

Applied to the live database and verified before the dependent code shipped.

### 3.6 Deliberately not built

- **No match scores, ever.** Job alerts on the dashboard are a plain list of
  real matching posts, never a percentage and never a ranked list.
- **No CV attached to any email.** See 3.3.
- **Login email cannot be changed in the app** on either side. Changing it
  needs Supabase to re-verify the address, and cutting somebody off from
  their own account is worse than a stale login address. Both sides can
  change their *contact* email, which is the one that matters for being
  reached. The FAQ says how to ask us to change a login address.
- **Candidate listings do not expire**, so there is no countdown or renew on
  the seeker dashboard. Only vacancies expire.
- **No photo on a CV.** The column exists, nothing displays it.

### 3.7 Open items for the analyst

1. **Resend sender domain.** Application alert emails go out through the
   configured `RESEND_FROM_EMAIL`. Confirm this is the verified custom
   domain and not the shared test sender, which only delivers to our own
   verified address. Everything else works regardless; the employer simply
   would not receive the alert.
2. **Paystack plan codes.** `PAYSTACK_PLAN_JOBS_STARTER` and
   `PAYSTACK_PLAN_JOBS_UNLIMITED` must exist in Vercel for the R45 and R69
   upgrades. Until then the upgrade page fails politely and everything else
   works, including the free first post.
3. **The first real end to end test on the live domain** needs a real inbox,
   because signup uses a typed code. Turnstile also only renders on the real
   hostname.
4. **Three reference documents** (`HOUSE-RULES.md`, `MODULES.md`,
   `CHANGELOG.md`) still live on the unmerged `codebase-health-audit`
   branch. The entries owed by this work are listed in
   `docs/REPORT-jobs-prelaunch.md` section 9, and one more is owed here:
   Jobs' menu is mounted in the layout, not per page.
5. **Empty board at launch.** The honest note is in place, but the first
   real employer posts are what make the product work. Worth deciding
   whether the launch push targets employers before seekers.
