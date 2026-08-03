# SVC SPRINT 4, BUILD REPORT

**Per handoff section 16 | 4 August 2026**
**Branch: `svc-sprint-1`, nothing on main. Sprint 4 is the draw in full; the MiFuel integration half stays blocked on their documentation, exactly as reported at Sprint 1.**

---

## 1. WHAT WAS BUILT, IN PLAIN LANGUAGE

**Entries, all three kinds, by the book (section 10).** Free entries per
active member per month, taken from the member's package (so higher tiers
can carry more) with the draw's own count as fallback. Earned entries at
one per R50 of verified redeemed value, threshold configurable per draw,
computed from the ledger with the source weights from 10.2: provider
verified counts in full, provider checkout at the admin weight (default
half), member self reported capped at the admin cap (default 10 entries)
and the cap is shown to the member on their dashboard. Selecting a basket
is not redemption and earns nothing. Purchased entries exist behind the
per-draw flag, DEFAULT OFF, and are covered in section 2.

**The live counter.** The dashboard's draw panel shows the member's
entries by source, the line "R.. more redeemed and you earn another
entry" computed from the same mathematics the freeze uses, and how much
of the self-report cap they have used. What a member watches all month is
exactly what the freeze writes.

**The freeze.** At the published cutoff (or the admin button, whichever
comes first; the daily cron makes the cutoff real on its own) the draw
computes and writes every member's free and earned entries, counts the
purchased ones already recorded, stores the total, and flips to frozen.
From that moment every write path in the code refuses the draw, and the
admin screen shows per-source totals only, never individual entries: the
handoff's "admin cannot see or alter entries after freeze" is physical,
not procedural.

**The selection, reproducible.** A random seed's SHA-256 digest, taken as
a number modulo the total entry count, walked over the frozen entries in
their recorded order. Same seed, same entries, same winner, on anyone's
machine. The seed and total are stored and published.

**The public results page, indexed.** /draw explains the mechanics in
plain language and lists every published result; each result page shows
the period, prize, total entries, the seed, and the winner as first name
plus surname initial, with a plain-language description of how to check
it. Both are in the sitemap; the homepage draw section links there. This
is the cheapest trust the platform can buy, per the handoff.

**Winner and prize.** Publishing emails the winner. "Record prize
fulfilment" writes the prize into the winner's ledger as a redeemed,
provider-verified benefit row with the prize's Rand value, under an
internal Smart Value Club partner, exactly as 10.3 asks.

**Draw admin.** Create or reconfigure the month's draw while it is open
(prize, value, cutoff, free entries, earn threshold, ticket price,
purchase flag); after that, configuration is refused. The lifecycle is
four deliberate presses: freeze, draw, publish, fulfil.

## 2. PURCHASED ENTRIES AND THE GATE (10.1, walked precisely)

- **The flag defaults off** on every draw, and while it is off no purchase
  control, price or mention renders anywhere, public or member-side, and
  the server action refuses regardless of what any interface shows.
- With the flag ON, the public draw page carries the sanctioned
  DESCRIPTION only: members-only, qualifying membership required,
  membership itself carries the value. No price, no picker, no control, in
  the draw section only, never the hero, never signup.
- The purchase form exists in exactly one place, the logged-in dashboard,
  and only after every server-side gate passes: active paid subscription,
  package at or above the R49 floor (a setting, not a constant), a
  genuinely cleared first payment (a comped member is active but has never
  paid, so a comp cannot buy), and the draw still open.
- Purchases run through the same payment interface as memberships: mock
  mints instantly, Paystack goes through the hosted page with its own
  metadata kind, verified server-side on return, with the webhook branch
  as second witness, deduplicated on the provider reference.
- Every purchase is an entry_purchase row, its own revenue line,
  reportable separately from free and earned.
- A payment that lands after the freeze mints NO entries: the money trail
  is recorded, the log shouts for a manual refund, and the member is told
  plainly on the return page. Frozen means frozen.
- **The flag stays off until your legal clearance exists in writing.** The
  admin checkbox says so in as many words.

