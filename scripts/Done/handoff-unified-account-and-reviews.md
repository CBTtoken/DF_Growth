# Handoff: one account across Growth, KatisoBiz and the Board, plus three small fixes

**For Claude Code. Written 6 August 2026.**

---

## Context

A Growth member and a KatisoBiz user are currently two unrelated records with no
link between them, even when they are the same person. The column meant to hold
that link, `growth_client_id`, is null on every account without exception.

This one gap is the cause of four separate problems that have been treated as
unrelated:

1. The Board's "active this week" signal reads KatisoBiz document activity and
   therefore finds nothing for anybody, so the signal shows an empty result for
   every member.
2. Quote-from-comment on the Board fails its email attach step for every
   business, silently.
3. The Board is effectively a third login, because a member's Board identity is
   not connected to their KatisoBiz account.
4. The Growth pricing page promises KatisoBiz is included, and nothing in the
   system can fulfil that automatically, because there is no way to know which
   KatisoBiz account belongs to which Growth member.

There are 34 member accounts in total. Roughly 5 are actively used. This is a
small dataset and it should be treated with care rather than speed.

## Goal

One person, one account, across Growth, KatisoBiz and the Board. Signing up on
either product provisions the other. Board access is a permission on that
account rather than a separate identity.

Three smaller fixes ride along in the same sprint because they are low risk and
one of them is a live inaccuracy on a public policy page.

## Order of work, and why

Do the jobs in this order. The small, low-risk items ship first so that if the
identity work runs into trouble, the sprint has still delivered something.

1. Job 2, the privacy policy line
2. Job 3, the plan rename
3. Job 1 Phase A, linking the 34 existing accounts
4. Job 4, the review request
5. Job 1 Phase B, unified provisioning

Phase B is last because it changes how live paying members log in. Nothing else
in this sprint should be blocked behind it.

---

## Job 1, Phase A: link the accounts that already exist

**Join on cell number, not email.** Cell number is the canonical member
identifier across this portfolio. Email is unreliable here because members
change it, share it, or used a different one on each product.

- Normalise numbers before comparing them. South African numbers appear in the
  data in several shapes: leading zero, `+27`, `27` with no plus, spaces, and
  brackets. Normalise to a single stored format before matching, and keep the
  original value untouched.
- A match is only a match when the normalised numbers are identical. No fuzzy
  matching, no partial matching, no matching on name similarity.

**Do not write the links straight into production.** Produce the proposed links
in a review table first, listing on each row: the Growth account, the KatisoBiz
account, the normalised number both sides matched on, and the original stored
values from each side. Dewald reviews and approves that table before anything is
applied to live records.

Three lists come out of this and all three go in the report:

- Confident matches, ready to apply
- Growth accounts with no KatisoBiz counterpart
- KatisoBiz accounts with no Growth counterpart
- Any case where one number matches more than one account on the other side.
  Do not guess. List it.

Once approved, apply the links, and confirm afterwards that the Board's "active
this week" signal returns real results for at least one member.

## Job 1, Phase B: unified provisioning

**Both directions.**

- A new Growth signup gets a working KatisoBiz account at the same moment, on
  the free tier, without a second signup step and without a second password.
- A KatisoBiz user who takes a Growth plan has their existing account upgraded.
  A second account must never be created for someone who already exists.
- Board access is a permission on the account, not a separate identity or
  login.

**Constraints.**

- Existing members must not be logged out, and no existing password may stop
  working.
- If a signup finds an existing account on the same cell number, it links rather
  than creating. Never silently create a duplicate.
- There must be a rollback path. Before this is merged, write down in the report
  exactly how it would be reversed if something goes wrong for a live member.

**Test with Dewald's own account before anyone else's.**

---

## Job 2: correct the Board privacy policy

The published policy states that leaving a comment requires a verified email
address. The mechanism was simplified on 31 July to an unverified email address
plus a bot check. The policy now describes a control that does not exist.

Correct the wording to describe what the system actually does. Do not change the
mechanism, only the description of it. Quote the old line and the new line in
the report so Dewald can approve the exact wording.

## Job 3: rename the R89 plan

"Unlimited" is currently unlimited documents only. Multi-user logins and
recurring invoices are not built, and every account is single-user.

