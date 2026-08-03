# SVC SPRINT 3, BUILD REPORT

**Per handoff section 16 | 4 August 2026**
**Branch: `svc-sprint-1`, nothing on main. This sprint also absorbed two mid-flight changes you sent: the webhook-free activation for the shared DF test account, and the mock payment provider.**

---

## 1. WHAT WAS BUILT, IN PLAIN LANGUAGE

**The admin grew up.** /svc/admin is now a hub with six sections: Members,
Partners, Packages, Payouts, Referrals and fraud, and Demand, on top of
the Sprint 2 tools (member lookup, coupon file, issue run).

**Members.** Search and filter, open one member and see everything: their
full timestamped ledger, their subscriptions, who referred them and who
they referred. Actions on the member: comp a month (an active month with
no payment, marked Comped), suspend and lift (a suspended member is
skipped by every issue run), and issue a single benefit now. The members
list also carries the group giveaway: pick a benefit, pick a status
filter, and every matching member is issued it, nobody twice.

**Partners.** Each partner page shows its benefits with their FULL rate
history (effective-dated: adding a rate closes the previous one the day
before, and past months always keep the rate that was in effect then),
its voucher batches with supplied, issued and remaining counters and an
"exhausted, issuing blocked" marker, its payout lines, and one-click PDF
report downloads for the last three months.

**Voucher batch enforcement is live in the ledger itself.** Any benefit
backed by a batch stops issuing at the batch's supplied quantity, in the
monthly run and both giveaway paths alike. A batch of 500 cannot issue a
501st; the database's own check constraint stands behind the code.

**The package builder.** One screen, live arithmetic, nothing saved until
save: name, brand and price; benefits ticked from the catalogue, each
showing its cost model and current rate; face values editable per
benefit; the three referral rates for the package. The live panel shows
fixed cost, variable cost (per-redemption rate times the redemption rate,
labelled "observed from the ledger" or "manual assumption" so you always
know which is in use), the full referral exposure INSIDE the margin,
gross margin in Rand and percent, and the face value total the public
page renders. It warns on a negative margin and warns HARD when the
headline value claim leans on a zero-cost or unrated benefit. Saving
creates a new version; existing members stay on theirs.

**Payouts.** Pick a month, press run. The partner run counts qualifying
active members or the month's redemptions per benefit at that month's
rates and writes one line per partner per benefit; the referral run
writes one earning per referral whose referred member was paid and active
that month, at the referred member's package rate for the level, then one
line per referrer. Both are safe to re-run (nothing doubles), neither
moves money, every line has a "mark paid" box wanting a reference, and
the month exports as CSV. The member dashboard's referral numbers now
fill in the moment a referral run for the month has happened.

**The partner report PDF.** One page per partner per month with the
partner's name on it: received, opened, selected, used, the use rate and
the Rand value used, per benefit and in total, straight from the ledger.
Where redemptions were member-self-reported the report says exactly what
share, rather than presenting them as verified. Built to be emailed as
it is.

**Fraud, flag only.** Accounts sharing a payment instrument, runs of
near-identical cell numbers joining inside 30 days, and referral chains
growing faster than a set weekly rate (threshold adjustable in
svc.setting). Every flag links to the member; nothing auto-suspends.
Device fingerprints are not captured by the platform at all, so that
fourth signal from the handoff is honestly reported as unavailable
rather than faked.

**Demand capture, both halves.** The member dashboard asks "which shop or
product should we get coupons for next?" with a category and a free-text
answer; admin sees it aggregated by category, biggest number first, plus
the latest individual asks. This is the "which deal to chase next"
number.

## 2. THE TWO MID-SPRINT CHANGES, RECORDED

1. **Activation no longer needs a webhook.** The welcome page verifies
   the payment reference server-side against Paystack and activates
   through the same deduplicated path the webhook uses. Consequence: the
   shared DF TEST account works with ZERO changes to its webhook
   settings, which is the thing that once broke WhatsApp delivery. The
   SVC webhook route stays built for the day SVC's own account clears.
