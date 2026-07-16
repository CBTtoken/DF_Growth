# Legacy Reactivation Runbook

How to reactivate another batch of lapsed DigitalFlyer members, end to end.
Written after Sprint 1+2 of the first batch (31 businesses, 2026-07-16) so
the next ~200 don't require re-deriving this from scratch. Hand this
document to Claude Code at the start of each future batch along with the
spreadsheet — everything below assumes Claude Code is doing the actual
execution, with Dewald reviewing and approving at the checkpoints marked.

Full background and rules: `docs/GROWTH_LEGACY_REACTIVATION_BUILD_SPEC_CLAUDE.md`.
This runbook is the practical "how to actually run it again" companion to
that spec, not a replacement for it — re-read the spec's Sections 1, 9, and
11 (scope exclusions, sending safeguards, out-of-scope items) before every
batch, since those rules don't change between batches.

## 0. Before starting a new batch

- **Consent/legal basis already established, doesn't need re-litigating per
  batch**: this is Dewald's own original member database, same company,
  still live on another domain, just a new build. Confirmed once
  (2026-07-16), applies to every future batch of the same source data.
- **Curate the list first.** Dewald reviews the raw export and removes:
  anything already handled elsewhere (Vowie, RE:Biz, DigitalFlyer SA
  Agents), NPO accounts (handled separately), any business he's already
  decided not to reactivate. Only pass Claude Code the already-curated
  spreadsheet.
- **Spreadsheet format**: same columns as
  `DigitalFlyer_Legacy_Reactivation_Candidates_1.xlsx` — Company Name, User
  Email, First Name, Last Name, Category, Sub Category, Mobile Number,
  WhatsApp Number, Facebook Url, Website, City Name, Address, Introduction,
  Description, Company Logo, Premium StartDate, Premium EndDate. If a future
  export has different columns, the build script needs updating to match —
  don't guess field mappings.
- **Never commit the spreadsheet to git.** It's real customer PII (names,
  emails, phone numbers). Keep it in `docs/` locally, gitignored (see
  `.gitignore`'s "real customer PII source data" line — add the new
  filename there each time).

## 1. Bulk account creation

There's no single checked-in script for this step (Sprint 1's build script
lived in the session scratchpad, not the repo, since it's a genuinely
one-shot data-transform job that needs re-deriving per batch's exact
spreadsheet). Ask Claude Code to build a fresh one following this shape:

- Read the spreadsheet with the `xlsx` npm package (`npm install xlsx
  --no-save` in a scratchpad directory, not the project's own
  `package.json`).
- For each row: `slugify()` the business name with a random 4-char suffix,
  create the `auth.users` row via the admin **`createUser`** REST call
  (`email_confirm: true`) — **not** `inviteUserByEmail` or
  `provisionGrowthClient`, both of which dispatch a real email. Nothing
  should send at this stage.
- Insert `growth_clients` with: `plan: "foundation"`, `status: "active"`,
  **`signup_channel: "legacy_reactivation"`** (this one flag is what keeps
  the business excluded from the onboarding-nudge cron and scoped correctly
  in every admin view — get it right), `trial_ends_at: null`,
  `trial_starts_at` left unset (Section 2 below explains why).
- Match `Category`/`Sub Category` against `INDUSTRY_TAXONOMY`
  (`src/lib/industries.ts`) with a keyword-scoring matcher. **Known
  weakness, worth fixing this round rather than repeating it**: the
  original matcher only scored the legacy category text, never the
  business's own name — "Kangeroo Plumbing" with empty/undefined category
  data matched nothing sensible, when "Plumbing" was sitting right in the
  name. Fold the business name into the scoring signal this time.
- Match `City Name` against `CITIES` (`src/lib/cities.ts`); add any new real
  towns found to the actual file (not just inline in the script) —
  `src/lib/cities.ts` already has the 6 found last round.
- Normalize phone numbers: strip non-digits, watch for the `"27 0<number>"`
  double-prefix bug (country code *and* the local leading zero both
  present) found last round.
- Rehost each `Company Logo` URL into the `client-logos` Storage bucket;
  fall back cleanly (Pexels image or initials) if the fetch fails.
- Generate AI-drafted landing copy via the Anthropic API, grounded strictly
  in the business's own legacy text (system prompt from `reactivation-build.js`'s
  prior version is the reference — re-derive it, forbidding invented years/
  awards/customer counts). **Use `max_tokens: 2048`, not 1024** — the
  original run had 2 failures from truncated JSON on businesses with long
  descriptions; 2048 fixed both on retry.
- Assign templates for real visual variety across the batch, not one
  repeated choice.
