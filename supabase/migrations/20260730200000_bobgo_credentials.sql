-- Each member's own Bob Go account, connected to their own shop.
--
-- Dewald, 2026-07-30, settling the model: "we will not let members use our
-- account, they will have to get their own accounts." So DigitalFlyer never
-- books a shipment on its own account for somebody else. Every rate quote
-- and every waybill happens on the member's account, billed to them, in
-- their name, with the claim and the liability where the parcel is.
--
-- Bob Go authenticates with a bearer token issued per account, so holding
-- the member's token is exactly equivalent to acting as them. It is
-- therefore stored encrypted in growth_client_secrets, next to the Meta CAPI
-- token, rather than anywhere it might be selected by accident: nothing
-- reads this table except code that deliberately asks for it.
alter table public.growth_client_secrets
  add column if not exists bobgo_token_encrypted text;

comment on column public.growth_client_secrets.bobgo_token_encrypted is
  'The member''s own Bob Go bearer token, AES-256-GCM via lib/crypto.ts. Equivalent to their password for shipping: it books real shipments and spends real money on their account. Never log it, never return it to the browser, not even masked.';

-- The rest is not secret, so it lives with the other shop settings where
-- the dashboard can read it without touching the secrets table at all.
alter table public.growth_clients
  add column if not exists bobgo_connected_at timestamptz;

-- Sandbox is per member and defaults to on. A member connecting for the
-- first time should not discover the integration works by having a real
-- courier arrive at their door, and Bob Go provide a sandbox precisely so
-- that first attempt costs nothing.
alter table public.growth_clients
  add column if not exists bobgo_sandbox boolean not null default true;

-- What went wrong last time we called their API on this member's behalf.
-- Kept because the failure that matters happens at somebody else's
-- checkout, hours after the member last looked at their dashboard: an
-- expired token means quotes silently stop, and without this the only
-- symptom is a shop that quietly went quiet.
alter table public.growth_clients
  add column if not exists bobgo_last_error text;

alter table public.growth_clients
  add column if not exists bobgo_last_error_at timestamptz;

comment on column public.growth_clients.bobgo_connected_at is
  'When this member last successfully connected their Bob Go account, proven by a real authenticated call rather than by the token merely looking plausible. Null means not connected, and checkout falls back to their flat delivery charge.';

comment on column public.growth_clients.bobgo_sandbox is
  'Calls go to Bob Go''s sandbox couriers rather than real ones. Defaults true so a first connection cannot book a real collection by accident.';
