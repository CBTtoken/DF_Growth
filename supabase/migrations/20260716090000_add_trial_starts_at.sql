-- Legacy Reactivation Sprint 1, Section 5: trial_starts_at is set only at
-- the moment a business's invitation email actually sends (Sprint 2), kept
-- deliberately separate from created_at (bulk-creation time, which can be
-- days or weeks earlier for this batch) and from trial_ends_at (the
-- existing field every trial-expiry cron query already reads, confirmed
-- via a full read of both cron jobs — neither ever references created_at,
-- so no cron logic needed to change; they already stay correctly silent on
-- any row with a null trial_ends_at, which every reactivation account has
-- until its real invite sends).
alter table public.growth_clients add column trial_starts_at timestamptz;
