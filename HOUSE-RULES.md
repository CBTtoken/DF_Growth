# HOUSE RULES

**Read this before touching anything.** This is standing rules only — not a
feature list, not a spec index. `MODULES.md` says what exists. `CHANGELOG.md`
says what happened. This says how work gets done here without breaking
something another session can't see.

Started 6 August 2026, from `scripts/handoff-codebase-health-and-reference-docs.md`.
Add to it every sprint. Never let it contradict the code — if you find a rule
here that the code no longer follows, fix the rule or flag it, don't leave
both standing.

---

## Naming

**Every naming decision, and every retired name:**

| Retired name | Current name | Notes |
|---|---|---|
| BizUp | **KatisoBiz** | Renamed 27 July 2026. Public URLs moved off `/bizup/` onto `katisobiz.co.za` (`src/proxy.ts` rewrites the KatisoBiz hostname to the `/bizup` route internally). The route folder is still `src/app/bizup/*` and internal identifiers (table prefix `bizup_*`, code comments citing `BizUp/docs/...`) still say BizUp — that is deliberate, not a leftover, because those paths are cited from source comments (see `docs/DOCUMENT_INDEX.md`). A member never sees the word BizUp. |
| RE:Biz | *(retired, no replacement in this codebase)* | Referenced in old docs as a predecessor concept. Don't build against it. |
| Bookings (as a name for accommodation) | **Stays and Tours** | Booking already exists as the slot-based appointment module (`bookable_units`, `reservations` tables, live). Stays and Tours is a separate, not-yet-built accommodation module — its handoff exists on Dewald's machine only, not yet in this repo. Do not call either one "Bookings" alone; say which one. |
| "Unlimited" (KatisoBiz R89 plan) | **Unlimited Documents** | The plan is unlimited on document count, not on everything. Never shorten it. |
| "Directory" / "listing" (for the marketplace) | **Marketplace** | Standing rule, not just a naming note — see Terminology below. |

**The pattern:** three naming problems have already cost real work (a folder
described as a "lead switchboard" that actually held a scrapped signup
wizard; an account figure off by a third; a plan name quietly losing half its
own qualifier). Check a new name against this table and against `MODULES.md`
before it enters a table name, a route, or a public sentence. If it's already
taken by something else, that collision is exactly the kind of thing this
file exists to catch before it ships.

---

## Standing product rules

- No fabricated testimonials, social proof or invented facts anywhere, ever.
- No credentials, passwords or API keys stored in The Desk or any document.
- The system never moves money. Members connect their own Paystack or Bob
  Pay. DigitalFlyer's own Paystack account bills DigitalFlyer's own products
  only.
- Members send their own messages. Nothing sends on a member's behalf
  automatically.
- Personal information never appears in a page an unauthenticated request
  can fetch.
- Individually public facts become sensitive when aggregated into a
  structured, repeatable record.
- Never store what you do not need. ID numbers and bank details are never
  held.
- Alerts, not scores. Never rank or score people.
- Never put friction on the scarce side of a marketplace.

## Terminology

- **Marketplace**, never directory or listing.
- **SARS-ready**, never SARS compliant.
- Rand and South African context by default.
- **No em dashes anywhere in copy.** Enforced at build time by
  `scripts/check-house-style.mjs` (`npm run check:style`) — a build with an
  em dash in readable text does not pass.
- No load shedding references. It ended in May 2026.
- Member greetings open **"Good day {name},"**, never "Hi there."

## Every anonymous form gets a Turnstile check. No exceptions.

Dewald, 3 August 2026: blocking bots, scammers and automated abuse is a core
priority across every build.

If a stranger can post to it without logging in, the server action verifies
a Turnstile token before it does anything, and the form renders
`<TurnstileWidget />`. Both halves, or it does not work: a widget with no
server check is decoration, and a server check with no widget locks real
people out.

A rate limit is not a substitute. `isRateLimited` lives in one serverless
instance's memory and resets on every cold start, so it stops one impatient
browser tab and nothing else. Keep it, it is useful, but it is not the gate.

The check goes in the server action, verified against Cloudflare, never
trusted for being present. Growth member signup is the one deliberate
exception, because an account is only created after a real Paystack payment
succeeds, which no bot can fake. Anything behind a login is out of scope for
this rule.

Spot-checked during this sprint on the Board's comment/like/report actions
and the Booking hold action: all three verify Turnstile server-side and
render the widget. Nothing found contradicting this rule.

## The deny list

Never without Dewald:

- Deleting files
- Force pushing
- Touching secrets or environment variables
- Changing Vercel settings
- Writing to production data
- Payment credentials

Legal questions go to Dewald's attorney, never answered in code or copy.

## Working conventions

- **The three minute rule.** Before spending longer than three minutes going
  down a path, check it's the right path.
- **One report at the end, not running commentary.**
- **Preview deployments, never straight to main.** Main deploys to
  production the moment it is pushed — there is no staging step.
- **Webhooks on preview deployments need the Vercel protection bypass
  appended**, or the provider's callback hits Vercel's deployment-protection
  wall instead of the route.
- **One workstream, one branch, named for the work.** Branch off current
  main, keep it short-lived, merge deliberately.
- **`git add -A` sweeps up whatever a parallel session has in the working
  tree.** Add the paths you actually changed, nothing else. This already
  happened once for real: 6 August 2026, the entire `jobs-sprint-1-job-seekers`
  branch's uncommitted files (25 new files) got swept into a `main` commit by
  `git add -A`, and needed two follow-up corrective commits
  (`6824d8a`, `cabf93f`) to untrack them without touching the seven files
  that legitimately belonged on `main`. No history rewrite, no force push —
  a corrective commit on top, because the bad commit was already pushed.
  See `CHANGELOG.md`.
- **Never force push.** Not with `--force`, not with `--force-with-lease`,
  not to main and not to a shared branch. If a push is rejected, fetch, look
  at what landed, and check whether your files overlap theirs before
  continuing.
- **Verify against the live site with a string the page actually renders.**
  Not a build log, not an HTTP 200 on a route that redirects.
- **Ask before deleting anything shared**: a branch, a table, a bucket, a
  row of Dewald's data. Test data you created yourself is still his call.
- **Leave no old traces.** Delete test rows, test accounts, temp scripts and
  storage objects before reporting done. When something is renamed or
  retired, the permanent redirect goes in and the old version dies — never
  leave both alive.
- **Every new page or section ships clean, linked and crawled** — in the
  sitemap (or deliberately excluded, in writing), its own title, description,
  canonical and og image, something already indexed links to it, nothing
  noindexes it by accident.

## How a sprint ends, from 6 August 2026 onwards

Every sprint ends by updating `HOUSE-RULES.md` where a rule changed,
`MODULES.md` where a module changed, and `CHANGELOG.md` always. Deleting what
the sprint made dead, with every deletion listed. Reporting anything stale,
contradictory or unsafe found along the way. Flagging any query likely to get
slow at scale, even if it was deliberately left alone this time.
