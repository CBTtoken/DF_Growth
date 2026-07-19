-- Quick Sprint: Payments/Geo Sec 3.2. PostGIS is built into Supabase, no
-- new service needed. geography(POINT) stores lat/long as a real
-- geospatial type (SRID 4326, WGS84 - the standard GPS coordinate system),
-- letting Postgres compute real-world distances and use a spatial index
-- for the nearest-neighbor `<->` operator below - spec's own requirement
-- ("spatial-indexed, fast even at scale"), not a client-side distance
-- calculation that would need rewriting once the client base grows.
create extension if not exists postgis;

alter table public.growth_clients
  add column location geography(point, 4326);

-- What actually makes the `<->` operator in nearest_active_clients() below
-- fast - without this it would still return correct results, just via a
-- full table scan every call.
create index growth_clients_location_idx on public.growth_clients using gist (location);

-- Sec 3.2: "returns clients ordered by distance." Deliberately returns
-- every active client with a location, not just published ones - the
-- caller (src/app/marketplace/page.tsx) already re-joins against
-- landing_pages.published and every other Marketplace filter the same way
-- it already does for the existing "most visited" sort, so this stays a
-- single-purpose distance ranking rather than duplicating that filter
-- logic here too.
create or replace function public.nearest_active_clients(
  origin_lat double precision,
  origin_long double precision,
  result_limit integer default 200
)
returns table (id uuid, distance_meters double precision)
language sql
stable
as $$
  select
    growth_clients.id,
    st_distance(
      growth_clients.location,
      st_setsrid(st_makepoint(origin_long, origin_lat), 4326)::geography
    ) as distance_meters
  from public.growth_clients
  where growth_clients.location is not null
    and growth_clients.status = 'active'
  order by
    growth_clients.location <-> st_setsrid(st_makepoint(origin_long, origin_lat), 4326)::geography
  limit result_limit;
$$;

grant execute on function public.nearest_active_clients(double precision, double precision, integer) to anon, authenticated, service_role;
