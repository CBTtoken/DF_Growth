"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminEmail } from "@/lib/auth/require-admin";

// Admin actions on a KatisoBiz member. Every one of these re-checks the
// allowlist itself rather than trusting that the page did: a Server Action
// is a public endpoint, and the page's own guard does nothing to protect
// it.

/**
 * Puts a member on a paid plan without them paying, until a date.
 *
 * Expiring by design. A plan granted with no end date is a plan nobody
 * remembers to take away, so the daily cron reverts it and the free tier
 * reasserts itself on its own.
 */
export async function grantBizUpPlan(formData: FormData): Promise<void> {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) return;

  const accountId = String(formData.get("accountId") ?? "");
  const plan = String(formData.get("plan") ?? "");
  const until = String(formData.get("until") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!accountId || !["free", "paid", "unlimited"].includes(plan)) return;

  const admin = createAdminClient();

  const { data: before } = await admin
    .from("bizup_accounts")
    .select("plan, plan_source")
    .eq("id", accountId)
    .maybeSingle();

  // Moving someone back to free clears the grant rather than leaving a
  // stale end date on an account that is no longer granted anything.
  const isRevoke = plan === "free";

  await admin
    .from("bizup_accounts")
    .update({
      plan,
      // plan_source records how they got here, and a comp is not a sale.
      // Keeping it distinct matters because the admin revenue figure counts
      // only self_paid, so a granted plan must never look like income.
      plan_source: isRevoke ? "self_paid" : "granted",
      plan_granted_until: isRevoke || !until ? null : until,
      plan_granted_reason: isRevoke ? null : reason || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", accountId);

  await admin.from("bizup_audit_log").insert({
    account_id: accountId,
    action: isRevoke ? "plan_grant_revoked" : "plan_granted",
    from_status: before?.plan ?? null,
    to_status: plan,
    reason: `${admin_.email}: ${reason || "no reason given"}${until && !isRevoke ? `, until ${until}` : ""}`,
  });

  revalidatePath("/admin/bizup");
}
