-- SVC Sprint 3: the one column the package builder needs that Sprint 1
-- did not model. Safe to re-run; no seed data.

-- The assumed redemption rate for a per_redemption benefit, used by the
-- package builder's variable-cost line until the ledger has enough data
-- to observe the real rate (handoff 7.2: "defaulting to the observed rate
-- from the ledger once data exists and a manual figure before that,
-- labelled so it is obvious which is in use"). Fraction between 0 and 1.
alter table svc.benefit
  add column if not exists assumed_redemption_rate numeric(5, 4)
  check (assumed_redemption_rate is null or (assumed_redemption_rate >= 0 and assumed_redemption_rate <= 1));

comment on column svc.benefit.assumed_redemption_rate is
  'Manual assumption for the package builder''s variable cost line, used until the ledger can observe the real redemption rate. 0.35 means 35 percent of issued coupons get redeemed.';
