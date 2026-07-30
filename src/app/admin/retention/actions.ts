"use server";

import { revalidatePath } from "next/cache";
import { requireAdminEmail } from "@/lib/auth/require-admin";
import { applyRetention } from "@/lib/retention/policy";

// Deletion is always a button somebody presses, never a timer.
//
// The scheduled job reports what is due and stops there. This is the only
// code in the system that removes member or public data on retention
// grounds, it is behind the admin allowlist, and every run is written to
// retention_runs whether it deleted anything or not.

export async function runGrowthRetention(): Promise<void> {
  const admin = await requireAdminEmail();
  if ("error" in admin) return;

  await applyRetention("growth_clients", `admin:${admin.email}`);
  revalidatePath("/admin/retention");
}

export async function runIdentityRetention(): Promise<void> {
  const admin = await requireAdminEmail();
  if ("error" in admin) return;

  await applyRetention("public_identities", `admin:${admin.email}`);
  revalidatePath("/admin/retention");
}
