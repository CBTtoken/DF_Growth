-- Rate & Review Sprint 2 (docs/GROWTH_RATE_REVIEW_BUILD_SPEC_CLAUDE.md Sec 8).
--
-- Sprint 1's `status` check constraint already listed 'flagged' as a value,
-- but using it as a real status transition would conflict with Sec 3's own
-- stated design: "flag (don't auto-block)... businesses can never delete a
-- review... a human makes the actual removal call, not the business
-- itself." If flagging a review flipped its status away from 'published',
-- the RLS policy `status = 'published'` would hide it from public view
-- immediately — a business could de facto unpublish any review just by
-- flagging it with a reason, which is exactly the unilateral removal power
-- Sec 2 says they must never have. So flagging is modeled as state
-- orthogonal to publication status instead: these new columns, not a status
-- transition. A review stays visible while flagged; only an admin's
-- "remove" decision (status -> 'removed') actually hides it. The unused
-- 'flagged' status value is left in the existing check constraint rather
-- than migrating it away — harmless, nothing ever sets it now.
alter table public.reviews add column flagged_by text check (flagged_by in ('business', 'system'));
alter table public.reviews add column flagged_at timestamptz;

-- Sec 4: "Store a hashed fraud-signal fingerprint, not raw IP addresses in
-- plain form." Sha256 of the submitting request's IP, computed server-side
-- at submission (src/lib/reviews/fraud-signals.ts) — never the raw address.
-- Used for the "clear device/session fingerprint" shared-identity signal
-- from Sec 3: this project has no client-side device fingerprinting, so the
-- honest, buildable version of that signal is "the same network submitted
-- another review for this same business already," not a fabricated
-- browser-fingerprint check against data this codebase doesn't collect.
alter table public.reviews add column ip_fingerprint text;
