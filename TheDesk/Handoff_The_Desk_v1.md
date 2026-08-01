# CLAUDE CODE HANDOFF: THE DESK v1

**Prepared for Dewald Rosema | DigitalFlyer SA | 1 August 2026**

---

## 1. CONTEXT

Dewald is the sole operator of DigitalFlyer SA, running ten live commitments across two countries while working a day job in Vadodara, India. He is non-technical and directs Claude Code as his build executor.

The Desk is a private, single-user tool. It is not a product, it has no members, no payments, no public pages and no second user. It exists because the operator is holding roughly forty open threads in his head, which is causing sleep loss and decision paralysis.

It is not a productivity app and it must not become one. The design premise is that the constraint is not hours, it is capacity. The same person has very different capacity on different days, and every existing tool hands him the same list regardless. The Desk hands him one thing, matched to the state he is actually in.

**Two facts about the operator's day that drive the design:**

- He works 07:00 to 12:00 and 17:00 to 19:00 India time on his day job. His free window is 12:00 to 17:00 India, which is 08:30 to 13:30 in South Africa. That is his market's prime working morning, so all human-dependent work belongs there.
- Roughly half his load is blocked by other people, and he currently carries all of it in his head.

**Hard constraint on this build: it ships this weekend or it has failed.** A tool built to reduce overload cannot itself become another unfinished project. Build small, ugly and working. Polish is out of scope.

---

## 2. GOAL

A phone-first web app that does exactly three things:

1. **Holds everything.** One capture box. No categories required at the moment of capture.
2. **Knows who is blocking what.** Every item is blocked by the operator, by a named person, or by a date. Items blocked by other people move off his list onto a visible waiting list.
3. **Hands him one thing.** He selects his state. The Desk returns a single item. Not a list.

Plus one static register: every domain, subscription, account and recurring cost he pays for, personal and business, with renewal dates and monthly Rand cost.

---

## 3. WHAT TO BUILD

### 3.1 Where it lives

- Inside the **existing Growth Supabase project**. Do not create a new Supabase project.
- Served on **desk.katisobiz.co.za**. This is decided, do not ask.
- **Single user.** One login, his. No signup page, no password reset flow, no user management. Seed the single account manually.
- **`noindex, nofollow` header on every page.** No sitemap entry. No link to it from any DigitalFlyer property.
- Must work well on a phone in a browser. Desktop is secondary. Assume it is used one-handed.

### 3.2 Data model

**Table: `items`**

| Field | Notes |
| --- | --- |
| `id` | primary key |
| `title` | short, free text, the only required field at capture |
| `area` | `personal` or `business`. Default `business`. Editable later, never asked at capture. |
| `venture` | free text tag, e.g. Growth, KatisoBiz, SVC, Moxie, HelpLift, FortisLex, Alite, Board, CBT, Desk, Personal. Nullable. |
| `next_action` | one sentence, what the literal next physical step is. Nullable. |
| `effort` | `shallow` or `deep`. Nullable, defaults to `shallow`. |
| `blocked_by` | `me`, or a person's name, or `date`. Default `me`. |
| `blocked_since` | date, set automatically when `blocked_by` changes to a person |
| `due_date` | nullable |
| `status` | `open`, `done`, `parked`, `killed`. Default `open`. |
| `park_trigger` | free text. **Required when status is set to `parked`.** See 3.6. |
| `skip_count` | integer, default 0 |
| `notes` | free text, nullable |
| `created_at`, `updated_at` | timestamps |

**Table: `assets`**

| Field | Notes |
| --- | --- |
| `id` | primary key |
| `name` | e.g. "vowie.digitalflyer.biz" |
| `type` | `domain`, `subscription`, `account`, `tool`, `other` |
| `provider` | e.g. registrar name, vendor name |
| `area` | `personal` or `business` |
| `cost_zar_monthly` | numeric, nullable. Store annual costs divided by twelve and note the real billing cycle. |
| `billing_cycle` | `monthly`, `annual`, `once`, `unknown` |
| `renewal_date` | nullable |
| `where_login_lives` | free text, e.g. "password manager", "unknown" |
| `status` | `active`, `cancel`, `unknown` |
| `notes` | free text |

