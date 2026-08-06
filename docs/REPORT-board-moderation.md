# Report: The Board, structural moderation before launch

**Built 6 August 2026 from `scripts/handoff-board-moderation.md`. On branch `handoff-board-moderation`, pushed, not yet merged to main.**

---

## What changed, by file

**Job 1, post types become forms.** New migration `20260806210000_board_post_types_and_expiry.sql` adds `condition`, `saving_text`, `urgency`, `posted_by_client_id`, `last_renewed_at`, `expiry_reminder_sent_at` to `board_posts`, plus five `not valid` check constraints (photo and price required for `for_sale`, an end date and a price-or-saving required for `offer`/`special`, urgency required for `looking_for`). `not valid` means every constraint binds new writes but is never retroactively checked against a post that already exists — nothing already published was touched. `src/lib/board/kinds.ts` gained per-kind flags (`requiresPhoto`, `requiresCondition`, `requiresEndDate`, `requiresUrgency`, `requiresPriceOrSaving`). `src/components/board/PostComposer.tsx` shows the right fields per kind, driven by those flags. `src/app/board/new/actions.ts` — the one real post-creation path (see the note below) — checks every one of them before it ever reaches the database, plus a new `contactDetailsInBody` check (`src/lib/board/moderation.ts`) that rejects a phone number or email typed into the title/description, naming the field that already exists for it.

**Job 2, asymmetric posting rights.** `for_sale.author` in `kinds.ts` changed from `"both"` to `"member"` — the public composer now only ever offers "Looking for." New migration `20260806230000_board_entitlement_rls.sql`: a real RLS policy on `board_posts` INSERT, checked by Postgres itself, not just the app. `src/app/board/new/actions.ts` now routes any member-authored insert through the member's own signed-in session (subject to that policy) instead of the service-role admin client it used everywhere before; a public visitor's post is unaffected, still via the admin client, since it was never money-attached. Full detail and live proof under "How entitlement is enforced" below.

**Job 3, the Board never touches money.** New migration `20260806240000_board_posts_held_reason.sql` (a `held_reason` column, matching what comments already had) plus `'held'` added to `board_posts.status`'s allowed values (in the first migration). New `containsPaymentDetails()` in `moderation.ts` — banking terms, EFT/proof-of-payment phrasing, the common SA payment gateway names — runs on every new post and every comment, holding rather than rejecting. `src/app/admin/board/actions.ts` gained `restoreHeldPost`, the "put it back" counterpart to the removal action that already existed. `src/app/admin/board/page.tsx` gained a "Posts out of public view" section, same shape as the existing held-comments one.

**Job 4, the bot split with toggles.** New migration `20260806220000_board_moderation_rules.sql`: a `board_moderation_rules` table, nine rows, each with an on/off switch. `moderation.ts` gained `autoRuleForNewPost` (frequency cap, duplicate detection, disallowed links, the banned list — all reject-at-submission) and `holdReasonForNewPost` (payment details, suspected scam wording, health/income claims — all hold, never reject), both consulting the toggle table before running each check. The two existing comment rules (link, report-threshold) are now also gated by the same table. New `src/app/admin/board/rule-actions.ts` and a "Rules" section on the admin page — nine switches, grouped by auto/hold.

**Job 5, the banned list.** New `src/components/board/BannedListNotice.tsx`, shown above every composer (both screens — see the note below about a gap I found and fixed while testing). Draft only; wording is quoted in full further down for your sign-off.

**Job 6, anti-scam basics.** New `src/app/admin/board/poster/[type]/[id]/page.tsx` — every post and comment by one poster, any status, linked from every held/reported row in the queue. The report button and the moderation queue it feeds were already fully built before this work; nothing needed rebuilding there.

**Job 7, expiry.** A business post now gets its own expiry at creation (`for_sale`: 60 days; `offer`/`special`: the end date the poster set, capped at 60 days) instead of never expiring. `src/lib/board/queries.ts`: `getPostBySlug` now keeps resolving a business post past its expiry (marked "Expired" on the page) while `listPosts`/`listPostsByMember` keep excluding it from browse, exactly as the brief asks. New `renewBoardPost` action (`src/app/dashboard/board/actions.ts`) and a "Renew" button once a post is within 7 days of expiring. `src/app/api/cron/board-cleanup/route.ts` gained a reminder-email pass (3 days out, deduped). `activeThisWeekIds()` in `queries.ts` now also counts a renewal in the last 7 days as the trading signal, alongside real KatisoBiz activity.

