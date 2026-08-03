# SVC SPRINT 2, BUILD REPORT

**Per handoff section 16 | 4 August 2026**
**Branch: `svc-sprint-1` (the whole SVC build rides one branch until you approve a merge). Nothing is on main.**

---

## 1. WHAT WAS BUILT, IN PLAIN LANGUAGE

**The member dashboard.** Logging in now lands on a real dashboard: the
savings counter at the top, this month's benefits underneath with one
obvious button per state, the referral section with your share link and
the three numbers, and cancellation at the bottom. Phone first, same
palette rules as the public site.

**The savings counter, honest by construction.** It shows a Rand figure
computed only from benefits the member actually used. A member who has
used nothing sees the face value sitting unused in their account and the
words "your real savings start counting here", never a projection. This is
handoff 7.1 exactly.

**The ledger breathes.** Every benefit a member holds moves through
issued, opened, claimed, redeemed, each transition stamping its own
timestamp. The "I used this" button carries the optional "how much did you
save" question; the answer (or the face value when they skip it) is
recorded as realised value with source self_reported. Provider-verified
sources plug into the same rows in Sprint 4.

**The monthly issue run.** Every morning the platform issues the current
month's benefits to every paid-up member who does not have them yet. On
the 1st that is everyone; on other days it is whoever activated since,
which is what makes "your first benefits arrive immediately" true with one
code path. It is idempotent (nobody can be issued twice for a month),
joins the existing consolidated daily cron, sends each member the
"benefits are ready" email, and hands out imported coupon codes while
stock lasts. A cancelled member keeps receiving until their paid period
ends.

**The coupon interface and the manual import path.** The internal coupon
interface from handoff section 9 exists (member coupons, open, claim,
confirm used), with the manual import implementation behind it: admin
pastes the month's codes per benefit, the issue run distributes them, the
member screens at /account/coupons show the catalogue, the code, and the
confirmation flow, all styled as SVC. When MiFuel's catalogue and
redemption documentation arrives, a MiFuel implementation of the same
interface drops in and these screens do not change.

**Moxie access, one login.** Moxie's entitlement check now also asks,
through an interface function and never a join, whether the signed-in
reader is an SVC member whose package includes the magazine. An SVC member
opens moxiemag.co.za, logs in with the same email and password, and reads
from the month they joined, same rule as Moxie's own members. The access
code path is untouched and remains for handed-out codes.

**Referrals, set at signup.** Every member gets a share code (readable
alphabet, no ambiguous characters) and a link, with a WhatsApp share
button on the dashboard. A signup arriving through a link builds the
chain at the moment the new member's cell verifies: level 1, then up to
levels 2 and 3, and never a fourth, with self-referral refused and
duplicate cells impossible by the schema's own unique constraint. The
dashboard shows people per level, this month's earning, total earned,
applied or paid out, and balance. (The monthly earning run itself is
Sprint 3, alongside the payout run it belongs to.)

**Cancellation.** One screen, one required question (the reason, captured
verbatim for you), no fees, benefits live to the end of the paid period,
and a calm confirmation. Rejoining later just works.

**Minimal admin, because Sprint 2's acceptance needs it.** /svc/admin,
gated by an email allowlist (SVC_ADMIN_EMAILS): find a member by cell or
email and see their full ledger with every timestamp, upload the month's
coupon file, and press the issue run by hand. The real admin (partners,
package builder, payout runs, fraud view) stays Sprint 3.

## 2. WHAT I DECIDED THAT WAS NOT SPECIFIED

1. **The issue run is daily and idempotent rather than a 1st-only job.**
   The handoff says benefits land on the 1st; it also promises immediate
   activation. One idempotent daily run satisfies both without a special
   case, and it slots into the platform's existing consolidated cron
   (one cron entry per plan limits).
2. **"I used this" without an amount records the face value** as the
   realised number, marked self_reported. The most honest available
   figure for "I used it" with no amount given; Sprint 4's cap on
   self-reported entries is where abuse gets bounded, per handoff 10.2.
