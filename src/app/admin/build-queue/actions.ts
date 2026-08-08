"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminEmail } from "@/lib/auth/require-admin";
import type { BuildOrderStatus } from "@/lib/growth-client/build-order";

type QueueState = { error?: string; success?: boolean } | null;

// Sprint "Onboarding two doors" item 1. The only thing the queue can do is
// move an order along, and only between the states that make sense: a
// delivered build is not un-delivered from here, and nothing in this file
// can touch money. Refunding or cancelling a paid order stays a deliberate
// Paystack-dashboard action, because it is not reversible from a click.
const ALLOWED: BuildOrderStatus[] = ["in_progress", "delivered"];

export async function setBuildOrderStatus(_prev: QueueState, formData: FormData): Promise<QueueState> {
  const gate = await requireAdminEmail();
  if ("error" in gate) return { error: "Not allowed." };

  const clientId = String(formData.get("clientId") ?? "");
  const status = String(formData.get("status") ?? "") as BuildOrderStatus;

  if (!clientId || !ALLOWED.includes(status)) {
    return { error: "That is not a change this page can make." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("growth_clients")
    .update({ build_order_status: status })
    .eq("id", clientId)
    // Guard rather than trust: only an order that is genuinely paid and
    // open can be moved, so a stale form cannot resurrect a cancelled one.
    .in("build_order_status", ["paid", "in_progress"]);

  if (error) {
    console.error("Failed to update build order status", error, { clientId, status });
    return { error: "Could not update that order, please try again." };
  }

  revalidatePath("/admin/build-queue");
  return { success: true };
}
