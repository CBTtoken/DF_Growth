-- Table-level grants for the API roles. RLS policies (previous migration)
-- control row access; without this, anon/authenticated/service_role can't
-- touch these tables at all, regardless of RLS.

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on
  public.growth_clients,
  public.growth_client_secrets,
  public.growth_members,
  public.testimonials,
  public.generated_assets,
  public.landing_pages,
  public.capi_events,
  public.leads
to anon, authenticated, service_role;
