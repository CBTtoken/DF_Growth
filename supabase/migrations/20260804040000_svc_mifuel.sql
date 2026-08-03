-- SVC: the coupon provider (MiFuel) member link, unblocked 4 August when
-- Herminix issued org 9419 with an API key and product 12039. Safe to
-- re-run; columns only.

-- The identity fields MiFuel's member.php requires that SVC's deliberately
-- short signup does not ask for. Collected once, at the moment a member
-- first unlocks their coupons, not at signup where every field costs
-- joins. ID numbers are personal information: this table is RLS-locked to
-- service_role like everything else in the schema, and the number is never
-- rendered back to any screen after capture.
alter table svc.member
  add column if not exists title text check (title is null or title in ('Mr', 'Mrs', 'Miss')),
  add column if not exists date_of_birth date,
  add column if not exists id_type text check (id_type is null or id_type in ('sa_id', 'passport')),
  add column if not exists id_number text,
  add column if not exists nationality text default 'South Africa';

-- MiFuel's identifiers, stored as opaque values per the no-cross-FK rule:
-- the join key between the two systems is the cell number plus these.
alter table svc.member
  add column if not exists mifuel_userid text,
  add column if not exists mifuel_productlinkid text,
  add column if not exists mifuel_provisioned_at timestamptz,
  add column if not exists mifuel_last_error text;