## 3. THE MIFUEL HALF OF SPRINT 4

Unchanged from the Sprint 1 assessment: member.php gives provisioning
(server-to-server, route 1, the good case) and the catalogue, selection
and redemption documentation does not exist yet, so nothing beyond the
interface already built in Sprint 2 was coded. Blocked on your MiFuel
email: OrgID and Key, the product type, catalogue and redemption docs
(Q6 first), and Q14 per retailer in writing. The manual import path
covers every month until then.

## 4. WHAT I DECIDED THAT WAS NOT SPECIFIED

1. **Weighted-value entries and self-reported entries are computed
   separately**: provider value plus weighted checkout value earns
   floor(value/threshold); self-reported earns its own capped
   floor(value/threshold). This reads 10.2's rows exactly and makes each
   acceptance case come out precisely.
2. **The seed is generated at draw time**, not chosen by a person, and
   published afterwards. Reproducibility, not ceremony, is the point.
3. **Suspended members earn no free entries at the freeze**, consistent
   with the issue run skipping them.
4. **A frozen-draw late payment records the money and mints nothing**
   rather than quietly minting into a closed draw; refund is a manual,
   logged act.
5. **The prize ledger row is provider-verified with the prize's value**:
   SVC itself is the provider of that benefit, and the winner genuinely
   received it.

## 5. ACCEPTANCE CRITERIA, WALKED

| Criterion | State |
| --- | --- |
| Route report before integration code | Done at Sprint 1; unchanged, still blocked on docs |
| Coupon selection without leaving SVC styling | Sprint 2's screens; the MiFuel provider slots behind them |
| Every selection writes a ledger row with Rand value | Yes, since Sprint 2 |
| R100 provider_redeemed at R50 threshold, full weight = 2 entries | Yes: floor(10000/5000) |
| Same R100 as provider_checkout at default half = 1 entry | Yes: floor(floor(10000 x 0.5)/5000) |
| Self reporting beyond the cap earns no more, cap visible | Yes, and the dashboard shows cap usage |
| Entries freeze at cutoff, unalterable even by admin | Yes: status-checked writes, totals-only admin view, cron-enforced cutoff |
| Same seed and entry set reproduce the same winner | Yes: pure SHA-256 walk over canonically ordered entries |
| Flag off: no route anywhere allows a purchase | Yes: server action refuses, no control renders |
| Flag on: logged-out reads, cannot act; sub-R49 refused server side; unpaid cannot buy | Yes, all three server-enforced |

The live-data walks need the migrations and a created draw; every screen
renders its honest empty state until then.

## 6. WHAT YOU NEED TO DO

- Run Appendix E below (settings inserts and one column; safe to re-run).
- In /svc/admin/draws, create August's draw: prize "A R2,000 grocery
  voucher", value 2000, cutoff the last day of the month, defaults
  otherwise. Leave purchases OFF.
- Everything else on DEWALD_CHECKLIST.md stands unchanged.

## APPENDIX E: THE SPRINT 4 MIGRATION SQL (safe to re-run)

```sql
-- SVC Sprint 4: the draw's remaining fixtures. Safe to re-run; the only
-- inserts are settings guarded by on conflict do nothing.

insert into svc.setting (key, value) values
  ('draw_purchase_min_package_cents', '4900'),
  ('fraud_chain_weekly_threshold', '10')
on conflict (key) do nothing;

alter table svc.draw
  add column if not exists prize_issue_id uuid references svc.benefit_issue (id) on delete set null;

create index if not exists svc_draw_entry_order_idx
  on svc.draw_entry (draw_id, created_at, id);
```

## 7. WHERE SPRINT 5 STARTS

WhatsApp, scoped separately once a verified Meta number exists for SVC,
per the handoff: nothing WhatsApp was built in Sprints 1 to 4 and no DF
WhatsApp number or account was touched. Everything until then is email
driven, and is. The other open thread is MiFuel: the moment their
remaining documentation and credentials arrive, the provider drops in
behind the Sprint 2 interface and the provider-verified sources light up
in the savings counter, the draw and the partner reports.
