-- A granted plan is not a sale, so it needs its own plan_source.
--
-- Without this the only options are self_paid or one of the bundled
-- values, and both are wrong for a comp: self_paid would make a free
-- account appear in the monthly recurring revenue figure on the admin
-- page, and bundled would claim a Growth subscription that does not exist.
-- Either way Dewald would be reading a revenue number that includes money
-- nobody paid.

alter table public.bizup_accounts
  drop constraint if exists bizup_accounts_plan_source_check;

alter table public.bizup_accounts
  add constraint bizup_accounts_plan_source_check
  check (
    plan_source = any (
      array[
        'self_paid'::text,
        'bundled_foundation'::text,
        'bundled_growth_engine'::text,
        'bundled_enterprise'::text,
        -- Given by an admin, free of charge, normally with an end date in
        -- plan_granted_until.
        'granted'::text
      ]
    )
  );
