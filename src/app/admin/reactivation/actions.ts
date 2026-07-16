"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminEmail } from "@/lib/auth/require-admin";
import { verifyEmailAddress } from "@/lib/email/verify-address";

// Legacy Reactivation Sprint 2, Section 9 acceptance criteria: "verify
// every address before sending... report what got dropped and why." Only
// (re-)checks unchecked/invalid rows by default — a business that already
// passed doesn't need re-verifying every click, but a fixed typo in a
// dashboard-edited email should get a fresh chance.
export async function verifyReactivationAddresses(): Promise<
  { ok: true; checked: number; valid: number; invalid: number } | { ok: false; error: string }
> {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) return { ok: false, error: "Not authorized" };

  const admin = createAdminClient();
  const { data: clients } = await admin
    .from("growth_clients")
    .select("id, contact_email, email_verification_status")
    .eq("signup_channel", "legacy_reactivation")
    .neq("email_verification_status", "valid");

  let valid = 0;
  let invalid = 0;

  for (const client of clients ?? []) {
    const result = client.contact_email
      ? await verifyEmailAddress(client.contact_email)
      : { valid: false, reason: "no email on file" };

    if (result.valid) valid++;
    else invalid++;

    await admin
      .from("growth_clients")
      .update({
        email_verification_status: result.valid ? "valid" : "invalid",
        email_verification_checked_at: new Date().toISOString(),
      })
      .eq("id", client.id);
  }

  revalidatePath("/admin/reactivation");
  return { ok: true, checked: (clients ?? []).length, valid, invalid };
}
