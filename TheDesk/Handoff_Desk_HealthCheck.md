# CLAUDE CODE HANDOFF: THE DESK, HEALTH CHECK ADDENDUM

**Prepared for Dewald Rosema | 2 August 2026 | Pick this up after The Desk v2 reports back. Do not build it alongside v2.**

---

## 1. CONTEXT

Dewald runs six live or near-live systems as a single non-technical operator from Vadodara: Growth, KatisoBiz, The Board, FortisLex, HelpLift and The Desk. Kwaai Press exists but is roughly three months from public use and is lower priority here.

The stack spans Vercel, Supabase, Cloudflare, GitHub, Resend, Paystack and the Meta Cloud API. Checking all of them today means logging into seven places, so it does not happen.

**Two stated concerns, in his priority order:**

1. **Usage and cost.** Not discovering too late that a quota ran out and something stopped, or that a bill grew unexpectedly. This is the more likely of the two to actually happen.
2. **Security, speed and early detection.** Knowing whether defences are in place and whether anything changed that he did not change.

---

## 2. WHAT THIS IS, AND WHAT IT IS NOT

**It is** a tripwire and a status board. One screen, one button, and a daily run that turns failures into Desk items.

**It is not** breach detection. A competent intruder will not trip a cron job the target wrote, and this must never be described in the interface as proof that nothing has happened. Do not write copy anywhere that says "secure", "protected" or "no breaches detected". Report facts, not reassurance.

**It is not** an uptime monitoring service. Checks that run on the platform cannot report that the platform is down. See section 5.

---

## 3. WHERE IT LIVES

Inside The Desk, at `/desk/health`. Existing Growth Supabase project, existing auth, same single user. No new vendor and nothing added to the monthly cost base beyond free tiers.

One new table, `desk_health_runs`: timestamp, check name, status (`ok`, `warn`, `fail`, `unknown`), a short human-readable result, and the raw value where there is one.

Keep history. Trends are the point: a number that moved is more useful than a number.

---

## 4. THE SCREEN

A **Run checks** button and a list of results, grouped by the four categories below, worst first. Each row: check name, status, the result in plain words, and when it last ran.

Anything that returns `fail` creates a Desk item with `blocked_by = me` and a next action. Do not create duplicates: if an open item already exists for that check, update it rather than adding another.

`warn` does not create an item. It shows on the screen only.

**No notifications, no email, no badges, no counts anywhere else in The Desk.** That rule from v1 still holds. The health screen is somewhere he goes, not something that interrupts him.

---

## 5. THE CHECKS

### 5.1 Usage and cost, the priority group

Pull current usage and spend from each provider's API where one exists. Where there is no API, record `unknown` and say so plainly rather than guessing.

- Vercel: current month spend, bandwidth, function invocations, build minutes
- Supabase: database size, storage used, bandwidth, monthly active users
- Resend: emails sent this month against the plan limit
- Cloudflare: requests and any plan-limited feature in use
- Meta Cloud API: conversation spend for the month
- Paystack: nothing usage-based, but flag if the account status is anything other than active

**Warn on trajectory, not just level.** Compare percentage of quota consumed against percentage of the month elapsed. Sixty percent used on day five is a warning. Sixty percent on day twenty-five is fine. This is the single most useful behaviour in the whole build.

Also flag: this month's spend materially above last month's at the same point in the cycle.

For each provider, record the plan and its hard limits in config so the check knows what it is measuring against. Ask Dewald for anything you cannot read from an API.

### 5.2 Availability

- Fetch the public homepage of each live system and record status code and response time: Growth, KatisoBiz, The Board, moxiemag.co.za, FortisLex, HelpLift, The Desk.
- A simple query against Supabase to confirm the database answers.
- Pull the public status pages of Vercel, Supabase, Cloudflare, GitHub, Resend and Paystack and report any that are not green.

**The gap, and state it in the README:** these checks run on the same infrastructure they are checking, so they cannot report that infrastructure being down. Recommend Dewald add a free external uptime pinger for the six public hostnames. Do not build one.

### 5.3 Change detection

This is the closest thing here to Dewald's "did anyone add something we did not add" question, and it is the most valuable security work in the build.

