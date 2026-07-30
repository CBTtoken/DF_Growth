# THE BOARD, PHASE 3: REPORT

**Date: 30 July 2026.** Retention settled, Phase 3 built, everything deployed and unlisted.

---

## 1. SECTION 8.1 IS CLOSED

The blocking item was never the chat. It was that three contradictory retention positions existed and **nothing enforced any of them.** What was actually in the code before today: two columns added on 25 July for a warning email flow that was never written, and no deletion logic anywhere. The published policy promised twelve months and the database kept everything forever.

**Settled by Dewald, 30 July:**

| Data | Kept | Why |
|---|---|---|
| Growth members, pages, board content | 12 months after the account ends | Matches the published privacy policy word for word, so nothing had to be republished to make it true |
| KatisoBiz documents and accounts | 5 years, protected | Financial records. The policy's existing "except where we are required by law to keep it longer" already covers it |
| Public commenters and messagers | 12 months of no activity | The email they verified, and nothing else |

**"Marked solid" is enforced by absence.** There is no code path in this system that deletes a KatisoBiz row on a timer. The retention function takes a category argument and KatisoBiz is not one of the options.

**Deletion is always a button.** The daily job at 06:00 reports what is due and writes a `retention_runs` row every time, whether anything was due or not. A person presses delete on `/admin/retention` after reading the names. That is deliberate on two counts: it is your standing preference for deletion runs on this project, and the question POPIA actually asks is not what the policy says, it is whether you can show it runs. That table is the answer.

**One case never deletes automatically:** accounts cancelled before end dates were recorded. The clock cannot be proved, so they are listed separately and left alone. Guessing a date and deleting real member data on it is not a thing to do quietly.

---

## 2. WHAT WAS BUILT

**Growth Chat, public to member.**

- A Message button on every post, next to the WhatsApp button rather than instead of it. Section 6 keeps both paths live and lets usage decide.
- Same identity as comments: an emailed code, no password, no profile, no login page.
- One thread per business and person, not per post, because somebody asking about a gate today and a driveway next month is having one conversation.
- Every message emails the other side, because nobody sits on a page waiting for a reply. A member gets it at his business address, a person gets it at the one they verified.
- **The member's own switch.** Off removes the button from his posts and refuses new conversations, and leaves the ones he is already in working, because going quiet on somebody halfway through is worse than never having offered.
- Two inboxes: `/board/messages` for the public, `/dashboard/messages` for the member, with unread counts on both and a badge on the dashboard.

**Two icons on the phone**, as asked, the same way KatisoBiz installs.

- **The Board**, scoped to `/board`, and **Messages**, scoped to `/board/messages`. Each declares its own manifest id and scope, which is what lets Chrome install both from one origin and resolve them by longest match.
- Icons are generated rather than drawn, so the maskable versions cannot drift out of step with the normal ones. That is the usual way an Android icon ends up sitting in a white square next to every other app.
- **iPhone gets written steps.** Apple has no install prompt and never has. Add to Home Screen produces exactly the same icon, because on iOS an installed page always was a bookmark with an icon.
- Long press the board icon on Android and you get shortcuts straight to messages.

---

## 3. WHAT WAS VERIFIED, AND HOW

**Verified against the running app:**

- Both manifests serve correctly, with the right id, scope and start_url.
- Both icon sizes render as real PNGs at 192 and 512, plain and maskable.
- The board page carries its manifest link and its Apple touch icon, and the install card renders.
- The public inbox renders its signed-out state and is `noindex` regardless of the launch switch, because it is somebody's private conversation and no version of the launch makes that crawlable.
- **The member's chat switch works end to end:** with it on, the Message button is in the HTML; with it off, it is gone.
- Live on production, and the board is still correctly hidden: `noindex`, no menu link, nothing in the sitemap.

**Not verified, and honestly so:** the message send and receive round trip, both inboxes with real threads in them, and the email notifications. All three need a logged-in member and a verified visitor at the same time. Same reason as the Phase 2 comment flow: signing in as you is your call, and testing the email path means sending real mail to a real address.

---

## 4. THE ONE THING THAT STILL NEEDS APPROVING

**The published privacy policy does not yet mention members of the public.** Section 6a talks about members and cancelled subscriptions. It says nothing about somebody who verified an email to leave a comment or send a message, and there are now three tables that hold exactly that.

The code already behaves correctly. The policy needs one paragraph to describe it. **Suggested wording, for your approval rather than published on your behalf:**

> **People who are not members.** If you verify your email address to comment on, react to, or message a business through The Board, we store that email address, the name you choose to display, and whether you agreed to be sent a quote. We do not create an account for you, we never ask for a password, and we do not build a profile. If you have no activity for 12 months, that information is deleted. You can ask us to delete it sooner at any time using the contact details below.

That is the last thing between the board and being opened up properly, and it takes you two minutes to approve or rewrite.

---

## 5. WHAT NEEDS YOU, EVERYTHING, IN ORDER

1. **Test the loop yourself.** Post something, then open the post in a private window and leave a comment, and message the business. That covers the three paths I could not verify without your login. Ten minutes.
2. **Approve the privacy paragraph above.** I will publish it in one commit.
3. **Link your KatisoBiz accounts to Growth clients.** Still zero of nineteen. It switches on "active this week" and makes the quote button work, and it is the join the WhatsApp switchboard will need anyway. This is the highest-value item on the list and it has been on it since Phase 1.
4. **Decide what "verified" means.** The slot is on the card, still empty, and no badge was invented.
5. **When you are ready to go public:** set `NEXT_PUBLIC_BOARD_LIVE` to `true` in Vercel and redeploy. Menus, sitemap and Google all switch on together. Nothing in the database changes and no post is recreated.

Nothing else is needed. The retention job is already inside the existing daily cron, so there is no new schedule to set up, and no new environment variable is required for anything except step 5.
