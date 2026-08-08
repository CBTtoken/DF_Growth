# Report: WhatsApp inbox inside Growth Admin

**Sprint: scripts/handoff-whatsapp-inbox.md. Built 7 August 2026, on branch
`whatsapp-inbox`, not merged to main.**

Everything in the handoff is built and verified end to end against a local
stand-in for Meta's API, because the real number is still waiting on Meta
verification. The minute the number is verified, going live is three
environment variables and one webhook registration, listed under "Going
live" below. No code change will be needed.

---

## 1. What changed, by file

**The webhook** (`src/app/api/whatsapp/webhook/route.ts`). The same URL the
Meta app already points at, rewritten to feed the new inbox. It checks
Meta's signature, stores every message, answers with the three doors, and
now also processes delivery receipts, which the old code threw away. A
failed send therefore shows up in the inbox, not only in a log.

**The engine** (`src/lib/wa-inbox/`, nine small files). Webhook parsing,
the doors state machine, sending, delivery statuses, the 24 hour window
maths, and the needs-you email. Every reply the system sends is a row from
the `wa_bot_copy` table. There is no generated text anywhere, and the code
cannot compose a sentence; if a message falls outside the script the only
thing it does is flag the thread for you.

**The inbox** (`/admin/whatsapp`). One screen, conversations newest first,
with tabs Open, Needs you, Finished. Each row shows who, which door, unread
count, the window countdown, and a red pill if a send failed. Search
appears once the list is long enough to need it.

**The thread** (`/admin/whatsapp/[id]`). The full conversation, the three
job fields (editable), labels, outcome marking with a plain-words warning
about the cleanup timer, the countdown, an unmistakable closed-window
state, the hour 20 nudge offer, saved answers one tap away, and the reply
box. Opening a thread clears its unread badge.

**The library** (`/admin/whatsapp/answers`). Your saved answers, grouped
and orderable; every word the system can say on its own, each with an
Approved tick; and the cleanup settings.

**The cleanup** (`src/app/api/cron/whatsapp-retention/route.ts`, runs
hourly via `vercel.json`). Detail in section 5.

**The admin front door** (`src/app/admin/page.tsx`). A WhatsApp button with
a badge counting conversations waiting on you.

**The schema** (`supabase/migrations/20260807090000_whatsapp_inbox.sql`).
Seven new `wa_` tables, already applied to the live database. The July
onboarding bot's code and table are superseded but untouched; say the word
and I will remove them in a follow-up.

## 2. The preview

Branch deployment: https://df-growth-git-whatsapp-inbox-digital-flyer.vercel.app

The admin screens need you to log in as usual. The webhook on this preview
answers only through the Vercel protection bypass, exactly as the handoff
warned: the URL registered with Meta must have
`?x-vercel-protection-bypass=SECRET&x-vercel-set-bypass-cookie=true`
appended, with the secret from Vercel, Settings, Deployment Protection,
Protection Bypass for Automation. Production (main) has no such hurdle.

Verified on the preview: the webhook endpoint answers with the new code's
own response. Verified locally against a stand-in Graph API, end to end:
all three doors, the structured job fields, delivery receipts including a
failure showing loudly in the thread, a thumbs up resetting the window, the
closed-window state hiding the reply box, the nudge sending once and only
once per window, one-tap saved answers, outcome marking, and the retention
sweep. All screens checked at phone width.

## 3. Every piece of copy the system can send, for your approval

All of it sits in the answers screen marked **Draft**. Nothing goes live
until you tick Approved on each row, and you can rewrite any of it right
there, no deploy needed. Button labels are capped at 20 characters by
WhatsApp itself.

**First reply, sent to any new number immediately:**

> Good day, you have reached DigitalFlyer SA. Tap one of the options below
> and we will help you straight away.

with buttons: **Someone for a job** / **I am a member** / **I want to join**

**Door 1, job request:**

> What kind of work do you need done? For example plumbing, painting or
> tiling.

> Which suburb or town should the person work in?

> How soon do you need it done?

with buttons: **Today** / **This week** / **No rush**

> Thank you. Dewald at DigitalFlyer will look at this personally and send
> you a link to the right person. You will hear from us here shortly.

**Door 2, member support:**

> What do you need help with? Tap a question below, or just type your
> message.

with the list button labelled **Choose a question**, the rows being your
saved answers plus **Something else**.

> Thank you. A real person will read this and reply to you here shortly.

**Door 3, wants to join:**

> Lovely. Which of these sounds most like what you need?

with buttons: **Get found online** / **Quotes and invoices**

> DigitalFlyer gets your business found by real customers, with your own
> page on our marketplace. Have a look here:
> https://digitalflyer.co.za/pricing and if you have any questions, just
> ask right here.

> KatisoBiz gives you quotes, invoices and slips from your phone, the
> SARS-ready way. Have a look here: https://katisobiz.co.za and if you
> have any questions, just ask right here.

> Dewald at DigitalFlyer will also see your message and can help you
> personally to get set up.

**The hour 20 nudge, sent only when you tap it:**

> Just checking in, is there anything else you need from us on this? You
> can reply here any time.

