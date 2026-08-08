# Handoff: WhatsApp inbox inside Growth Admin

**DONE 7 August 2026 on branch `whatsapp-inbox`, awaiting Dewald's copy
approval and merge. Full report: docs/REPORT-whatsapp-inbox.md.**

**For Claude Code. Written 6 August 2026.**

**This sprint runs after the unified account sprint, not alongside it.**

---

## Context

DigitalFlyer has no public-facing WhatsApp number. Dewald operates from India
and cannot run a South African business number on a handset, because a number
used on the WhatsApp Cloud API cannot also have a WhatsApp account registered on
it, personal or Business app.

The answer is to run the number on the Cloud API and build the inbox inside
Growth Admin, using Growth's existing Supabase project. No new vendor.

A fresh South African number is being verified separately by Dewald. The Meta
Business account, page and pixel already exist and the Facebook auto-posting
integration already runs against them, so the account plumbing is in place.

**What this is not.** There is no matching engine, no provider ranking, no wave
dispatch, no automated job routing. An earlier plan described a switchboard that
does all of that. It is not being built. Dewald personally handles every job
request that arrives, by hand, reading the marketplace himself. Nothing in this
build should assume otherwise or leave hooks for it.

## Goal

One screen in Growth Admin where Dewald reads and answers every WhatsApp
message, with the routine answers handled automatically so he only types the
things that need a human.

---

## What to build

### 1. Connection and message storage

- Receive inbound messages by webhook and store them in Growth's Supabase.
- Send outbound messages through the Cloud API.
- Handle delivery and read states, and surface send failures visibly in the
  inbox rather than only in logs. A message that silently failed to send is the
  worst possible outcome here.
- Webhooks on preview deployments need the Vercel protection bypass appended to
  the webhook URL. This has caught us before.

### 2. The three doors

Anyone messaging for the first time gets an automatic reply immediately, with
three tap buttons. No intent model, no guessing, no generated text.

1. I need someone for a job
2. I am a member and need help
3. I want to join

The choice is stored on the conversation and drives its label. Buttons are used
throughout rather than free typing wherever a question has a known set of
answers, because a tap cannot be misread.

Dewald approves the exact wording of this reply before it goes live.

### 3. Door behaviour

**Door 1, job request.** Ask three things by button or short reply: what kind of
work, which suburb, how urgent. Store those three fields on the conversation as
structured data, not only as message text. Then hand to Dewald. He matches by
hand and sends the client a member's Growth page link. Member phone numbers are
never sent to a client by this system.

**Door 2, member support.** Offer the saved answers as tap buttons. Anything not
covered goes to Dewald.

**Door 3, wants to join.** One qualifying question, whether they want to get
found or to quote and invoice, then the matching link. Then Dewald.

### 4. The saved answer library

- Admin screen where Dewald writes, edits and orders fixed answers, each with a
  short button label and the full reply text.
- Answers are grouped so a door can offer the relevant set as buttons.
- Every answer is fixed text that Dewald wrote. Nothing in this system generates
  a reply.
- **Hard rule: pricing, tax and anything SARS-related is answered only from
  approved fixed text.** Never generated, never assembled, never paraphrased.
- Dewald can insert any saved answer into a live conversation with one tap.

### 5. The inbox

One screen. Conversations newest first, unread count visible.

Per conversation:

- The full thread
- Which door they came through
- Labels
- The three structured fields, where door 1 collected them
- **The 24 hour window countdown**, and an unmistakable state when it has closed
- Saved answers one tap away
- A free text reply box

Labels, at minimum: job request, member support, joining, unmatched, converted,
declined, resolved. Dewald can add more.

Dewald needs a notification when a conversation needs him. Use whatever
notification path Growth Admin already has rather than adding a new one.

### 6. The window rule

Customer-initiated conversations, and every reply inside 24 hours, are free.
Every inbound message from the client, including a thumbs up or a one word
thanks, resets the window.

