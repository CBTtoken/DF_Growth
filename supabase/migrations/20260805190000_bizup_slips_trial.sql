-- A one-off slips trial for existing members, Dewald, 5 August 2026: the
-- members on the free plan at launch get the Slips surface free for one
-- month, so the feature is tested by real businesses rather than waiting
-- for upgrades. Deliberately not a plan change and not for new signups:
-- it is a date on the accounts that were here when slips shipped, and it
-- expires by itself.

alter table public.bizup_accounts
  add column if not exists slips_trial_until date;

comment on column public.bizup_accounts.slips_trial_until is
  'Slips access regardless of plan until this date, inclusive. One-off launch trial granted 2026-08-05 to the then-current free members; null for everyone else, including all future signups.';