Do not store passwords, API keys or secrets in this table or anywhere in this application. The `where_login_lives` field is a pointer only, in plain words.

### 3.3 The four screens

**Screen 1: Dump.** A single large text box and a save button. Type a line, save, box clears, ready for the next. Nothing else on the screen. No dropdowns, no tags, no required fields. This screen must be usable in under five seconds.

**Input handling, important.** The operator is dyslexic and types fast and loose. Do not run spellcheck, do not autocorrect, do not underline or flag anything as an error, do not validate text input beyond checking it is not empty. A red squiggle in the capture box will kill the habit. Set `spellcheck="false"` on the capture field.

**Bulk paste.** The capture box accepts multi-line paste. On save, each non-empty line becomes a separate item. This is how the operator will move a whole session's worth of thinking in at once. Do not try to parse structure out of pasted lines, one line equals one item, nothing clever.

**Screen 1c: Export.** One button, one job, and it matters more than it looks.

It renders the full current state as plain markdown text in a copyable block: open items grouped by venture with next action and effort, the Waiting On list with days elapsed and who, anything parked with its trigger, and the Register totals. Nothing else, no styling, no JSON.

The operator works with Claude across several separate projects and with Claude Code, and none of those can see this database. The export is the bridge. He copies it into whatever session he is in, so the Desk is the single source of truth for status everywhere, without any integration. Keep the output tight enough to paste into a chat without eating the whole context.

Also expose the same output at a `GET` text endpoint behind the same auth, so it can be fetched rather than copied when that is easier.

**Screen 1b: Triage.** The one place an LLM is used in v1, and it does exactly one job.

A **Sort** button on the Dump screen takes all items where `next_action` is null and sends them to the Anthropic API in a single batched call. For each item it proposes four fields only: `area`, `venture`, `effort` and a one-sentence `next_action`. It returns them as a plain list on screen, each editable, with a single **Accept all** button and per-row edit.

Rules for the triage call:

- It proposes, it never writes directly to the database. Nothing is saved until the operator accepts.
- It never rewrites, corrects or tidies the `title`. The operator's own words stay exactly as typed, misspellings included.
- It never invents an item, merges two items, or splits one.
- If it cannot confidently propose a `venture`, it leaves it null rather than guessing.
- `next_action` must be a physical next step someone could do, not a restatement of the title. "Email Xneelo support to ask which registrar holds the domain" is right. "Sort out the domain" is wrong.
- One call for the whole batch, not one call per item.
- No conversation, no chat interface, no companion voice. That is v2.

**Screen 2: Today.** Three large buttons: **Wrecked**, **Normal**, **Sharp**. He taps one. The Desk returns **one item**, showing title, next action, venture and how long it has been open. Three buttons under it: **Done**, **Skip**, **Blocked by someone**.

Selection logic, plain rules only, no AI in v1:

- **Wrecked:** oldest open item where `effort = shallow` and `blocked_by = me`.
- **Sharp:** oldest open item where `effort = deep` and `blocked_by = me`.
- **Normal:** open items where `blocked_by = me`, ordered by `due_date` ascending with nulls last, then by `created_at` ascending.
- In all three cases, items with a higher `skip_count` sort later. Never return an item blocked by another person.
- **Skip** increments `skip_count` and immediately returns the next item under the same rule.
- **Blocked by someone** prompts for a name, sets `blocked_by`, sets `blocked_since` to today, and moves the item to Screen 3.

**Screen 3: Waiting On.** Every item where `blocked_by` is a person or a date, grouped by person, showing how many days it has been waiting. Two actions per item: **Unblock** (returns it to his list) and **Nudge sent** (resets `blocked_since` to today). This screen is the point of the whole tool. It must show, at a glance, how much of his load is not actually his right now.

**Screen 4: Register.** A plain table of the `assets` records, filterable by `area`, sortable by `renewal_date` and `cost_zar_monthly`. Show a total monthly Rand figure at the top, split personal and business. Renewals inside 30 days appear highlighted at the top of the table. Add and edit inline.

A simple everything-view with filters is acceptable as a fifth screen if it costs you almost nothing. It is not required.

