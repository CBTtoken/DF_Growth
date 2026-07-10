-- Optional business contact phone/WhatsApp number, shown alongside contact_email
-- when a lead form's success state reveals contact details.
alter table public.growth_clients add column contact_phone text;
