-- Handoff 02 B: one setting, phrased as hiding rather than showing.
--
-- "Hide my call button and use WhatsApp only." Default false, meaning both
-- buttons render. That default is deliberate and is the whole reason the
-- setting is phrased as a negative: most members will never open this setting
-- at all, and if the default were WhatsApp-only, most pages would ship without
-- a call button. Phrasing it as "show a call button" with a default of off
-- would have quietly cost every member their phone calls.
alter table public.growth_clients
  add column if not exists hide_call_button boolean not null default false;

comment on column public.growth_clients.hide_call_button is
  'Member has chosen to show WhatsApp only on their public page. Default false: both buttons render. Never hides the number as selectable text, only the tel: button.';