Rename it so it describes document volume, everywhere it appears: pricing page,
account and billing screens, upgrade prompts, emails, and any admin label. Do
not change price, entitlements or behaviour. List every place you changed it.

## Job 4: the review request

**In KatisoBiz.** When an invoice is marked fully paid, the member sees a single
button to request a review from that customer. It opens WhatsApp with a
pre-written message addressed to the customer, containing a link. The member
sends it themselves. It is never sent automatically and there is no scheduled or
repeat send.

Follow the existing payment reminder pattern exactly. That flow already works
and members already understand it.

Where the link points:

- Member has a Growth page: their Growth review form.
- Member has no Growth page: a plain review capture page that stores the review
  against their KatisoBiz account, so it is already there if they take a Growth
  plan later.

Only offer it once per invoice by default, with the button still available if
the member wants to send it again deliberately.

**In Growth.** A "Grow Your Reviews" block at the top of the member dashboard.
The member picks a past customer or types a name and number, and sends the same
message the same way. There is no automatic trigger here, because a Growth
member with no KatisoBiz activity has no completion event to trigger from. Once
Phase A and B are done, a Growth member who does use KatisoBiz gets the
triggered version through KatisoBiz automatically, and this block stays as the
manual route.

Draft the message wording yourself and quote it in full in the report for
approval. It must sound like the member wrote it, not like a platform. South
African, friendly, direct, short. No em dashes.

---

## Out of scope

Do not touch any of the following in this sprint:

- The WhatsApp switchboard, matching, dispatch, or anything in the `whatsapp`
  folder
- The Board's verified badge mechanism. The slot stays empty, the decision is
  still with Dewald
- Flipping the Board live. The flag stays as it is
- The Members' Room
- Payment provider configuration, credentials or Paystack settings
- Enterprise tier checkout
- The agent dashboard Phase 2 view
- Any redesign or visual work

## What you decide, and what needs Dewald

**Decide yourself:** schema and table design, how normalisation is implemented,
where the review capture page lives, the structure of the review table, all
naming inside the code, and the order of work within each job.

**Stop and ask Dewald:** applying the Phase A links to live records, the final
wording of the privacy policy line, the final wording of the review request
message, and anything that would log an existing member out or change their
password.

**Never without Dewald, as standing rule:** deleting files, force pushing,
touching secrets or environment variables, changing Vercel settings, writing to
production data outside the approved Phase A application, and anything touching
payment credentials.

If you need a decision and Dewald has not answered in three minutes, carry on
with whatever else you can do and raise it in the report. Only halt when there
is genuinely nothing else to work on.

## Acceptance criteria

1. Every one of the 34 accounts appears in exactly one of the four Phase A
   lists, and the lists add up to 34 with no account counted twice
2. Number normalisation handles leading zero, `+27`, `27`, spaces and brackets,
   and the original stored value is preserved unchanged
3. After Phase A is applied, the Board's "active this week" signal returns a
   real result for at least one member
4. After Phase A is applied, quote-from-comment completes its email attach for
   a linked member
5. A new signup on Growth results in a usable KatisoBiz account with no second
   password
6. A new signup on KatisoBiz who then takes a Growth plan ends up with one
   account, not two
7. A signup using a cell number that already exists links to the existing
   account and does not create a duplicate
8. No existing member is logged out and no existing password stops working
9. The Board is reachable using the same login, with no separate Board identity
10. The privacy policy describes the mechanism that is actually in place
11. No screen, email or admin label still describes the R89 plan as "Unlimited"
    without qualification
12. A KatisoBiz invoice marked fully paid shows a review request button that
    opens WhatsApp with the message pre-written and the correct link
13. The review request never sends by itself
14. A Growth member with no KatisoBiz activity can send a review request
    manually from the dashboard
15. Nothing listed under Out of scope has changed

## How to report back

One report at the end. Cover:

1. What changed, by file, in plain language
2. The Vercel preview URL
3. The four Phase A lists, in full, with counts
4. Any cell number that matched more than one account, listed and not resolved
5. The old and new privacy policy wording, both quoted in full
6. The review request message wording, quoted in full
7. Every place the R89 plan name was changed
8. The rollback plan for Phase B, written out
9. Anything found and deliberately not fixed, and why
10. Anything in this brief that turned out to be wrong about how the code
    actually works
