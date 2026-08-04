-- The R450 done-for-you offer, 4 August 2026: a member can ask DigitalFlyer
-- to build their page for them. This records when they asked; null means
-- they did not. Payment is arranged on contact in this version, so nothing
-- financial hangs off this column.
alter table growth_clients
  add column if not exists setup_service_requested_at timestamptz;
