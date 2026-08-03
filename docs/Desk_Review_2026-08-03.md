# THE DESK: A REVIEW AND A RUNNING ORDER

**3 August 2026. 78 open items across 16 ventures.**

You asked whether The Desk is becoming a notepad. It is, a bit, and this is
the evidence: **five items in it are already done**, some of them finished
today, and the list has no way of knowing. Another **five are the same job
written five different ways.** That is a third of the Growth and DigitalFlyer
SA items either closed or duplicated, and it is why the list feels like it
only ever grows.

Nothing below has been changed in The Desk. Say the word and I will close and
merge what needs it.

---

## 1. CLOSE THESE, THEY ARE DONE

| Item | Where it stands |
|---|---|
| "The products on the page should open a product page... the user should have a separate Shop page" | **Done today.** Storefront at `/[member]/shop`, a page per product, live. |
| "When adding a shop, there is no space to add images of the product?" | **Done today.** Upload, reorder, choose the main picture. |
| "What if the user does not have the product dimensions, it should not be compulsary" | **Done today.** Optional, with the courier warning kept where it matters. |
| "Bob Go courier plugin not sorted" | **Closed by you**, 3 August. Integration works, email sent to them. |
| "Data retention must be settled and audited before Phase 3, blocking" | **Probably done** 31 July. Verify, then close. |

**Partly done:** "Can we redesign the home page with the shop and the booking
section, feels a bit hanging and lost." The old inline shop is gone and
replaced by a featured row, and the new two-sided theme handles it properly.
Booking still hangs on the page. Worth rewriting as a booking-only item.

---

## 2. THESE FIVE ARE ONE JOB

All five describe the health check:

- "We need a built-in check... early warnings if scalability, space and speed drops"
- "Platform check: Vercel spend, Supabase database size and usage"
- "Confirm a Supabase database dump restores cleanly, then keep it"
- "We need to check our own security, solid against hacks and breaches"
- "2FA on Supabase, Vercel, Paystack, Meta and the domain registrar"

Four are the build. The 2FA one is not: it is a thing only you can do, and
it buys more real safety than the build does. Keep it separate and keep it
first.

**Three more are one payments job:** "Set Paystack as the standard member
payment gateway", "multi-gateway support for Growth members", and the
Paystack account collision. That is Sprint 2 and its blocker.

---

## 3. CRITICAL: exposure and blockers

**1. The old RE:Biz intake form collected passwords in plain text, and nobody
knows whether it was fixed.**

This is the most serious thing in the whole list. If real people entered real
passwords and those are sitting in a table, that is other people's credentials
at risk, and people reuse passwords. It has been sitting at "remediation
status unknown" for some time. An hour of checking settles it.

**2. Paystack account collision: one test-mode account shared across four
products.**

Your own note says it "blocks payment work anywhere", and it is right. This
blocks Sprint 2, so it has to be resolved before that build, not during it.

**3. 2FA everywhere, and the access audit.**

You are on this already. You said there should be no other logins on any
platform, which is the right standard. The audit is how you prove it, and the
health check can then watch for anything new appearing.

---

## 4. THE RUNNING ORDER

Your order, with the blockers slotted in where they have to go.

### First, and small: fix The Desk itself

You wrote a long item that is really six complaints, and every one is fair:

- No way to assign an item to a sprint or the right project
- No way to delete a duplicate or something no longer relevant
- One-line items do not work when one entry holds several questions
- The Map has nothing to measure: no progress, no weighting
- No way to tell a quick job from a deep one at a glance
- No way to mark that something is ready to hand to a build session, and no
  check that the handoff is well formed before it goes

**This comes first, before the health check.** Not because it is the biggest,
but because The Desk is the tool you run everything else from. Every week it
stays awkward, the list gets longer and less true, and today proves it: five
finished jobs still sitting there as open work.

It is also a small build. The data already carries effort and blocked_by, so
most of it is surfacing what exists plus a delete, a split, and a sprint
assignment.

### Then, in your order

**2. Health check.** Absorbs four items above. Your early warning on cost,
space, speed and anything appearing that you did not put there.

**3. Buyer registration.** Accounts, order history, receipts.

**4. Sprint 2, payments and courier.** **Blocked** until the Paystack account
collision is sorted. Also better once Bob Pay and Paystack reply.

---

## 5. IMPORTANT, NOT YET URGENT

- **Analytics and Search Console review.** South Africa is not even in your
  country list while most traffic is South African. Something is misconfigured
  and every decision you make from that data is currently unreliable. Cheap
  to check, and it affects everything else.
- **Rewrite the automatic emails** to members for Growth and KatisoBiz. New,
  current and old.
- **Test the Booking module properly**, and the Events module. Both shipped,
  neither has been through a real run.
- **Redesign the shop setup page** so the Bob Go and Paystack sections
  collapse to the bottom. Your note is right, the page is too busy.
- **Confirm a database dump actually restores.** Part of the health check,
  but worth doing by hand once before trusting any automation.
- **Emailer to old members**, the soft reintroduction.

## 6. WORTH DOING, NO RUSH

Dual name display, CIPC verification field, KatisoBiz backlog (dashboard,
reports, reminder ladder, approve and decline taps), Kwaai Press naming and
domain checks, Moxie heading styles, Standing 365 through the Growth shop.

## 7. NEW PRODUCTS, NOT NOW

Blogging on Growth, voice notes on The Desk, the Bible study app, the
in-house HTML magazine publisher, company registration via BizPortal.

All real ideas. None of them belongs in the same list as a security exposure,
which is exactly the problem The Desk fix solves.

---

## 8. THINGS ONLY YOU CAN DO

These sit in the list waiting and no build will clear them:

- 2FA and the access audit
- Decide which number the WhatsApp switchboard runs on, **blocking that build**
- Split the trade category list into urgent and scheduled, **blocking too**
- Find who registered digitalflyer.biz
- Find where the Vowie domain is registered
- Competition law price signalling, needs an attorney
- Google Business Profile dispositions

---

## WHAT I SUGGEST

1. Let me close the five finished items and merge the duplicates. Ten minutes.
2. Settle the RE:Biz password question. It is the one real exposure here.
3. I build The Desk fixes.
4. Then health check, buyer registration, Sprint 2 in your order.

One at a time, as you said.