2. **The mock payment provider.** SVC_PAYMENT_PROVIDER=mock (Preview
   only): checkout activates instantly under a mock_<timestamp>
   reference, no card, no Paystack. Hard-blocked in Production at module
   load (checked against VERCEL_ENV, because NODE_ENV lies on previews),
   and every mock membership shows "TEST DATA, no real payment" in the
   admin ledger. Delete the env var and the Paystack path takes over
   unchanged.

## 3. WHAT I DECIDED THAT WAS NOT SPECIFIED

1. **"Paid and active for the month"** is defined as: the subscription's
   paid window covers the end of the month (or now, for the current
   month). One definition drives both the partner counts and the
   referral run, so the two can never disagree. If you want a different
   rule (for example, any part of the month), it is one function.
2. **Partner counts come from the ledger**, not from package
   composition: a member counts for a benefit in a month only if an
   issue row exists. What you paid for is what was actually delivered.
3. **Revenue-share rates produce no payout line** yet: the commercials
   they need are exactly what MiFuel has not supplied. The screen shows
   the model; the run skips it rather than guessing.
4. **The referral payout mechanic** still awaits your decision (credit
   versus cash threshold). The run writes the member lines either way;
   "mark paid" with a reference covers both interpretations until you
   choose, and nothing member-facing promises cash.
5. **Comp is one month at a time**, pressed again for another month.
   Cheap, auditable, impossible to forget running.

## 4. ANYTHING WRONG OR IMPOSSIBLE IN THE HANDOFF

- The fraud view's device-fingerprint signal needs capture
  infrastructure that does not exist in this platform; noted in the
  screen itself. The other three signals are live.
- Nothing else fought back.

## 5. ACCEPTANCE CRITERIA, WALKED

| Criterion | State |
| --- | --- |
| R5 benefit added to a R49 package drops the margin by R5 live | Yes, in the builder's panel; remove restores it |
| Margin includes R9 referral exposure | Yes, as its own line inside the cost stack |
| September rate change never alters an August run | Yes: runs read the rate effective for the run's month |
| A 500 batch cannot issue a 501st | Yes: capped in code, backstopped by the DB constraint |
| Payout run across partners produces statements and moves no money | Yes: lines + CSV + per-partner PDF, mark-paid is manual |
| Partner report renders as PDF with real ledger figures | Yes |

The live-data walk needs the migrations run (checklist Step 1); until
then every screen renders its honest empty state.

## 6. WHAT YOU NEED TO DO

Everything is already on your checklist. One addition:

- Run Appendix D below in the Supabase SQL editor (a single column for
  the package builder's assumed redemption rate). Safe any time after
  Block A, safe to re-run.
- Optional but useful the day you want the builder's variable-cost line
  to say something for a per-redemption benefit: set an assumption, for
  example 35 percent, with:

```sql
update svc.benefit set assumed_redemption_rate = 0.35
where name = 'Dis-Chem coupon pack';
```

## APPENDIX D: THE SPRINT 3 MIGRATION SQL (safe to re-run)

```sql
-- SVC Sprint 3: the one column the package builder needs that Sprint 1
-- did not model. Safe to re-run; no seed data.

alter table svc.benefit
  add column if not exists assumed_redemption_rate numeric(5, 4)
  check (assumed_redemption_rate is null or (assumed_redemption_rate >= 0 and assumed_redemption_rate <= 1));

comment on column svc.benefit.assumed_redemption_rate is
  'Manual assumption for the package builder''s variable cost line, used until the ledger can observe the real redemption rate. 0.35 means 35 percent of issued coupons get redeemed.';
```

## 7. WHERE SPRINT 4 STARTS

The draw (section 10) with entries from the ledger, the freeze, the
seeded draw and the public results page, purchased entries behind the
default-off flag, and the MiFuel integration the moment their remaining
documentation and credentials arrive. Before that: your six checklist
steps make everything built so far walkable end to end.
