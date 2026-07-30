# THE BOARD, PHASE 2: REPORT

**Date: 30 July 2026. Same format as the Phase 1 report, per section 11 of the handoff.**

Phase 2 is built and verified. Phase 3 has not been started and must not be, until section 8.1 is settled.

---

## 1. WHAT WAS BUILT

**Interaction, with a verified identity and no account.**

- **Comments.** Written first, verified second. A person types the comment, gets a one-time code by email, and the comment appears the moment the code is entered. No password, no profile, no login screen.
- **Likes.** Same identity, one tap. Counted by rows, never stored as a counter on the post, so nothing can start ranking by it.
- **Reporting**, on every post and every comment, open to anyone including people who have verified nothing.
- **Moderation**, split exactly as section 5 asks: countable things enforce themselves, judgement calls are held for a person, and every decision is logged.
- **Quote from a comment**, one action, from the member's dashboard into a real KatisoBiz draft quote.
- **An admin queue** at `/admin/board`: held comments, reported posts, and the decision log underneath.

**Sharing was not touched.** It stays anonymous and ungated, which section 5 states in as many words.

---

## 2. MIGRATIONS ADDED

One. **`supabase/migrations/20260731170000_board_phase2.sql`**, creating five tables: `board_identities`, `board_comments`, `board_likes`, `board_reports` and `board_moderation_log`.

Applied and verified live: all five have row level security on, no policies, and service_role grants only. The log table is granted select and insert and nothing else, because an append-only log the application can rewrite is not a log.

---

## 3. WHAT PERSONAL INFORMATION PHASE 2 STORES

This is the part of the build that changed, so it is set out in full.

**For a member of the public who comments or likes:**

| What | Why it exists |
|---|---|
| Email address | The thing being verified. Nothing works without it. |
| The name they choose | Signs the comment. A public comment with no author is not a comment. |
| Whether they agreed to be quoted | A tick box, off by default, covering the one case where an address would otherwise reach a business. |
| A hashed IP fingerprint | Never the address itself. Same helper the review flow already uses, for spotting abuse. |
| An auth record holding the verified email | What "verified" means in practice. No password is ever set. |

**Nothing else.** No profile, no history, no preferences, no tracking of what they read.

**On the account question, precisely.** Acceptance criterion 11 says no public account before Phase 3, and criterion 12 allows "a verified email or phone used for OTP". Verifying an email with Supabase Auth necessarily creates an auth record to hold that verification, and the existing review flow works the same way. What does not exist is any account surface: no login page for the public, no password, no profile, no way to sign in and see anything. If you consider the auth record itself to cross the line, the alternative is a hand-rolled code table, and it would hold the same email for the same purpose with worse security. Flagged rather than decided quietly.

**The Meta pixel note from Phase 1 still applies**, unchanged: board pages carry the same consent-gated pixel as the rest of the marketing site.

---

## 4. HOW MODERATION ACTUALLY BEHAVES

Four rules. All four were tested against the real code, not reasoned about.

| Situation | What happens | Verified |
|---|---|---|
| A comment contains a link of any shape | Held before it is ever visible, and the person is told why | Yes, three link formats held, a genuine question passed |
| One verified person reports a comment | Nothing automatic. The report waits for a human | Yes |
| Two different verified people report the same comment | Held automatically, rule recorded | Yes |
| The business reports a comment on its own post | Held immediately, on one report | Yes |
| Three anonymous people report a comment | Nothing automatic. The reports wait for a human | Yes |

That last row is a decision the handoff did not cover and it matters. Reporting is open to everyone, because something genuinely bad has to be reportable by whoever happens to see it. But an anonymous report never counts toward automatic removal, or two clicks from a competitor would take down any comment on the board. Only a verified identity or the business itself moves that counter.

**Held is not deleted.** A held comment is out of public view with its reason recorded, waiting for a decision. That includes a business taking down a comment on its own post: it goes out of sight immediately, which is what section 5 asks for, and a person still reviews it, so a business cannot quietly erase a fair complaint.

Every transition writes to `board_moderation_log` with the rule, the actor and the time, automatic ones included. The log was checked and reads exactly as intended, for example: `held / reported by the business whose post it is / member:0fe3146c...`.

---

## 5. QUOTE FROM A COMMENT