**Cleanup.** `src/lib/schemas/board.ts` and `board-engagement.ts` deleted — both were dead (see below). `publishBoardPost` removed from `src/app/dashboard/board/actions.ts` for the same reason.

## Vercel preview

Pushed, build succeeded: `df-growth-git-handoff-board-moderation-digital-flyer.vercel.app`. Behind Vercel's own SSO, so I verified locally against the real Supabase project instead (dev server walkthrough plus direct database tests) — see below.

## Required fields settled per post type

| Type | Required |
|---|---|
| For sale | Price, condition, area, at least one photo |
| Offer / Special | What it is (title), area, an end date, and either a price or a plain-words saving |
| Deal/promotion from a member | Same as Offer/Special — it's the same `kind` in the data, and "resolves to the member's Growth page" was already true structurally (a business-attributed post already links to the member's own page) |
| Looking for | What's needed, area, how urgent |

## Expiry period per type, and why

- **Looking for: 14 days.** Actually moot in practice — "Looking for" can only ever be posted personally (`businessByDefault: false` was already true before this work), so it always follows the existing flat 10-day public-post rule below, not this table. Flagged under "turned out wrong" further down.
- **For sale: 60 days.** Items linger — a fridge doesn't sell in a week the way a "looking for a plumber" ask resolves.
- **Offer / Special: whatever end date the poster sets, capped at 60 days.** There's no separate system default to invent here — Job 1 already makes the end date a field the poster fills in themselves.
- **Public/personal posts (including a member posting "as myself"): unchanged, still the existing flat 10 days**, still hard-deleted by the cron on that schedule. That's a prior, separate decision of yours (`_board_simplify.sql`'s own comment) and explicitly out of scope here ("retention... sits with your attorney"). I left it alone.
- **Renewal: a flat 60 days for any kind, one tap.** I did not ask a renewing offer/special poster for a fresh end date — that would turn "one tap" into a form, and an old post that predates the new required fields (no condition, no photo) would otherwise become impossible to renew at all.

## Frequency caps, and why

