-- Onboarding nudge upgraded from a single email to a bounded multi-touch
-- sequence (up to 3, stops on finish/unsubscribe/bounce). Needs a counter and
-- a "last sent" timestamp; the old onboarding_nudge_sent_at is kept as the
-- "first nudged at" marker for continuity.
alter table growth_clients
  add column if not exists onboarding_nudge_count integer not null default 0,
  add column if not exists onboarding_nudge_last_sent_at timestamptz;

-- Anyone already nudged once under the old single-email logic starts the new
-- sequence at count 1, timed from that send, so they are not re-nudged from
-- scratch.
update growth_clients
  set onboarding_nudge_count = 1,
      onboarding_nudge_last_sent_at = onboarding_nudge_sent_at
  where onboarding_nudge_sent_at is not null
    and onboarding_nudge_count = 0;