Verified end to end against the real function, twice.

**With consent:** a comment became a KatisoBiz draft quote with the commenter attached as a customer including their email, one line carrying the post's title and price, totals recalculated, and no document number, because it is a draft the member has not looked at yet. The job reference reads "From a board comment: <post title>", so a draft opened three days later still explains itself.

**Without consent:** the same, except the customer is created with a name only, no email, and a note on the customer record saying they did not agree to be emailed.

**The consent tick box is a decision this document did not cover.** The handoff says the quote is "prefilled with what the board already knows", and what the board knows includes an email address that was given to us to prove a person is real, not to be handed to a business. So the comment form carries one tick box, off by default, and only that tick carries the address across. It costs one line on the form and it is the difference between a feature and a complaint.

**What a member will actually see today:** the message that no KatisoBiz account is linked, with instructions, because `bizup_accounts.growth_client_id` is still null on all 19 accounts. That path was tested first, before the linked one.

---

## 6. THE QUIET LAUNCH

Built as asked: live, complete, and unlisted.

`NEXT_PUBLIC_BOARD_LIVE` controls three things and nothing else. When it is not `true`:

1. No link to the board in the desktop or mobile menu.
2. No board entries in the sitemap, at all.
3. Every board page returns `noindex, nofollow`.

Anyone with the URL gets the real thing. There is no gate, no password and no separate testing mode, so a tester is testing exactly what ships, and a post made during testing survives the switch. Both positions were verified: with it off, the board answers on its own URL with `noindex`, no nav link and zero sitemap entries; with it on, the nav link appears, twenty board URLs enter the sitemap and the noindex is gone.

Flipping it is one environment variable in Vercel plus a redeploy. No database change, no post recreated.

---

## 7. ACCEPTANCE CRITERIA, FULL LIST

| # | Criterion | Result |
|---|---|---|
| 1 | Post publicly viewable, no account | Met |
| 2 | Server-rendered, full content to a crawler with no JavaScript | Met. Comments are in the HTML too |
| 3 | WhatsApp share card with business, item and price | Met |
| 4 | Area pages as destinations | Met |
| 5 | Verified and active-this-week signals | **Partly met, unchanged from Phase 1, see 8.1 below** |
| 6 | WhatsApp tap-through, no account either side | Met |
| 7 | Likes, comments and reviews need OTP. Sharing does not | Met |
| 8 | A comment becomes a KatisoBiz quote in one action | Met |
| 9 | Everything reportable, held content surfaced, decisions logged | Met |
| 10 | No feed ordered by engagement | Met. No engagement column exists to rank on |
| 11 | No public account before Phase 3 | Met, with the auth-record note in section 3 |
| 12 | No personal information beyond a verified email | Met, see the table in section 3 |

---

## 8. WHAT IS STILL OPEN

### 8.1 Two things from Phase 1, unchanged

- **"Verified" still does not exist** as a mechanism in Growth. No badge was invented. Your decision.
- **"Active this week" is still silent**, because no KatisoBiz account is linked to a Growth client. Linking them switches it on and also makes quote-from-a-comment work for that member, so it is now the single highest-value thing on this list.

### 8.2 What was verified how

Verified against a running app: every public page, comments rendering server-side with no JavaScript, all four moderation rules, the decision log, both quote-from-a-comment paths, the admin queue's access control, and both positions of the launch switch.

Verified by build, types, lint and review only: the member dashboard screen and the admin queue's buttons, because both need a login this session did not have, and signing in as you is your call rather than mine. **The email code round trip is the other one**, and deliberately so: testing it means sending real mail, either to an invented address, which caused a bounce-rate warning on this project before, or to your own inbox, which I cannot read. The mechanism itself is Supabase's `verifyOtp`, already live in the review flow.

**So the one thing to test yourself before testers get the URL is a comment, start to finish.** Everything either side of it is proven.

### 8.3 Phase 3 stays blocked

Section 8.1 of the handoff: public accounts and in-app chat do not begin until data retention is settled. The record still holds three contradictory positions, the published privacy policy says twelve months, the internal rule says sixty days, invoicing needs five years, and the code has never been audited against any of them. Phase 2 makes this more pressing rather than less, because there are now public email addresses in the database with no stated retention period of their own.