### 3.4 Seed data

Load the following into `items` at build time with `status = open` and `blocked_by = me` unless stated. These were extracted from Dewald's own written record and his master reference pending changes. He will correct them, so make every field editable and make bulk editing tolerable.

Where a row says `blocked_by`, set it accordingly.

**Growth**
1. Bob Go courier plugin not sorted
2. Booking module needs proper testing (appointments, calendar, BnB-type)
3. Events module needs testing
4. Set Paystack as the standard member payment gateway
5. Old BizUp description may still be live on the Growth pricing page
6. Growth members' room, handoff written, real gate is ten founding members recruited personally

**KatisoBiz**
7. Position the KatisoBiz name as the toolset brand under DigitalFlyer SA
8. Backlog: client-side Approve / Change / Decline taps
9. Backlog: reminder ladder, days 3, 6, 7 for estimates and 3, 7, 14 for invoices
10. Backlog: five reports (monthly, date range, client, outstanding, VAT)
11. Backlog: status dashboard
12. KatisoBiz to Growth upgrade path, recommended for verification list, unconfirmed

**The Board**
13. Sit down and test The Board properly
14. Data retention must be settled and audited before Phase 3, blocking

**WhatsApp switchboard**
15. Decide which number the switchboard runs on, blocking build
16. Trade category list split into urgent and scheduled, blocking build
17. Ten initial stored answers for the sales and support doors

**Verification and risk**
18. Paystack account collision, one test-mode account shared across four products, blocks payment work anywhere
19. Netcash legacy migration, confirm whether members with connected Netcash accounts were ever moved
20. Renewal webhook bug, verify resolved
21. Plaintext password collection in the old RE:Biz intake form, remediation status unknown
22. Competition law price signalling risk, not yet addressed, needs attorney
23. HelpLift real-data gate, still open while the platform is live and in testing, `effort = deep`
24. Google Business Profile dispositions, awaiting Dewald's confirmation

**SVC**
25. Fix the Moxie production pipeline so layout is print-ready and does not need hand repair in Adobe Express, `effort = deep`
26. Rebuild the SVC membership platform, onboarding is currently leaking users, `effort = deep`
27. Moxie eMag, monthly, out on the 1st, recurring
28. Brief Samantha on social media material and assets as a written handoff, not a conversation

**CBT / DFGT token**
29. Token disposition: revive, wind down publicly, or separate from the DigitalFlyer name, `effort = deep`, `blocked_by = date`
30. Team page and CTO LinkedIn URL error on the whitepaper

**Vowie**
31. Find where the Vowie domain is registered and who it is with
32. Take down or repoint vowie.digitalflyer.biz, Facebook /vowieme and Instagram /vowie.us

**Personal and working practice**
33. Write the three standing reply templates (I can, but X moves / I can, not before the 14th / I cannot)
34. Switch Jaco and Samantha from conversations to written handoffs
35. Go-away package, personal version: document, logins in a password manager with emergency contact set, one person told where it is, `area = personal`
36. Standing weekly grocery buy, no-cook items, `area = personal`
37. Stairs up as well as down, `area = personal`

**Writing**
38. Standing 365, published and selling in print and on Amazon, no marketing behind it
39. Standing 365 order management, decide how orders are taken and fulfilled
40. Sell Standing 365 through the Growth shop module, which also tests the shop with a real product
41. The novel, working titles Next 50 or Funeralable, `status = parked`, `park_trigger = "Back in South Africa permanently"`, `area = personal`

**Parked with triggers**
42. KatisoBiz own chat and messenger layer as the WhatsApp alternative, `status = parked`, `park_trigger = "The Desk is public and members are asking for a mobile capture route"`

**Blocked by others at time of writing**
43. FortisLex sprint approvals, `blocked_by = FortisLex`
44. SVC partnership negotiations, `blocked_by = Jaco`

Note on SVC: the operator is now the development team for both SVC and Moxie. Nothing on those two is blocked by anyone else. Set items 25 and 26 to `blocked_by = me`.

