-- Combined spec Sec 20: a business may want a different number for phone
-- calls than for WhatsApp — the single shared contact_phone field couldn't
-- express that. Backfills both new columns from the existing value so no
-- client loses their already-entered number.
--
-- Deliberately NOT dropping contact_phone here, even though every call
-- site is being updated in this same pass to read the two new columns
-- instead: this migration's propagation to the live database has lagged
-- badly all session (Sec 7 took 20+ minutes and needed a manual apply,
-- Sec 17's is still pending as of this commit). Dropping the column would
-- break the currently-deployed code (which still reads contact_phone)
-- for however long that lag lasts, a real outage risk an add-only
-- migration doesn't have. contact_phone becomes an unused, harmless
-- leftover column instead — safe to drop in a later, calmer pass once
-- there's no propagation-lag risk to worry about.
alter table public.growth_clients add column call_phone text;
alter table public.growth_clients add column whatsapp_phone text;

update public.growth_clients
set call_phone = contact_phone, whatsapp_phone = contact_phone
where contact_phone is not null;
