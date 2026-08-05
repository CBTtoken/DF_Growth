-- KatisoBiz Pay Now (Dewald, 5 Aug 2026): a member connects their own
-- Paystack account and their invoices' public links grow a "Pay now"
-- button. Same credential rules as the Growth shop: encrypted at the
-- application layer, last4 for display, the member's own account receives
-- the money, no platform key anywhere on the path.
alter table bizup_accounts
  add column if not exists paystack_secret_encrypted text,
  add column if not exists paystack_key_last4 text,
  add column if not exists paystack_connected_at timestamptz;
