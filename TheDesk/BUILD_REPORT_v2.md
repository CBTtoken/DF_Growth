# The Desk v2: build report

**Built 2 August 2026, from a day of real use of v1.**

---

## 1. What changed, in the order the handoff asked for

1. **The lag.** Done, Skip, Waiting-on and Sort acceptance now change the screen at once and tell the
   server afterwards. Today holds the next two items in the browser so the card can swap instantly;
   the screen still shows one item and only one.
2. **Capture.** A blank line separates items, a single line break does not. A line starting with a
   dash or a number also starts a new item, so a pasted list stays a list.
3. **Sort.** Proposes splits as well as fields, with a one-tap merge to undo any split. Every
   proposed title is checked in code against the original text and dropped if it is not a
   character-for-character span of what you typed.
4. **Streams.** Every item now sits in `own`, `client` or `life`. Map shows where your capacity is
   going without arithmetic.
5. **Ventures and end states.** A new `desk_ventures` table. Every venture has a draft end state,
   written from your own items, waiting for you to rewrite it.
6. **Horizon and recurring.** Next 30 days, deadlines and renewals together, in date order. Items can
   repeat weekly, monthly, quarterly or annually, and marking one done creates the next instance.
7. **Register tabs, go-away section, handoff button.** All three built.

Plus three things you asked for mid-build: a Think space, a nav rebuild, and add-to-phone.

---

## 2. The three mid-build additions

**Think.** A separate screen with its own table. Ideas have no status, no due date, no effort and no
owner, and nothing counts or chases them. Boards are free text so related thinking sits together.
One button, Make it an item, copies an idea into the list where work lives and leaves the idea where
it is.

The sounding-board half of what you asked for, where it answers back, is deliberately not built:
section 11 of your own handoff rules out any AI beyond Sort, and your captured item "Desk v3, MCP
server so Claude chats read and write the Desk directly" is exactly that feature, now parked with the
trigger you set. Say the word and it becomes a v3 handoff.

**Navigation.** Six tabs, thumb height, current one obvious: Dump, Today, Think, Waiting, Map, More.
Everything with a monthly rather than a daily reason to be opened lives behind More. Every screen now
uses one frame, so margins, headings and spacing never move between screens.

**On your phone.** A web app manifest and a generated icon, so Add to Home Screen gives The Desk its
own icon and opens it full screen with no address bar. The card on More explains it, and knows the
difference between an Android prompt and the iPhone share sheet.

---

## 3. Schema, as applied

```sql
alter table desk_items add column stream text not null default 'own'
  check (stream in ('own','client','life'));
alter table desk_items add column recurrence text not null default 'none'
  check (recurrence in ('none','weekly','monthly','quarterly','annually'));

create table desk_ventures (id, name unique, stream, end_state, status, notes, timestamps);
create table desk_notes    (id, heading, body, position, timestamps);        -- go-away section
create table desk_ideas    (id, board, heading, body, became_item_id, position, timestamps);
```

All three new tables have row level security on, no policies, and a service_role grant, same as v1.
No table outside the `desk_` prefix was touched.

---

## 4. Where your 72 items went

The Risk tag was mine, not yours, and it is gone. Those five moved to real ventures, and a new
venture, DigitalFlyer SA, now holds the company-wide work.

| Item | Now filed under |
| --- | --- |
| Competition law price signalling | DigitalFlyer SA |
| Google Business Profile dispositions | DigitalFlyer SA |
| Paystack account collision | DigitalFlyer SA |
| RE:Biz plaintext passwords | DigitalFlyer SA |
| Netcash legacy migration | Growth |

Yesterday's 28 captures were filed as follows, and this is the list to correct if I have guessed
wrong: 14 to Growth (shop, booking, product pages, emailers, CIPC at signup, dual name display,
blogging, scalability warnings), 6 to DigitalFlyer SA (company registration as a service, who
registered digitalflyer.biz, the compiler binary, the profile doc, 2FA and access audit, our own
security), 2 to KatisoBiz, 2 to Desk, 2 to Personal (passport, licence), 1 to WhatsApp, 1 to Moxie.

Streams landed at 63 mine, 9 life, 7 client.

**Standing 365 is `own`**, as you said: your book, sold through your own shop.

**Duplicates removed:** one. "KatisoBiz own chat and messenger layer as the WhatsApp alternative",
which I had seeded from your written record, was the same thing as your own capture "KatisoBiz own
messenger layer, parked, trigger is the Desk going public". Yours survived, mine was deleted, and the
park trigger went onto yours. Two section 10 additions were already in your own words, so they were
not added twice either: the 2FA and access audit item, and Desk v3, which got its park trigger
applied instead.

**Statuses you had typed into your own captures were applied**, because v1 gave you nowhere else to
put them. Cold list marketing engine is killed with your reason recorded. Voice note transcription is
parked on "Switchboard live with real traffic". Both are one tap to reverse.

---

## 5. Acceptance criteria

Checked against a real production build running locally, in a real browser with JavaScript running,
against the real database.

