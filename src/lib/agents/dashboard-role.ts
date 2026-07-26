import { cookies } from "next/headers";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Agent Programme Phase 1 Sec 1.1: "One login, two roles. Do not create a
// second account for the agent side. Dashboard gets a role switcher when
// the account holds both. Default to whichever role was used last."
//
// Same shape as ACTIVE_ACCOUNT_COOKIE in lib/auth/require-growth-client.ts,
// which already solves the sibling problem (one login, several businesses).
// This is the outer layer of that: which role, then which account within
// the business role.
export const ACTIVE_ROLE_COOKIE = "active_dashboard_role";

export type DashboardRole = "business" | "agent";

export async function getActiveRolePreference(): Promise<DashboardRole | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(ACTIVE_ROLE_COOKIE)?.value;
  return value === "agent" || value === "business" ? value : null;
}

// The agent record behind the current login, or null. Cheap enough to call
// on the dashboard for every login: one indexed lookup on user_id, the
// same no-op-for-most-people cost getMyAgentDashboardData already carries.
export async function getMyAgentRecord(): Promise<{
  id: string;
  fullName: string;
  pageSlug: string | null;
  pageStatus: string;
  photoPath: string | null;
} | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: agent } = await admin
    .from("agents")
    .select("id, full_name, page_slug, page_status, photo_path")
    .eq("user_id", user.id)
    .eq("status", "approved")
    .maybeSingle();

  if (!agent) return null;

  return {
    id: agent.id,
    fullName: agent.full_name,
    pageSlug: agent.page_slug,
    pageStatus: agent.page_status,
    photoPath: agent.photo_path,
  };
}

// Does this login own at least one business account? Kept separate from
// listMyGrowthClients so the dashboard can answer "should the switcher
// exist" without loading every account's name and slug.
export async function hasBusinessMembership(): Promise<boolean> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const admin = createAdminClient();
  const { data } = await admin.from("growth_members").select("growth_client_id").eq("user_id", user.id).limit(1);
  return (data ?? []).length > 0;
}