Seed the `assets` table with these known rows and leave the rest for Dewald: digitalflyer.com, digitalflyer.biz, vowie.digitalflyer.biz (provider unknown, this is the point), Supabase, Paystack, Anthropic, Meta Cloud API, Adobe Express.

### 3.5 What must not be built

Absent from v1, deliberately, and not to be added on your own judgement:

- No notifications, no email, no push, no badges, no unread counts anywhere in the interface. This is a hard rule. The operator's stated pain is unread indicators.
- No calendar view.
- No AI beyond the triage function in 3.3. No conversational layer, no companion voice, no generated summaries, no daily briefings, no suggestions outside triage.
- No WhatsApp integration and no voice note capture.
- No second user, no sharing, no invites, no permissions.
- No charts, dashboards, streaks, scores, progress bars or gamification.
- No reply or message drafting.
- No mobile app. Browser only.
- No dark mode toggle, no theme settings, no onboarding tour.

### 3.6 The one rule to enforce in code

An item can only leave the list in three ways: **done**, **parked with a written trigger**, or **killed with a date**. The form must not allow `status = parked` to save with an empty `park_trigger`. This mirrors the operating rule the whole portfolio runs on and it is the single most important behaviour in the tool.

---

## 4. OUT OF SCOPE

Everything in 3.5. Also: no changes to Growth, KatisoBiz, The Board or any existing table in the Growth Supabase project. The Desk adds two new tables and touches nothing else. If you find yourself needing to modify existing schema, stop and report it rather than proceeding.

Do not touch, reference or attempt to migrate anything relating to Make.com, Airtable, 360dialog or Netcash. All four are retired.

---

## 5. WHAT YOU DECIDE VERSUS WHAT NEEDS DEWALD

**You decide, without asking:**
- Framework, styling approach, component structure, routing
- Auth mechanism for the single user
- Table and index design beyond the fields specified
- Deployment method
- Anything cosmetic

**Stop and ask Dewald:**
- Anything that requires touching existing Growth tables
- Anything that would require a new paid service or increase the monthly cost base
- Any case where a requirement in section 3 appears to contradict another
- Any point where you believe a feature listed in 3.5 is genuinely necessary. Do not add it. Report it.

---

## 6. ACCEPTANCE CRITERIA

1. A new item can be captured in under five seconds on a phone, typing only a title.
2. Tapping Wrecked, Normal or Sharp returns exactly one item, never a list.
3. Skip returns a different item immediately and increments `skip_count`.
4. Marking an item blocked by a named person removes it from the Today rotation entirely and shows it on Waiting On.
5. Waiting On shows days elapsed per item, grouped by person.
6. Attempting to park an item without a trigger fails with a clear message.
7. The Register shows a correct total monthly Rand figure, split personal and business, and highlights renewals inside 30 days.
8. Every page returns a `noindex, nofollow` header. Verify by fetching a page and checking the response headers directly.
9. No notification, badge or unread indicator appears anywhere in the interface.
10. All 44 seed items and the seed assets are present and editable.
16. Pasting five lines into the capture box creates five separate items.
17. Export produces plain markdown covering open items, Waiting On with days elapsed, parked items with triggers, and Register totals, and the same output is reachable at a text endpoint behind auth.
13. The capture field does not spellcheck, autocorrect or visually flag any text.
14. Sort proposes `area`, `venture`, `effort` and `next_action` for untriaged items in one batched call, writes nothing until accepted, and leaves every `title` byte-identical to what was typed.
15. Screen 2 shows a plain list of what was marked Done today. No count elsewhere, no streak, no score.
11. Fetching any page without a valid session returns a login prompt, not content.
12. No password, API key or secret is stored in either table.

---

## 7. HOW TO REPORT BACK

One consolidated report at the end. Not per feature.

Cover: what was built, the final subdomain, the two table schemas as built, every acceptance criterion and whether it passed, the result of the header check in criterion 8, anything in section 3 that turned out to be contradictory or impossible, and any decision you made that this document did not cover.

If the build cannot be completed in a day, report what is working and stop. A partial Desk that captures and hands back one item is more useful than a complete one delivered next week.

---

*Handoff prepared 1 August 2026. Legal questions arising from item 22 and item 29 go to Dewald's attorney, not to Claude Code.*