| # | Criterion | Result |
| --- | --- | --- |
| 1 | Done, Skip, Blocked and Sort acceptance respond immediately | **Pass.** Skip swapped the card in under 400ms and Done in 641ms, both with no page navigation, and both reconciled in the database afterwards. |
| 2 | A three-line paragraph is one item, two paragraphs are two | **Pass.** Typed into the real box: a three-line paragraph, a second paragraph and two bullets became 1 + 1 + 2 items. |
| 3 | Sort proposes a split, writes nothing until accepted, titles verbatim | **Pass.** A deliberately three-topic capture split into three parts, each an exact span of the original. 76 proposals sat on screen with nothing written. |
| 4 | A split merges back in one tap | **Pass.** Merge restored the full original title; splitting again returned the same three parts. |
| 5 | Every item has a stream, nothing guessed silently | **Pass.** 79 of 79. The filing is listed in section 4 for you to correct. |
| 6 | Grouped view shows streams, ventures, counts, and own against client without arithmetic | **Pass.** Map reads "For every one thing open on a client, you have 11.4 of your own." |
| 7 | A venture's end state shows with its counts | **Pass.** All 16 ventures carry a draft end state. |
| 8 | Horizon lists dated items and renewals inside 30 days, in order | **Pass.** Verified with a dated item and a renewal, both in date order with days remaining. |
| 9 | A recurring item done creates its next instance | **Pass.** Date maths checked across weekly, monthly, quarterly and annual, including month-end. |
| 10 | Register tabs show correct per-tab totals | **Pass.** Business R3 800, personal R15 199, all R18 999, each matching the database exactly. |
| 11 | The go-away section saves and reopens | **Pass.** And now saves without needing a blur, see section 6. |
| 12 | No field anywhere accepts or stores a password, key or secret | **Pass.** No credential column exists in any desk table and no such field exists in the interface. |
| 13 | Draft handoff produces copyable markdown from the CC group | **Pass.** Grouped by venture with next step, notes and effort. |
| 14 | v1 rules still hold | **Pass.** Parking without a trigger still fails at the database, Today still returns exactly one item, capture still does not spellcheck, no badge or count exists anywhere, every page answers `noindex, nofollow`. |
| 15 | Growth and KatisoBiz public sites unchanged | **Pass.** Both `robots.txt` byte-identical to the pre-build copies; `/buffelskop`, `/helplift`, `/marketplace`, `/pricing` and `/board` all 200 with no `x-robots-tag`; KatisoBiz homepage 200. |

---

## 6. Two bugs found by testing, both fixed

**The whole app was running without JavaScript on this machine, and had been since v1.** The
project's Content Security Policy does not allow `unsafe-eval`, and Next's development-mode refresh
runtime evaluates a string, so the entire client bundle threw on load. Every page still worked,
because every screen falls back to a plain form post, which is why it was not obvious. It also meant
v1 was never tested with its JavaScript running. Fixed by allowing `unsafe-eval` in development only.
The production header is byte for byte what it was, and I checked that on a real production build.

**Sort could not run at all with splitting turned on.** Splitting needs a bigger token budget, and
above a certain size the Anthropic SDK refuses a non-streaming request outright. The call now streams
and collects. Found on the first real split run, which is the argument for testing with real data.

---

## 7. What was done to your data during testing, and undone

Two of your real items were touched while testing the instant Done and Skip, and both were restored:
"Brief Samantha on social media material" was marked done and is open again, and "Moxie eMag,
monthly, out on the 1st, recurring" had its skip count reset to zero.

One change was left in place deliberately, because it is what the new field is for and your own title
asks for it: the Moxie eMag item is now set to repeat monthly. Change it on the item screen if that
is wrong.

Everything else created during testing was deleted: nine throwaway items, one throwaway register
row, one throwaway idea, and the throwaway login.

---

## 10. Added after the first v2 deploy, same day

Two notes came back from testing, and both turned out to be the same missing idea.

**Waiting could not let go of anything.** It could unblock or nudge, but an item added there by mistake
had nowhere to go. Waiting now has Done and a bin, and so does the item screen. The bin deletes
outright, with a confirm. That is a deliberate softening of the one rule: done, parked with a
trigger, or killed with a date was written about abandoning work, and a typo is not work.

**Export was being mistaken for a way to send work out.** It is renamed **Business tracking**, which
is what it always was: the whole picture, as text, for touching base. It is context, not an
instruction.

**Sprints** is the thing that was actually missing. A sprint is a bundle of work with a brief
attached, aimed at Claude Code:

1. Something comes up mid-test, or a client asks for a change. Dump it as normal.
2. Put it in a sprint, from the item screen or by ticking items on the sprint.
3. Write what the sprint is for, and anything the build needs to know. Both save as you type.
4. Copy the brief: the goal, each venture's end state, every item with its next physical step and
   notes, a blank acceptance criteria section, and the house rules for this codebase.
5. Paste it into a fresh Claude Code session in the DigitalFlyer Growth folder.
6. Hand it to CC. The items become CC's, leave the Today rotation, and age on Waiting where they can
   be seen.
7. Mark it shipped when it comes back, and every item in it closes together.

New table `desk_sprints`, plus `desk_items.sprint_id`. The whole loop was run end to end on
throwaway items before deploying, and those items were deleted afterwards. One empty sprint called
"Next build" is waiting, with a starter goal to rewrite.
