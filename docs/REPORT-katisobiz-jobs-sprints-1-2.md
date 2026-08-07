# KatisoBiz Jobs — Sprints 1 and 2, end-of-work report

Written 7 August 2026. Spec: `scripts/spec-katisobiz-jobs.md`. Both sprints
built, verified against the live database, and pushed. **Neither branch is
merged to main yet** — that is the next deliberate act, Dewald's call.

## Where the work lives

- Branch `jobs-sprint-1-job-seekers` — CV builder, candidate accounts,
  anonymous browse layer, plus the polish pass from Dewald's walkthrough
  (two-level role picker with up to 3 positions, expanded taxonomy, one
  month's notice, three PDF templates, capped AI wording pass).
- Branch `jobs-sprint-2-employers` — **stacked on Sprint 1**: employer
  accounts, vacancy posting with the advance-fee auto-hold, Paystack tiers
  with two-week lapse handling, public vacancy pages, full-record view
  logging with the scraping watchlist, the jobs-cleanup cron, admin queue
  sections.
- Merge order: Sprint 1 into main first, then Sprint 2 (it rebases clean).
- All `jobs_*` migrations up to `20260807120000_jobs_employers.sql` are
  **already applied to the live database** and verified. Supabase CLI
  migration tracking is clean (`db push --dry-run` reports up to date).

## Settled decisions (do not re-ask)

- Subdomain `jobs.katisobiz.co.za` — DNS live, SSL live, currently serving
  Growth's home page because the code is not on main yet. Flips on merge.
- Candidate and employer auth: email + password + typed code, same as
  KatisoBiz. WhatsApp-code login was considered and declined.
- Taxonomy: curated SA list, two-level (field → position), `Other` free
  text feeds curation. Candidates pick up to 3 positions.
- Pricing (Dewald, 7 Aug): only PAYING Growth/KatisoBiz members post free
  and unlimited (free KatisoBiz accounts deliberately do NOT count);
  non-members get one free post ONCE EVER, then R45/mo for 5 posts per
  calendar month, or R69/mo unlimited. Lapse = two-week grace, then posts
  come down and plan reverts to free. Member entitlement is derived at
  read time (`src/lib/jobs/entitlements.ts`), never stored.
- No match scores, ever. Sprint 3's application fit notes are WRITTEN
  reasoning, never a percentage or ranked list.
- Facebook: rides the DigitalFlyer SA page; post the role, never the person.

## Blocked on Dewald (in order)

1. **Test the Sprint 1 preview** (branch deployment) and give the merge go.
2. **Merge Sprint 1 → main**, then Sprint 2. Main deploys instantly.
3. **Create two Paystack plans** in the dashboard: R45/month and R69/month.
   Put their plan codes in Vercel env as `PAYSTACK_PLAN_JOBS_STARTER` and
   `PAYSTACK_PLAN_JOBS_UNLIMITED`. Until then the upgrade page fails
   politely; everything else works.
4. **Check `ANTHROPIC_API_KEY` exists in Vercel production env** — the CV
   builder's AI wording pass needs it (works locally, verified live call).
5. First real end-to-end signup test on the live domain (typed email code
   needs a real inbox), including the Turnstile widget, which only renders
   on the real hostname.
6. Try the admin held-vacancy approve/remove buttons on /admin/board —
   built on the proven Board patterns but not clickable without Dewald's
   admin session.

## Verified working (live DB, not code review)

Sprint 1: full CV build flow at 375px, auto-save + resume, ID/bank-number
auto-strip, 3-role multi-select with cap, PDF in all templates, real AI
polish call (grammar fixed, nothing invented, tips returned, counter
decremented), anonymous pages carry zero PII, sitemap/robots/canonicals
host-aware, deletion writes the stripped demand line.

Sprint 2: login routing to the employer dashboard, free post → published
30 days → allowance flip, "R150 registration fee" post → held with reason
+ logged + publicly invisible, member bridge flips entitlement live in
both directions, one-tap renew (+30d), real cron run of lapse enforcement
(post removed, demand line written, plan reverted), full-record view
logged per employer view, per-account hourly rate limit path renders the
anonymous card.

All test rows and test auth users deleted after verification.

## Known gaps and notes for the next session

- **Sprint close-out rule** (HOUSE-RULES.md): MODULES.md/CHANGELOG.md
  entries for Jobs are still owed — those files live on the unmerged
  `codebase-health-audit` branch. Add the entries once it lands on main.
- The employer "chooser" for a KatisoBiz/Growth login with no jobs rows
  was planned but simplified: such a login landing on /jobs/login goes to
  /cv (their CV creates itself). Revisit if it confuses anyone.
- `invoice.payment_failed` is log-only by design (Paystack retries).
- The in-memory rate limiter resets per instance (documented in
  `src/lib/rate-limit.ts`); the durable anti-scrape control is the
  jobs_record_views watchlist on /admin/board.
- Board's own report action still has no Turnstile check — flagged as a
  spawn-task chip earlier, untouched by these sprints.
- Sprint 3 backlog (spec + Dewald's notes): alerts both directions,
  Facebook posting via page-poster-queue, verified-employer badge from
  KatisoBiz invoice activity, vouching, applications with qualitative fit
  notes, CV review service idea.
