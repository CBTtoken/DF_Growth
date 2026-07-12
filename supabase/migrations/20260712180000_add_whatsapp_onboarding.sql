-- Combined spec Sec 32: WhatsApp onboarding redirect into Growth. Every
-- WhatsApp signup writes to the same growth_clients table the web wizard
-- does (Sec 32.1 — second entry channel, not a separate product), this
-- just adds the one field that distinguishes how an account arrived and a
-- new table to hold in-progress WhatsApp conversation state, since a
-- webhook handler has no browser session to persist step progress in the
-- way the web wizard's Server Actions do.
alter table public.growth_clients
  add column signup_channel text not null default 'web'
  check (signup_channel in ('web', 'whatsapp'));

-- bsuid is Meta's Business-Scoped User ID (messages[].user_id in the
-- webhook payload) — confirmed via the Meta changelog check required
-- before this build (Sec 31) that this, not phone number, is now the
-- durable per-conversation identifier: a WhatsApp user who adopts a
-- username can have their phone number silently absent from later
-- webhooks. phone_number is still stored for display/contact purposes
-- and because it's one of the actual business-info fields Sec 32.3 step 1
-- collects, but resumability keys on bsuid.
create table public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  bsuid text not null unique,
  phone_number text,
  growth_client_id uuid references public.growth_clients(id),
  -- One of: business_info, business_profile, brand_kit, landing_copy,
  -- packages, payment, done — see lib/whatsapp/conversation.ts once built.
  current_step text not null default 'business_info',
  -- Answers collected so far for the step currently in progress and any
  -- already-completed steps not yet flushed to growth_clients (e.g. mid-
  -- way through business_profile's several questions) — jsonb rather than
  -- typed columns for the same reason growth_clients.packages is jsonb:
  -- shape varies by step and isn't queried on directly.
  step_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

alter table public.whatsapp_conversations enable row level security;
-- No policies defined — service-role only, same reasoning as
-- growth_client_secrets and capi_events (see init_schema.sql's own
-- comment): this table is never read or written by an authenticated end
-- user, only by the webhook Route Handler using the service role key.
