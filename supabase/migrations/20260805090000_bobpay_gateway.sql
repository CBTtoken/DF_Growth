-- Shop Sprint 2: Bob Pay joins Paystack as a member gateway
-- (docs/Handoff_Growth_Shop_and_Payments.md Sec 2.1-2.3).
--
-- Credentials live where the Paystack key already lives: encrypted at the
-- application layer in growth_client_secrets, never readable by a client
-- policy. last4 columns exist so the dashboard can say "key ending 4081"
-- without ever holding the key itself.
alter table growth_client_secrets
  add column if not exists bobpay_api_key_encrypted text,
  add column if not exists bobpay_account_code text,
  add column if not exists bobpay_key_last4 text,
  add column if not exists bobpay_sandbox boolean not null default true,
  add column if not exists bobpay_connected_at timestamptz,
  add column if not exists paystack_key_last4 text,
  add column if not exists paystack_connected_at timestamptz;

-- Which gateway an order actually ran on, and Bob Pay's own id for the
-- payment record (their refund endpoint wants that id, not a reference).
alter table shop_orders
  add column if not exists gateway text,
  add column if not exists bobpay_payment_id bigint;