- **Deployed code versus Git.** Compare the commit deployed on Vercel to the head of the main branch. Flag any difference, and flag any deployment not triggered by a push.
- **Schema drift.** Compare the live database schema to the checked-in migrations. Flag new, removed or altered tables and columns.
- **New accounts with access.** List users on Supabase, Vercel and GitHub. Compare against the previous run. Flag any addition or permission change.
- **Row level security.** Flag any table with RLS disabled. Report the list, do not attempt to fix anything.
- **Dependency vulnerabilities.** Report critical and high severity advisories. Recommend Dewald enable Dependabot on the repository, which does this for free and continuously.
- **Secret exposure.** Fetch a sample of public endpoints and confirm no API key, token or connection string appears in the response body or headers.

### 5.4 Backups, and this one must actually restore

A backup that has never been restored is not a backup.

Weekly, not daily: take a database dump, restore it to a throwaway target, confirm it completes and that row counts on the main tables are within a sane range of live. Then destroy the throwaway.

Report the age of the most recent successful restore. If it is older than eight days, that is a `fail`.

If a full restore is not achievable within a reasonable runtime, do a schema-only restore plus row counts and say clearly in the result that it was partial. Do not report a partial test as a pass.

---

## 6. REPORTING CHANGES, NOT EVENTS

Blocked probes and failed logins against a public site are constant background noise. If this screen reports them, Dewald will stop reading it within a week.

Report only things that changed and mean something: a new account with access, deployed code differing from Git, schema drift, a new critical vulnerability, spend or usage ahead of trajectory, a failed backup restore, a service not responding, a status page not green.

---

## 7. WHAT THIS CANNOT DO, WRITE THIS IN THE README

In plain language, so it is not forgotten:

- It cannot detect a competent intrusion. Absence of failures is not evidence of safety.
- It cannot tell you whether 2FA is enabled on your accounts.
- It cannot audit who else has access to accounts outside Supabase, Vercel and GitHub.
- It cannot confirm historic issues were remediated.

**Three things only Dewald can do, and they buy more real security than this entire build.** List them in the README and seed them as Desk items:

1. Enable 2FA on Supabase, Vercel, Cloudflare, GitHub, Paystack, Meta and the domain registrar
2. Audit who else has access to each of those accounts and remove anyone who should not be there
3. Confirm the RE:Biz intake form plaintext password issue was remediated. It has been unconfirmed in the record for some time.

---

## 8. OUT OF SCOPE

- Notifications, email alerts, push, badges
- Uptime graphs, response time charts, dashboards
- An external pinger
- Log aggregation or intrusion detection
- Automatic remediation of anything. This build reports. It never fixes.
- Kwaai Press checks. Add when it goes public, roughly three months out.

---

## 9. RUNTIME

The weekly backup restore will exceed a Vercel function timeout. Run it as a scheduled job outside the request path. The daily checks are short and can run in a normal scheduled function.

---

## 10. ACCEPTANCE CRITERIA

1. Run checks completes and shows every check with a status and a plain-words result.
2. A quota at sixty percent on day five warns. The same figure on day twenty-five does not.
3. Spend materially above last month at the same point in the cycle is flagged.
4. Any provider without a readable API shows `unknown`, never a guess.
5. Deployed commit differing from the main branch is flagged.
6. Adding a test user to Supabase is flagged on the next run, and removing it clears the flag.
7. A table with RLS disabled is listed.
8. No public endpoint response contains a key, token or connection string.
9. The weekly restore runs, reports row counts, and reports `fail` if the last success is older than eight days. A partial restore is never reported as a pass.
10. A `fail` creates exactly one Desk item, and a repeat failure updates it rather than creating a second.
11. No copy anywhere states or implies that the system is secure or unbreached.
12. Still true: no notification, badge or unread indicator exists anywhere in The Desk.

---

## 11. HOW TO REPORT BACK

One report. What was built, every criterion pass or fail, which providers expose usable APIs and which do not, what the first live run returned, and anything Dewald needs to supply, such as plan limits or API tokens.

Flag any provider token needed, and how it is stored. Tokens go in environment variables, never in the database.
