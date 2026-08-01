# The Desk v1: build report

**Built 1 August 2026. One report, as asked.**

---

## 1. What was built

The Desk lives inside the existing DigitalFlyer Growth app and the existing Growth Supabase
project. No new Supabase project, no new Vercel project, no new paid service, nothing added to the
monthly cost base. Two new tables, five new screens, one new hostname branch in the router.

**Screens**

| Screen | Path | What it does |
| --- | --- | --- |
| Dump | `/desk` | One box, one button. Multi-line paste becomes one item per line. Sort button underneath. |
| Today | `/desk/today` | Wrecked, Normal, Sharp. Returns one item. Done, Skip, Blocked by someone. Plain list of what was done today. |
| Waiting On | `/desk/waiting` | Every item blocked by a person or a date, grouped by person, with days elapsed. Unblock and Nudge sent. |
| Register | `/desk/register` | The assets table, filterable and sortable, editable in place, monthly total split personal and business, renewals inside 30 days highlighted at the top. |
| Export | `/desk/export` | The whole state as plain markdown in a copyable block. Same text at `/desk/export/raw`. |
| Everything | `/desk/all` | Not one of the four. A filtered list where every item opens a full edit form, so every seeded field is editable. |

**Where it lives**

- Served on `desk.katisobiz.co.za` once the DNS step in section 5 is done. The router branch is
  built and tested.
- Single user. One login screen, no signup, no password reset, no user management. The gate is one
  email address.
- `noindex, nofollow` on every response, including the export endpoint.
- Phone first. Bottom navigation, large tap targets, one-handed.

---

## 2. The two tables as built

They are named `desk_items` and `desk_assets`, not `items` and `assets`. That is the one naming
decision I made against the letter of the handoff: this schema already holds 58 tables shared by
Growth, KatisoBiz and The Board, and two names that generic would collide with the next feature
that wants them. Every other product in the database is prefixed the same way.

