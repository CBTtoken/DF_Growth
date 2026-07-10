-- Optional Facebook/Instagram profile URLs, displayed on the client's public
-- landing page when set. Nullable, matches the existing optional-field
-- pattern (tagline, additional_notes).
alter table public.growth_clients add column facebook_url text;
alter table public.growth_clients add column instagram_url text;
