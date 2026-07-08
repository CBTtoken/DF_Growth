-- Lets a Growth Engine/Enterprise client defer Meta connection to the
-- DigitalFlyer team instead of being forced to type something into a
-- Pixel ID field they don't understand. True means "flag this client for
-- the team to set up Meta tracking for them" — surfaced in a future admin
-- worklist, not consumed by anything yet.
alter table public.growth_clients add column meta_setup_requested_help boolean not null default false;
