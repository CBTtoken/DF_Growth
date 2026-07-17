-- Real UAT feedback on the first live List Your Event test: ticket_info_text
-- alone ("R50 at the door") gives a paid event nowhere for a visitor to
-- actually act on it. A real clickable link, shown as a "Book now" CTA on
-- the event page when present — contact_details.name (the organiser's
-- actual name, also requested) needs no migration, it's just a new key
-- inside the existing jsonb column.
alter table public.events add column booking_url text;