- Show the countdown per conversation.
- **Only for threads that have gone silent**, at roughly hour 20, offer Dewald a
  one tap nudge that asks a question, since a question invites a reply and a
  reply reopens the window. It is offered to him, never sent automatically.
- Never send this to a conversation where the client has replied recently.
- Once the window has closed, make it plain that a plain reply will not deliver
  and that reopening requires an approved template.

### 7. Retention, and this is not optional

Personal information of non-members is being stored. Build the cleanup in from
the start.

**Split every conversation into two records.**

- **The conversation.** Name, number, message text, everything identifying.
  Deleted automatically on a timer once the conversation is marked with an
  outcome. Deletion is automatic and scheduled, not a button someone remembers
  to press.
- **The demand line.** Trade, suburb, date, outcome. No name, no number, no
  message text, nothing pointing at a person. Kept indefinitely. This is the
  recruitment map and it must survive the cleanup.

**The retention period is configurable and is not yours to choose.** Dewald is
waiting on his attorney. Build it as a setting, default it to 72 hours, and do
not treat that default as approved. Log every automatic deletion.

Verify that a demand line survives after its conversation has been deleted. That
is the acceptance test that matters most in this whole sprint.

---

## Out of scope

- Any matching, ranking, dispatch or automated routing of job requests
- Anything in the old `whatsapp` folder. Do not reuse it. Do not read it for
  patterns
- Outbound marketing messages of any kind
- Message templates beyond what is needed to reopen a closed window
- Any AI-generated reply text, anywhere, for any reason
- Member-to-member messaging and the Members' Room
- The Board
- Changing the number, the Meta Business account or the Facebook poster

## What you decide, and what needs Dewald

**Decide yourself:** schema, table design, webhook handling, how the countdown
is calculated and displayed, admin screen layout, how notifications hook into
what already exists, and the structure of the demand line table.

**Stop and ask Dewald:** the exact wording of the three door reply, the wording
of any question the system asks, the wording of the hour 20 nudge, the retention
period before go-live, and any template copy submitted to Meta.

**Never without Dewald:** deleting files, force pushing, touching secrets or
environment variables, changing Vercel settings, production data, and payment
credentials.

If you need a decision and Dewald has not answered in three minutes, carry on
with what you can and raise it in the report. Only halt when there is nothing
else to do.

## Acceptance criteria

1. An inbound message from a new number produces the three door reply within
   seconds, with working tap buttons
2. Choosing a door stores the choice and labels the conversation
3. Door 1 collects trade, suburb and urgency as structured fields, not only as
   message text
4. No member phone number is ever sent to a client by this system
5. Dewald can reply from Growth Admin and the message arrives on the client's
   phone
6. A failed send is visible in the inbox, not only in logs
7. The window countdown is correct, and an inbound thumbs up resets it
8. The hour 20 nudge is offered only for silent threads and never sends by
   itself
9. A closed window is unmistakable in the interface
10. Saved answers can be created, edited and inserted with one tap
11. No reply text anywhere in the system is generated rather than written by
    Dewald
12. The retention period is a setting, and automatic deletion runs on schedule
    and is logged
13. **After a conversation is deleted, its demand line still exists, carrying
    trade, suburb, date and outcome, and carrying nothing identifying**
14. Webhooks work on a preview deployment with the protection bypass in place
15. Nothing listed under Out of scope has changed

## How to report back

One report at the end. Cover:

1. What changed, by file, in plain language
2. The Vercel preview URL
3. Every piece of copy the system can send, quoted in full, for approval
4. What a demand line contains, field by field, so Dewald can confirm nothing
   identifying survives cleanup
5. How the retention timer is triggered and what happens to a conversation never
   marked with an outcome
6. Any Meta requirement you hit that is not covered in this brief
7. Anything found and deliberately not fixed, and why
8. Anything in this brief that turned out to be wrong about how the code
   actually works
