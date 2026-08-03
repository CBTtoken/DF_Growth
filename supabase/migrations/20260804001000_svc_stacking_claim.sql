-- The stacking claim, per handoff section 12.1 (added in the 3 August
-- revision): SVC coupons are designed to work on top of a retailer's own
-- loyalty savings, and that becomes the site's lead message ONCE the
-- coupon provider confirms it in writing per retailer (Appendix A
-- question 14). Retailer till logic can differ, so confirmation is
-- tracked per retailer, and the public page renders the strong claim
-- ("stacks on top of") or the soft claim ("designed to work alongside")
-- per retailer card rather than one blanket statement.
--
-- The flag lives on the benefit row because the retailer coupon packs are
-- the retailer-shaped rows in this schema. Flipping one to true is the
-- admin act of recording that retailer's written confirmation; the copy
-- swaps by itself on the next page load.
--
-- A separate file from the Sprint 1 schema migration on purpose: if that
-- one has already been run, re-running it would duplicate the seed rows,
-- so this must be runnable on its own. Safe in either order.

alter table svc.benefit
  add column if not exists stacking_confirmed boolean not null default false;

comment on column svc.benefit.stacking_confirmed is
  'For coupon_pack benefits: written confirmation from the coupon provider that coupons apply on top of this retailer''s own loyalty savings (handoff 12.1, Appendix A Q14). Until true, public copy uses the soft form.';
