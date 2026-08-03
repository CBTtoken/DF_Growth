# BUILD REPORT: THE DESK HEALTH CHECK, PHASE 2

**Against TheDesk/Handoff_Desk_HealthCheck.md section 11 | 3 August 2026**

Phase 1 (commit `850b241`, same day, earlier session) built the checks, the
screen and the tripwire. This phase closed the four things it left open.

---

## WHAT WAS BUILT

**1. Vercel spend is now a real number.** The upcoming-invoice endpoint the
first pass tried does not exist on this plan (404). The working endpoint is
`/v1/billing/charges`, which streams FOCUS-format line items per day. The
check now reports: month-to-date spend against the $20 included credit, the
biggest line item by name (it is Build CPU, as ESTATE.md predicted), and
last month's spend at the same point in the cycle, warning when this month
runs half again ahead. Verified live before shipping: $0.81 for the first
two days of August, $0.59 of it Build CPU Minutes.

**2. The weekly restore test exists and reports honestly.**
`.github/workflows/weekly-restore-test.yml`, Sundays 03:30 UTC, right after
the existing weekly backup. It dumps the live database (public and auth
schemas, because public's foreign keys and policies lean on auth), restores
into a throwaway PostGIS 17 container that dies with the job, verifies row
counts on seven main tables against live within a small tolerance, and
writes the outcome to `desk_backup_restores`, success or failure, so the
health screen's "last successful restore" age is fed by real events. A run
that dies early still writes a failure row: silence and failure are
different problems and the screen should tell them apart. No new secrets:
it reuses the backup workflow's `SUPABASE_DB_URL` and reports over that
same connection.

**3. The daily run.** The health checks now run inside the existing 06:00
UTC daily cron, storing history and raising Desk items exactly like the
button. `warn` still creates nothing, and there is still no badge, count or
notification anywhere in The Desk.

**4. This report.**

## PROVIDER APIS: WHAT IS READABLE AND WHAT IS NOT

| Provider | State |
|---|---|
| Vercel | Readable: FOCUS billing charges, per service, per day. |
| Supabase | Readable from the database itself (size, RLS, account count). |
| Resend | Still `unknown`: the key in use is send-only by design. A separate read key (`RESEND_READ_KEY`) would turn it into a number. |
| Paystack | No usage to read; key validity and live/test mode are checked. |
| Cloudflare | Correctly reported as not in the serving path (only Turnstile). |
| Meta Cloud API | Still `unknown`, needs a token if conversation spend should be watched. WhatsApp lives in the DF-WhatsApp project, so this may belong there instead. |

## WHAT DEWALD NEEDS TO DO

1. Nothing for the restore test to run: the first scheduled run is Sunday
   10 August, 03:30 UTC. To see it sooner, GitHub > Actions > "Weekly
   restore test" > Run workflow. Until one run succeeds, the health screen
   keeps its honest fail that no restore has ever been tested.
2. Optional, to close the two `unknown`s: a Resend read key as
   `RESEND_READ_KEY`, and a decision on whether Meta spend matters here.
3. The three security actions from the phase 1 build (2FA everywhere,
   account access audit, the RE:Biz plaintext password confirmation) remain
   yours alone; the seeded Desk items still track them.

## HONEST LIMITS, UNCHANGED

Everything section 7 of the handoff says still holds and is still written
on the screen: this cannot detect a competent intrusion, cannot see 2FA,
and cannot report the platform being down from on top of the platform. The
restore test runs on GitHub, which softens the last point for backups
specifically, but an external uptime pinger for the public hostnames is
still worth adding and still deliberately not built here.

## ACCEPTANCE CRITERIA TOUCHED BY THIS PHASE

| Criterion | Result |
|---|---|
| 3. Spend materially above last month at the same point flagged | **Pass**, built and live-tested against real August/July data |
| 4. Providers without a readable API show `unknown`, never a guess | **Pass**, Resend and Meta stay `unknown` with the reason stated |
| 9. Weekly restore runs, reports row counts, fail when stale, partial never a pass | **Built**; first scheduled run 10 August. The workflow only ever writes `kind: full` with verified counts, or `succeeded: false` |
| 10. A fail creates exactly one Desk item, repeats update it | **Unchanged from phase 1**, the daily run reuses the same path |
| 12. No notification, badge or unread indicator anywhere | **Pass**, the daily run adds none |