```sql
create table public.desk_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  area text not null default 'business' check (area in ('personal', 'business')),
  venture text,
  next_action text,
  effort text not null default 'shallow' check (effort in ('shallow', 'deep')),
  blocked_by text not null default 'me',
  blocked_since date,
  due_date date,
  status text not null default 'open' check (status in ('open', 'done', 'parked', 'killed')),
  park_trigger text,
  killed_at timestamptz,
  skip_count integer not null default 0,
  notes text,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint desk_items_park_needs_trigger
    check (status <> 'parked' or (park_trigger is not null and length(trim(park_trigger)) > 0)),
  constraint desk_items_kill_needs_date
    check (status <> 'killed' or killed_at is not null)
);

create table public.desk_assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'other' check (type in ('domain', 'subscription', 'account', 'tool', 'other')),
  provider text,
  area text not null default 'business' check (area in ('personal', 'business')),
  cost_zar_monthly numeric(10, 2),
  billing_cycle text not null default 'unknown'
    check (billing_cycle in ('monthly', 'annual', 'once', 'unknown')),
  renewal_date date,
  where_login_lives text,
  status text not null default 'unknown' check (status in ('active', 'cancel', 'unknown')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Three fields exist that the handoff did not name: `killed_at` and `done_at` on items, because
section 3.6 says an item can be killed "with a date" and done needs a date for the done-today list,
and `updated_at` on both. Both tables have row level security on with no policies, and only
`service_role` is granted anything: every read and write goes through the server behind the login,
so nothing reaches these tables from a browser.

The migration is applied and live. It is also checked in at
`supabase/migrations/20260801150000_desk.sql`.

---

## 3. Acceptance criteria

Verified against the running app on a real browser and a real database, not by reading the code.

| # | Criterion | Result |
| --- | --- | --- |
| 1 | Capture in under five seconds, title only | **Pass.** One box, autofocused, one button. |
| 2 | Wrecked / Normal / Sharp return exactly one item | **Pass.** One card each, three different rules. |
| 3 | Skip returns a different item and increments `skip_count` | **Pass.** Verified in the database. |
| 4 | Blocked by a person leaves the rotation and appears on Waiting On | **Pass.** |
| 5 | Waiting On shows days elapsed, grouped by person | **Pass.** |
| 6 | Parking without a trigger fails with a clear message | **Pass.** Rejected by the form and by a database constraint. |
| 7 | Register total, split personal and business, renewals inside 30 days highlighted | **Pass.** Totals moved correctly when a priced record was added; a record renewing in 9 days sorted to the top in amber. |
| 8 | `noindex, nofollow` header on every page | **Pass.** Header checked directly on the response, not in the HTML. See section 4. |
| 9 | No notification, badge or unread indicator anywhere | **Pass.** None built. |
| 10 | All 44 seed items and the seed assets present and editable | **Pass.** 44 items, 8 assets, every field editable at `/desk/item/<id>`. |
| 11 | No session returns a login prompt, not content | **Pass.** 307 to the login screen; the export endpoint returns 401. |
| 12 | No password, API key or secret in either table | **Pass.** `where_login_lives` is plain words only. |
| 13 | The capture field does not spellcheck, autocorrect or flag anything | **Pass.** `spellcheck`, `autocorrect` and `autocapitalize` are all off. |
| 14 | Sort proposes four fields in one batched call, writes nothing until accepted, titles byte-identical | **Pass.** One call, 47 items, nothing written until Accept; titles are taken from the stored row, never from the model. |
| 15 | Today shows a plain list of what was done today | **Pass.** No count, no streak, no score. |
| 16 | Five pasted lines create five items | **Pass.** Blank lines ignored. |
| 17 | Export covers open, waiting with days, parked with triggers, register totals, and is reachable at a text endpoint | **Pass.** 4.5 KB of markdown, small enough to paste into a chat. |

---

## 4. The header check

Fetched directly, headers only:

```
GET /desk               → HTTP 307, x-robots-tag: noindex, nofollow, location: /desk/login
GET / (desk hostname)   → HTTP 307, x-robots-tag: noindex, nofollow, location: /desk/login
GET /desk/login         → HTTP 200, x-robots-tag: noindex, nofollow
GET /desk/export/raw    → HTTP 401, x-robots-tag: noindex, nofollow
GET /robots.txt (desk)  → User-Agent: * / Disallow: /
```

---

## 5. What you still have to do, click by click

**A. Point the subdomain at the app.**

1. Go to `vercel.com` and open the `digitalflyer-growth` project.
2. Click **Settings** in the top row, then **Domains** in the left column.
3. Click the **Add** button. Type `desk.katisobiz.co.za` and click **Add**.
4. Vercel will show you a DNS record to create. It will be a CNAME with name `desk` and value
   `cname.vercel-dns.com`.
5. Go to wherever `katisobiz.co.za` DNS is managed and add exactly that record. If a wildcard
   `*.katisobiz.co.za` record already exists, the subdomain may already resolve and Vercel will
   show the domain as valid without you adding anything.
6. Back on the Vercel Domains page, wait for the domain to show a green tick. It can take a few
   minutes.

**B. Tell the app which login is yours.**

1. Still in the `digitalflyer-growth` project, click **Settings**, then **Environment Variables**.
2. Click **Add New**.
3. Key: `DESK_EMAIL`. Value: the email address you want to log in with.
4. Tick **Production**, **Preview** and **Development**. Remember this project needs one entry per
   environment if you ever edit it later.
5. Click **Save**.

If you skip this, the app falls back to the first address in `ADMIN_EMAILS`, which is already your
address, so it will still work. Setting it explicitly is clearer.

**C. Make sure that login has a password.**

The Desk uses the same Supabase login as everything else. If the account you name in `DESK_EMAIL`
already signs in to the Growth admin, nothing to do. If it has never set a password, use the normal
forgot-password flow on the Growth site once, then use the same password here.

---

## 6. Decisions I made that the handoff did not cover

- **Table names.** `desk_items` and `desk_assets`. Reasoning in section 2.
- **Two extra date fields.** `killed_at` and `done_at`, both needed by rules the handoff does set.
- **The fifth screen.** Built, because the handoff allows it and because 44 seeded rows that need
  correcting are hard to reach one card at a time. It is a list with filters and nothing else.
- **Model choice for Sort.** Claude Opus 5, one call for the whole batch, thinking effort turned
  down because this is short classification and you are waiting on the screen. The call for all 47
  untriaged items took about 40 seconds and costs a few cents.
- **Venture is free text, not a fixed list.** The existing tags are passed to the model so it reuses
  them, but nothing stops you typing a new one.
- **The whole app works with JavaScript switched off.** Not a goal, but every screen is a plain
  form, which makes it fast on a bad connection.
- **Auth is the existing Supabase login, gated to one email.** No new auth system, no new
  dependency.

---

## 7. Nothing in section 3 turned out to be contradictory or impossible

Two small notes rather than contradictions:

- Item 29, the token disposition, is `blocked_by = date` with no date named, so Waiting On shows it
  as "no date set". Give it a date when you know one.
- The seed items were loaded with `effort` left at the default shallow except for the four the
  handoff explicitly marks deep. Sort will propose effort for the rest.

---

## 8. One thing about your PC, not about The Desk

`npm run dev` on this machine starts, prints "Ready", and then dies a few seconds later. The cause
is a Windows Application Control policy blocking Next.js's compiler binary
(`node_modules/@next/swc-win32-x64-msvc/next-swc.win32-x64-msvc.node`), so it falls back to a
WebAssembly build that Turbopack cannot use. Adding `--webpack` works around it:

```bash
npm run dev -- --webpack
```

The production build compiles fine that way too, but its type-checking step then crashes inside the
same WebAssembly fallback. Type checking passes when run on its own (`npx tsc --noEmit`, clean), and
Vercel builds on Linux where the real binary is available, so this affects only local builds on this
PC. Worth unblocking that file if you can.

---

## 9. What was done to your data during testing, and undone

To verify the acceptance criteria end to end I created a throwaway login and five throwaway items
called "verify line one" to "verify line five", plus one throwaway register row. Every one of them
has been deleted, along with the throwaway login. The database is back to 44 items and 8 assets,
with no next actions written, no skip counts, and no status changes on any of your own rows.