That is the complete list. Saved answers are yours to write; the one test
answer I used during verification has been deleted. Per the hard rule,
nothing about pricing, tax or SARS is answered unless it is fixed text you
wrote: an uncovered question makes the system stay quiet and hand the
thread to you.

## 4. What a demand line contains

One row per door 1 job request, written the moment the three questions are
answered, kept indefinitely:

- **trade**, whatever they typed, e.g. "Plumbing, my geyser burst"
- **suburb**, e.g. "Brakpan"
- **urgency**, "Today", "This week" or "No rush"
- **requested_on**, the date only
- **outcome**, filled in when you mark the conversation

Nothing else. No name, no number, no message text, no link back to a
person once the conversation is deleted. The acceptance test the handoff
called the most important one passed: I deleted a conversation through the
real cleanup and its demand line stood afterwards, carrying exactly those
five fields.

## 5. How the cleanup works

- Marking an outcome on a thread (Converted, Unmatched, Declined,
  Resolved) starts the clock. The screen says so in plain words before you
  tap.
- An hourly job deletes any conversation whose outcome is older than the
  retention setting: the row, every message, name and number, all of it.
  Messages die with the conversation by database rule, so nothing can be
  half-deleted.
- Every deletion is logged first: a bare conversation reference, door,
  outcome, message count, the retention hours applied, and when.
- **A conversation never marked with an outcome** does not sit forever:
  after 30 days of total silence (also a setting) it is marked Resolved
  automatically, which starts the same clock. So the worst case for
  personal data of a forgotten thread is the silence setting plus the
  retention setting.
- **The retention default is 72 hours and it is not approved.** It is a
  setting on the answers screen, labelled as waiting on your attorney.

## 6. Meta requirements the brief did not cover

- Button titles are capped at 20 characters and list rows at 24. Your
  door button wording has to fit; the admin screen enforces this.
- Reopening a closed window needs a Meta-approved template, and a template
  cannot even be submitted until the number is verified. The closed-window
  state says so. When you are ready I will draft the template copy for
  your approval and submission.
- Meta gives every app a free test number that can message up to five
  allowlisted phones. If you want to try the whole flow on your own phone
  before the real number is verified, that is the way, and I can wire it
  the moment you say so.

## 7. Going live once Meta verifies the number

All in Vercel and the Meta dashboard, no code:

1. In Meta's developer dashboard, under WhatsApp, Configuration, copy the
   phone number id, the access token (generate a permanent one under the
   system user), and note your app secret from App Settings, Basic.
2. In Vercel, df-growth, Settings, Environment Variables, add for
   Production: `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`,
   `WHATSAPP_APP_SECRET`. (`WHATSAPP_WEBHOOK_VERIFY_TOKEN` already
   exists.)
3. In Meta's dashboard, set the webhook URL to
   `https://digitalflyer.co.za/api/whatsapp/webhook` with that verify
   token, and subscribe to the `messages` field.
4. Approve every row on /admin/whatsapp/answers, or rewrite it first. The
   drafts are mine and the handoff is clear that the words must be yours.
5. Tell me the attorney's retention number and set it on the same screen.

## 8. Found and deliberately not fixed

- The July WhatsApp onboarding bot (`src/lib/whatsapp/`, the
  `whatsapp_conversations` table, and its account-creation flow) is
  unreachable now that the webhook feeds the inbox. Its door 3 replacement
  sends a signup link instead of creating accounts in chat. I left every
  file and the table in place because deleting is never done without you.
- Photos, voice notes and documents are stored and shown as "[Photo]",
  "[Voice note]" and so on, and the thread is handed to you. Downloading
  the actual media into the inbox needs the live access token and is a
  small follow-up once the number works.
- A failed scripted message with buttons has no Try again control; only
  plain text messages retry. The doors re-offer themselves in the flow, so
  the honest fix for a failed interactive send is a typed reply.
- The branch is not merged. Main deploys straight to production, and the
  gate the handoff set was this report. Everything is verified and the
  webhook is dormant without the number, so say the word and I merge.

## 9. Where the brief and reality differed

- "Use whatever notification path Growth Admin already has": Growth Admin
  has no push channel; its pattern is the badge on /admin plus email to
  info@digitalflyer.co.za (the same address the signup notification uses).
  That is what I built: a badge counting threads that need you, and a
  throttled email, at most one per conversation per hour, carrying only
  the name and door, never message text, so nothing personal leaks into an
  inbox the cleanup cannot reach.
- The handoff lists "unmatched, converted, declined, resolved" among
  labels. Those four are outcomes, a separate single-choice state that
  drives the retention clock, because a label you can forget to remove
  must not be the thing that triggers deletion. Labels proper are
  free-form chips and the door labels are applied automatically.
- "Webhooks on preview deployments need the Vercel protection bypass":
  confirmed and documented above, section 2.

## Housekeeping

Test rows created during verification (three conversations, messages, one
saved answer, demand line, deletion log entries) are deleted; the live
tables hold only the 22 draft copy rows. No emails were sent during
testing. No secrets or environment variables were touched; local testing
ran with throwaway values injected into a temporary sandbox copy of the
repo, which is also gone.