**5 posts per poster per rolling 24 hours, 20 per rolling 30 days.** High enough that no real local business or person notices it, low enough to stop a flooding script or a bad actor. This sits above (doesn't replace) the rate limits already in place — those are anti-abuse throttles by IP/account, this is a content-policy cap on how much of the Board one poster occupies, which is why it's a separate, toggleable rule.

## All poster-facing copy, for your approval

Nothing below is final — this is exactly what ships until you say otherwise.

**Banned-list notice, shown above every "New post" form:**
> A few things don't belong here: money-lending or credit offers, network-marketing or recruitment, firearms, alcohol or tobacco, medicines or health claims, adult content, live animals, event tickets, and job adverts (a jobs section is planned, not open yet). Everything else, go ahead.

**Rejection when a post matches the banned list:**
> The Board doesn't carry that. If this doesn't look right, get in touch and we'll take a look.

**Rejection, phone number in the description:**
> Looks like a phone number in the description. There's already a way to reach you on every post, so take it out of the description.

**Rejection, email in the description:**
> Looks like an email address in the description. There's already a way to reach you on every post, so take it out of the description.

**Rejection, disallowed link in a new post:**
> Take the link out of the description. Use the WhatsApp button on your post instead.

**Rejection, too many recent posts:**
> That is a lot of posts recently. Give it a day, or take one down before adding another.

**Rejection, looks like a repeat post:**
> This looks like a repeat of a post you already have live. Renew that one instead of posting again.

**Rejection, lapsed subscription / not entitled:**
> This kind of post needs an active subscription. Get in touch if you think this is wrong.

**Held (not rejected), payment details found:**
> This post mentions payment or banking details, so it is waiting to be checked before it appears.
(same wording for a comment, adjusted to "This comment mentions...")

**Held, suspected scam wording / health-income claim:**
> This post is waiting to be checked before it appears.

## How entitlement is enforced at the data layer, and how I tested it can't be bypassed

Every `board_*` table in this project has always relied on the app's own service-role connection for reads and writes — that connection bypasses row-level security entirely, by design, everywhere else in the Board. Job 2 specifically asks for a real database rule here, so this is a deliberate, narrow exception: **only** the insert of a money-attached post (for sale, offer, special) now goes through the posting member's own signed-in session instead of that service-role connection, and a real Postgres policy checks it — `growth_clients.status = 'active'` for whoever the post claims to be from, verified against Postgres's own membership table, not trusted from the request.

I proved this against the real production database, not a mock: created a disposable test business and a real signed-in session for it, then

1. attempted a `for_sale` post while the test business was `paused` — **rejected by Postgres** (`new row violates row-level security policy`), before my own app-level check even had a say
2. flipped the same business to `active` and repeated the exact same insert — **succeeded**
3. attempted to post using the same session but claiming to be a *different* business — **rejected by Postgres**, so a signed-in member can't post as, or on behalf of, anyone else either
4. separately confirmed the `for_sale`-needs-a-photo constraint fires even through the raw admin connection, which bypasses everything except the check constraint itself

All test data was deleted immediately after (the business, the membership, the auth user, the one post that was allowed to succeed).

## What happens to posts already on the Board that wouldn't pass the new rules

Nothing. The new required-field rules are `not valid` constraints — they bind every future insert or update, and are never checked against a row that already exists. An old for-sale post with no photo stays exactly as visible as it was, and can still be renewed with one tap without being forced through the new checks. Nothing was hidden, backfilled, or force-edited.

## Found and deliberately not fixed, and why

- **No post-editing feature exists anywhere in the codebase**, and I didn't build one. "A post can't be silently edited once it has comments" (Job 6, acceptance criterion 12) is satisfied trivially and permanently by there being no edit path at all. Building one (a new action, new UI, an admin view into pre-edit content) is real extra surface area for a capability nobody's asked to use yet — say the word if you actually want members to fix a typo on a live post, and I'll build the edit-lock properly rather than leaving this as a side effect.
- **No automated "tone/aggression" detector.** Regex-based tone detection is low-precision — it either misses real hostility or flags an ordinary complaint — and the brief itself frames tone as something a human judges via the report button, which already exists and already works.
- **Two things from Job 4's own list are not in the toggle table on purpose**: required fields (Job 1) and posting a kind you're not entitled to (Job 2, "not negotiable"). Making either switchable would let an admin accidentally turn off the two things this whole handoff exists to build. Say so if you want them switchable too — it's a one-line change.
- **Member-side dashboard doesn't show held posts** (only published/hidden) — a held comment on a member's own post already showed up there before this work; a held *post* doesn't. Small inconsistency, not required by any acceptance criterion, left alone rather than expanding scope.

## Anything in the brief that turned out different from how the code actually works

- **There was only one live post-creation path, not two.** `publishBoardPost` in the dashboard and its Zod schema (`boardPostSchema`) looked like a second entry point but were dead code — nothing imported them. The dashboard composer already posted through the same action the public one uses. Deleted both rather than maintaining two copies of the same validation.
- **"Looking for" can never actually be a business post** (`businessByDefault: false` predates this work), so the 14-day expiry default I picked for it never actually applies — it always falls under the existing flat 10-day public-post rule instead. Not a bug, just means that row in my expiry table is aspirational rather than load-bearing.
- **The banned-list notice would have never been shown to a public visitor** in my first pass — it only rendered on the kind-picker screen, which is skipped entirely when there's only one kind to choose from (which is every public visitor's case, since they only ever see "Looking for"). Caught this live in the browser while testing, not in review — fixed by showing it on the single-kind screen too.
- **The Members' Room** ("same engine and same split as the members' room moderation" in the original Board handoff) doesn't exist anywhere in this codebase — there's a handoff document for it, but it was never built. So this Board's rule engine is the first concrete version of that "auto-enforce countable, hold judgement" split, not a reuse of an existing one.

## Nothing under Out of Scope changed

`NEXT_PUBLIC_BOARD_LIVE` is still `false`. No jobs section. No verified-badge work. The moderation queue was extended, not rebuilt. No payment handling anywhere. No retention-period changes. The WhatsApp inbox, Members' Room, Growth and KatisoBiz proper are untouched.
