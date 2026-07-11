-- Real client photos for use in landing page templates (starting with
-- Left-Split's media showcase), separate from the single client-logos
-- upload. A client can have several; position keeps upload order stable
-- so "the first photo" (used as the primary hero image) is predictable
-- rather than whatever order storage happens to list files in.
create table public.client_photos (
  id uuid primary key default gen_random_uuid(),
  growth_client_id uuid not null references public.growth_clients (id) on delete cascade,
  storage_path text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index client_photos_growth_client_id_idx on public.client_photos (growth_client_id);

alter table public.client_photos enable row level security;

create policy "members read own client photos"
on public.client_photos for select
using (
  exists (
    select 1 from public.growth_members
    where growth_members.growth_client_id = client_photos.growth_client_id
    and growth_members.user_id = auth.uid()
  )
);

create policy "members write own client photos"
on public.client_photos for insert
with check (
  exists (
    select 1 from public.growth_members
    where growth_members.growth_client_id = client_photos.growth_client_id
    and growth_members.user_id = auth.uid()
  )
);

create policy "members delete own client photos"
on public.client_photos for delete
using (
  exists (
    select 1 from public.growth_members
    where growth_members.growth_client_id = client_photos.growth_client_id
    and growth_members.user_id = auth.uid()
  )
);
