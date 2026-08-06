import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// The KatisoBiz counterpart to lib/agents/dashboard-role.ts's getMyAgentRecord
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
  /**
   * Setup progress, for the checklist on the dashboard.
   *
   * "Business details" means more than a row existing, since signup creates
   * one from the business name alone. It means the member has been back and
   * filled in what a document actually needs: an address, which SARS
   * requires on an invoice over R5,000 and which looks wrong by its absence
   * on any document.
   */
  hasBusinessDetails: boolean;
  /** Whether anything has actually been issued yet, which is what ends onboarding. */
  hasSentDocument: boolean;
}

/**
 * The KatisoBiz account behind the current login, or null.
 *
 * One indexed lookup on the unique owner_user_id, the same
 * cheap-for-everyone cost getMyAgentRecord already carries on every
 * dashboard render.
 */
const ACCOUNT_COLUMNS = "id, business_name, vat_number, plan, plan_source, growth_client_id, address_line1, city";

export async function getMyBizUpAccount(): Promise<BizUpAccountSummary | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: direct } = await admin
    .from("bizup_accounts")
    .select(ACCOUNT_COLUMNS)
    .eq("owner_user_id", user.id)
    .maybeSingle();

  // Job 1 Phase B (scripts/handoff-unified-account-and-reviews.md): "no
  // second password." A direct owner_user_id match above always wins when
  // it exists — this is purely additive, a second path in, never a
  // repoint. Only consulted when this exact login owns no KatisoBiz
  // account of its own: does the Growth business this login belongs to
  // have one bundled/linked instead? That's what makes a Growth login see
  // its KatisoBiz account with no second password, without ever touching
  // the original KatisoBiz login (a different auth.users row, if there is
  // one) — that login keeps working exactly as it always has.
  let account = direct;
  if (!account) {
    const { data: memberships } = await admin
      .from("growth_members")
      .select("growth_client_id")
      .eq("user_id", user.id);
    const growthClientIds = (memberships ?? []).map((m) => m.growth_client_id);
    if (growthClientIds.length > 0) {
      const { data: linked } = await admin
        .from("bizup_accounts")
        .select(ACCOUNT_COLUMNS)
        .in("growth_client_id", growthClientIds)
        .limit(1);
      account = linked?.[0] ?? null;
    }
  }

  if (!account) return null;

  // Deliberately selects only account_id, never account_number_encrypted.
  // Sec 8: the encrypted number is decrypted in exactly one place, the PDF
  // render path, and no other code path should be able to reach it by
  // accident because it happened to select *.
  // Both run together: this sits on every KatisoBiz dashboard render, so two
  // sequential round trips would be felt.
  const [{ data: bank }, { count: issuedCount }] = await Promise.all([
    admin.from("bizup_bank_details").select("account_id").eq("account_id", account.id).maybeSingle(),
    admin
      .from("bizup_documents")
      .select("id", { count: "exact", head: true })
      .eq("account_id", account.id)
      .not("issued_at", "is", null),
  ]);

  return {
    hasBusinessDetails: !!account.address_line1 && !!account.city,
    hasSentDocument: (issuedCount ?? 0) > 0,
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
 * Does this login own a KatisoBiz account? Kept separate from
 * getMyBizUpAccount so routing can answer "which products does this person
 * have" without loading a profile it is not going to render, mirroring how
 * hasBusinessMembership sits next to listMyGrowthClients.
 */
export async function hasBizUpAccount(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data: direct } = await admin
    .from("bizup_accounts")
    .select("id")
    .eq("owner_user_id", userId)
    .limit(1);
  if ((direct ?? []).length > 0) return true;

  // Same additive Job 1 Phase B path as getMyBizUpAccount: no direct
  // account, but this login's Growth business might have one bundled.
  const { data: memberships } = await admin.from("growth_members").select("growth_client_id").eq("user_id", userId);
  const growthClientIds = (memberships ?? []).map((m) => m.growth_client_id);
  if (growthClientIds.length === 0) return false;

  const { data: linked } = await admin
    .from("bizup_accounts")
    .select("id")
    .in("growth_client_id", growthClientIds)
    .limit(1);
  return (linked ?? []).length > 0;
}
