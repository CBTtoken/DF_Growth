import { cookies } from "next/headers";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Real limitation found once a login started owning more than one
// growth_client (Standing 365 + RE:Biz Nomads, both under
// dewald@digitalflyer.co.za): defaulting to "most recent" meant setting up a
// second page silently made the first one unreachable through a normal
// login — there was no way back to it short of a database query. This
// cookie is the switch: a Server Action (dashboard/switch-account-actions.ts)
// sets it after verifying the target growth_client_id actually belongs to
// this user, and every call here after that honors it instead of "most
// recent" — until it does, behavior is unchanged for the (still overwhelming
// majority) single-account case.
const ACTIVE_ACCOUNT_COOKIE = "active_growth_client_id";

// Shared by every authenticated Server Action (onboard wizard, dashboard):
// resolves the current user's growth_client_id via their growth_members
// row. The client arrived here via the magic link Supabase Auth sent after
// Paystack confirmed payment (webhook), not via a token this code validates
// itself.
export async function requireGrowthClientId(): Promise<
  { id: string; error?: undefined } | { id?: undefined; error: string }
> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Your session has expired, please use the link from your email again." };
  }

  const admin = createAdminClient();
  // A user can belong to more than one growth_client (growth_members is a
  // proper join table for exactly that reason) — fetch every membership,
  // not just the most recent, so the cookie override below has something to
  // validate against.
  const { data: memberships } = await admin
    .from("growth_members")
    .select("growth_client_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (!memberships || memberships.length === 0) {
    return { error: "No account found for this login." };
  }

  const cookieStore = await cookies();
  const activeCookie = cookieStore.get(ACTIVE_ACCOUNT_COOKIE)?.value;
  // Never trust the cookie value on its own — it's user-writable browser
  // state. Only honored when it matches one of this user's own real
  // memberships, otherwise silently falls back to "most recent" exactly
  // like before this existed.
  const activeMembership = activeCookie
    ? memberships.find((m) => m.growth_client_id === activeCookie)
    : null;

  return { id: (activeMembership ?? memberships[0]).growth_client_id };
}

// Every growth_client account (business name + slug) linked to the current
// login, for the dashboard's account switcher. Returns an empty array
// (never an error) for a logged-out request — the switcher simply doesn't
// render rather than needing its own error handling at every call site.
export async function listMyGrowthClients(): Promise<
  { id: string; businessName: string; slug: string }[]
> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();
  const { data: memberships } = await admin
    .from("growth_members")
    .select("growth_client_id, growth_clients(business_name, slug)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (memberships ?? [])
    .map((m) => {
      const client = m.growth_clients as unknown as { business_name: string; slug: string } | null;
      return client ? { id: m.growth_client_id, businessName: client.business_name, slug: client.slug } : null;
    })
    .filter((m): m is { id: string; businessName: string; slug: string } => m !== null);
}

export { ACTIVE_ACCOUNT_COOKIE };
