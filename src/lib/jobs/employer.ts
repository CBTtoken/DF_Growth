import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveEmployerEntitlement, type EmployerEntitlement, type JobsPlan } from "@/lib/jobs/entitlements";

// The Jobs counterpart to lib/bizup/account.ts's getMyBizUpAccount: what
// does this login actually own? Routing and gating decisions are made from
// real rows, never a cookie.

export interface JobsEmployerSummary {
  id: string;
  businessName: string;
  phone: string | null;
  email: string;
  plan: JobsPlan;
  planLapsedAt: string | null;
  entitlement: EmployerEntitlement;
}

const EMPLOYER_COLUMNS =
  "id, owner_user_id, business_name, phone, email, plan, plan_lapsed_at, free_post_used_at";

export async function getMyJobsEmployer(): Promise<JobsEmployerSummary | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("jobs_employers")
    .select(EMPLOYER_COLUMNS)
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (!row) return null;

  const entitlement = await resolveEmployerEntitlement(row);

  return {
    id: row.id,
    businessName: row.business_name,
    phone: row.phone,
    email: row.email,
    plan: row.plan,
    planLapsedAt: row.plan_lapsed_at,
    entitlement,
  };
}

/**
 * Cheap boolean for routing (login redirect), mirroring hasBizUpAccount.
 */
export async function hasJobsEmployer(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin.from("jobs_employers").select("id").eq("owner_user_id", userId).limit(1);
  return (data ?? []).length > 0;
}
