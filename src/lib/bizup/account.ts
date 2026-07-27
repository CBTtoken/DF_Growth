import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// The BizUp counterpart to lib/agents/dashboard-role.ts's getMyAgentRecord
// and hasBusinessMembership: what does this login actually own? Routing
// decisions are made from real ownership, never from a cookie or a stored
// "signed up via" flag, so these are the functions that answer it.

export interface BizUpAccountSummary {
  id: string;
  businessName: string;
  vatNumber: string | null;
  plan: "free" | "paid" | "unlimited";
  planSource: "self_paid" | "bundled_foundation" | "bundled_growth_engine" | "bundled_enterprise";
  growthClientId: string | null;
  /** BizUp/docs/bizup-phase1-spec.md Sec 15.1: setup is incomplete until banking details exist. */
  hasBankDetails: boolean;
}

/**
 * The BizUp account behind the current login, or null.
 *
 * One indexed lookup on the unique owner_user_id, the same
 * cheap-for-everyone cost getMyAgentRecord already carries on every
 * dashboard render.
 */
export async function getMyBizUpAccount(): Promise<BizUpAccountSummary | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: account } = await admin
    .from("bizup_accounts")
    .select("id, business_name, vat_number, plan, plan_source, growth_client_id")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (!account) return null;

  // Deliberately selects only account_id, never account_number_encrypted.
  // Sec 8: the encrypted number is decrypted in exactly one place, the PDF
  // render path, and no other code path should be able to reach it by
  // accident because it happened to select *.
  const { data: bank } = await admin
    .from("bizup_bank_details")
    .select("account_id")
    .eq("account_id", account.id)
    .maybeSingle();

  return {
    id: account.id,
    businessName: account.business_name,
    vatNumber: account.vat_number,
    plan: account.plan,
    planSource: account.plan_source,
    growthClientId: account.growth_client_id,
    hasBankDetails: !!bank,
  };
}

/**
 * Does this login own a BizUp account? Kept separate from
 * getMyBizUpAccount so routing can answer "which products does this person
 * have" without loading a profile it is not going to render, mirroring how
 * hasBusinessMembership sits next to listMyGrowthClients.
 */
export async function hasBizUpAccount(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("bizup_accounts")
    .select("id")
    .eq("owner_user_id", userId)
    .limit(1);
  return (data ?? []).length > 0;
}
