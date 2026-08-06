"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminEmail } from "@/lib/auth/require-admin";

// Job 4: "every rule individually toggleable in admin, sensible defaults
// on." One row, one switch. Required fields (job 1) and posting rights
// (job 2) are not in this table on purpose -- see the comment in
// src/lib/board/moderation.ts -- so there is nothing here that can turn
// either of those off.

export async function setRuleEnabled(ruleKey: string, enabled: boolean): Promise<void> {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) return;

  const admin = createAdminClient();
  await admin
    .from("board_moderation_rules")
    .update({ enabled, updated_at: new Date().toISOString(), updated_by: admin_.email })
    .eq("rule_key", ruleKey);

  revalidatePath("/admin/board");
}

export async function toggleRuleFromForm(ruleKey: string, currentlyEnabled: boolean): Promise<void> {
  await setRuleEnabled(ruleKey, !currentlyEnabled);
}