3. **Magazine and education benefits use the same open/claim/used
   mechanic as coupons.** One mental model for the member, one ledger
   shape for the reports.
4. **Referral chains are written at cell verification**, not at payment.
   Section 8 says relationships are set at signup and matched on verified
   cell numbers; earnings still only ever accrue for paid months, so
   nothing is earned from an unpaid signup.
5. **The share link and WhatsApp button use wa.me**, which is a share
   URL, not a WhatsApp integration; Sprint 5's rules are untouched.
6. **Admin is an email allowlist for now** (SVC_ADMIN_EMAILS env var)
   rather than a role model, which arrives with Sprint 3's real admin.

## 3. ANYTHING WRONG OR IMPOSSIBLE IN THE HANDOFF

Nothing found this sprint. One boundary honoured rather than crossed:
Sprint 2 lists "monthly issue run with member email" and the referral
member view, but the referral EARNING run is deliberately not built here;
it is listed under Sprint 3 in the handoff and it stays there, so the
dashboard's "this month's earning" reads R0 until that run exists.

## 4. WHAT IS BLOCKED AND ON WHOM

Everything from the Sprint 1 report still stands (migration + exposed
schema, Paystack test keys, Turnstile pair, redirect allowlist, SMS
provider, ECT footer, final prices). Sprint 2 adds:

| Blocked thing | On | Needed |
| --- | --- | --- |
| Sprint 2 tables live | Dewald | Run Appendix C below (after the Sprint 1 SQL) |
| Admin access | Dewald | Set SVC_ADMIN_EMAILS in Vercel (comma-separated, e.g. your two emails) |
| Referral earnings accruing | Sprint 3 | The monthly referral run, per the handoff's own ordering |
| Provider-verified redemptions | MiFuel docs | Appendix A Q3-13; Q6 and Q14 first |

## 5. WHAT YOU NEED TO DO TO SEE IT WORKING

1. Do the Sprint 1 report's steps if you have not yet (migration, exposed
   schema, Turnstile, Paystack test key, redirect allowlist).
2. Run Appendix C below in the same Supabase SQL editor.
3. In Vercel, add `SVC_ADMIN_EMAILS` with your email address, redeploy.
4. On the preview URL: sign up (your real email; the OTP arrives by
   email), verify, pay with the Paystack test card, then open /svc/admin,
   press "Run the issue now", and watch your own dashboard fill with the
   month's benefits. Tap "I used this" on one with an amount and the
   savings counter moves. Then sign up a second test account through your
   own referral link and see level 1 appear.

## APPENDIX C: THE SPRINT 2 MIGRATION SQL (run after the Sprint 1 SQL; safe to re-run)

```sql
-- SVC Sprint 2: what the member area and the monthly issue run need on
-- top of the Sprint 1 schema. Safe to run at any point after the Sprint 1
-- migration; contains no seed inserts, so re-running is harmless.

alter table svc.member
  add column if not exists referral_code text unique;

comment on column svc.member.referral_code is
  'The member''s shareable referral code, e.g. svc.co.za/join?ref=CODE. Generated once server-side; never reissued.';

create table if not exists svc.coupon_file (
  id uuid primary key default gen_random_uuid(),
  benefit_id uuid not null references svc.benefit (id) on delete restrict,
  period date not null,
  note text,
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (benefit_id, period)
);

create table if not exists svc.coupon_code (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references svc.coupon_file (id) on delete cascade,
  code text not null,
  benefit_issue_id uuid references svc.benefit_issue (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (file_id, code)
);

create index if not exists svc_coupon_code_unassigned_idx
  on svc.coupon_code (file_id) where benefit_issue_id is null;

grant select, insert, update, delete on svc.coupon_file to service_role;
grant select, insert, update, delete on svc.coupon_code to service_role;

alter table svc.coupon_file enable row level security;
alter table svc.coupon_code enable row level security;
```
