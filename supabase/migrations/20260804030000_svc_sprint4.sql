-- SVC Sprint 4: the draw's remaining fixtures. Safe to re-run; the only
-- inserts are settings guarded by on conflict do nothing.

-- Purchased entries are open only to members on a package of R49 or above
-- (handoff 10.1), enforced server side. The floor is a setting rather
-- than a constant, like every other tunable in this build.
insert into svc.setting (key, value) values
  ('draw_purchase_min_package_cents', '4900'),
  ('fraud_chain_weekly_threshold', '10')
on conflict (key) do nothing;

-- The prize fulfilment ledger row, linked from the draw so the trail
-- reads in both directions (handoff 10.3: prize fulfilment recorded as a
-- ledger row like any other benefit).
alter table svc.draw
  add column if not exists prize_issue_id uuid references svc.benefit_issue (id) on delete set null;

-- The freeze and the winner walk read entries in a canonical order; this
-- keeps both cheap.
create index if not exists svc_draw_entry_order_idx
  on svc.draw_entry (draw_id, created_at, id);