- Insert `landing_pages` with `published: true` (Dewald's explicit call:
  publish live immediately, don't hold back until invite time — confirm
  this is still his preference each batch, don't assume it silently).

**After the run**: do a quality pass on the industry matches before calling
it done, the same way Sprint 1 caught 7 real mismatches — spot-check
anything with sparse/`"undefined"` source category data, and anything where
the business name obviously implies a different category than what got
assigned. **When correcting values with an inline JSON PATCH via curl, do
NOT reuse a URL-encoded string in the request body** — the request path
needs `encodeURIComponent`, the JSON body needs the plain text. Sprint 1
shipped 5 industries with literal `%20`/`%26` in them for hours before this
was caught live on the marketplace. Verify corrections landed as plain text
before moving on.

## 2. Trial timing — the one non-obvious gotcha

`trial_starts_at`/`trial_ends_at` do **not** get set by the normal
onboarding-finish code path (`src/app/onboard/actions.ts`) for this batch,
because that code only fires on a `status !== "active" → "active"`
transition — these accounts are created *already* `active`. Leave both
fields `null` at creation time; the send script (Section 4) sets both at
the moment the real invitation actually goes out. If you skip this, the
business gets an effectively infinite trial with no reminder or expiry ever
triggering.

## 3. Admin visibility — nothing to build, already generic

`/admin/reactivation` and `/api/admin/reactivation-export` already filter
on `signup_channel = 'legacy_reactivation'` — every future batch shows up
here automatically, no code change needed. It shows: business, industry,
city, account status (built / invitation sent / trial active / trial
expired / converted), trial start date, email status (verified/invalid/
unsubscribed/bounced/complained), and CSV export.

## 4. Address verification, then staged sending — fully reusable

Both are real, checked-in, generic infrastructure. No changes needed per
batch:

1. **Verify addresses**: click "Verify addresses" on `/admin/reactivation`
   (or call `verifyReactivationAddresses()` directly,
   `src/app/admin/reactivation/actions.ts`). Free syntax + MX/A-record
   check (`src/lib/email/verify-address.ts`) — catches obviously dead
   addresses before anything sends.
2. **Dry run**: `node scripts/send-reactivation-batch.js` (no flags) — logs
   exactly what would be sent to whom, sends nothing, changes nothing.
   Review this output with Dewald before ever going live.
3. **Live send**: `node scripts/send-reactivation-batch.js --live` — sends
   in staged batches of 12 (`--batch-size=N` to change), pauses 90s
   between batches (`--pause=N` seconds) to let bounce/complaint webhooks
   land, auto-stops if the batch bounce/complaint rate crosses 5%. Requires
   `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `RESEND_API_KEY`,
   `APP_ENCRYPTION_KEY`, `NEXT_PUBLIC_SITE_URL` sourced into the
   environment first. **`.env.local`'s `NEXT_PUBLIC_SITE_URL` is
   `http://localhost:3002` (correct for local dev, wrong for a real send)**
   — found the hard way when a first test send went out with dead
   `localhost` links for the public page and unsubscribe link. Always
   override it explicitly for any real or preview send:
   `export NEXT_PUBLIC_SITE_URL="https://growth.digitalflyersa.co.za"`
   after sourcing `.env.local`, before running the script.
4. **This still requires Dewald's explicit manual trigger every time** —
   the script deliberately isn't wired to any button, cron, or UI, per the
   build spec's "no automatic sending, ever" rule. Re-running the script
   after a partial batch is safe — it only ever selects
   `trial_starts_at IS NULL` recipients, so anyone already sent is
   automatically skipped.

Bounce/complaint handling (`/api/webhooks/resend`) and the unsubscribe link
(`/unsubscribe`) are both already live infrastructure — nothing to set up
per batch, they just work off whichever `growth_clients` rows exist.

## 5. Email copy

Reuse `docs/GROWTH_REACTIVATION_EMAIL_COPY.md` as-is unless Dewald wants to
change the message for a later batch — the merge fields
(`[Business Name]`, `[Public Page URL]`, `[Login Link]`, `[Unsubscribe
Link]`) are already exactly what `send-reactivation-batch.js` generates.
If the copy changes, update `buildEmailHtml()` in the script to match — the
script's own comment flags it needs to stay in sync with the doc.

## 6. Schema migrations — always manual

This Supabase project has no CLI link or direct Postgres connection in this
environment — every migration needs Dewald to paste the SQL into the
Supabase SQL Editor by hand. If a future batch needs a new field, write the
migration file, hand him the literal SQL, and **verify it's live via a
direct REST query before pushing any code that depends on it** — don't
assume a "yes I ran it" means the exact statement that was actually needed.
