"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireGrowthClientId } from "@/lib/auth/require-growth-client";
import { sendBatchAssignedEmail, sendShippedEmail } from "@/lib/email/book-order";

type ActionResult = { error?: string; success?: boolean };

// STANDING365_LANDING_BUILD_SPEC_CLAUDE.md Sprint 3: "assign batch numbers,
// mark as shipped, batch notification email when assigned or reassigned."
// Both actions re-derive orderId's growth_client_id ownership from the
// UPDATE's own .eq("growth_client_id", client.id) rather than trusting
// anything the client submits — the same anti-IDOR pattern every other
// dashboard action in this file already follows.
export async function assignBatchNumber(orderId: string, batchNumber: number): Promise<ActionResult> {
  const client = await requireGrowthClientId();
  if (client.error) return { error: client.error };

  if (!Number.isInteger(batchNumber) || batchNumber < 1) {
    return { error: "Enter a valid batch number" };
  }

  const admin = createAdminClient();
  const { data: order, error } = await admin
    .from("book_orders")
    .update({ batch_number: batchNumber })
    .eq("id", orderId)
    .eq("growth_client_id", client.id)
    .select("buyer_name, email")
    .single();

  if (error || !order) return { error: "Could not save, please try again." };

  try {
    await sendBatchAssignedEmail({ buyerName: order.buyer_name, email: order.email, batchNumber });
  } catch (err) {
    console.error("Batch assigned email failed", err);
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function markOrderShipped(orderId: string): Promise<ActionResult> {
  const client = await requireGrowthClientId();
  if (client.error) return { error: client.error };

  const admin = createAdminClient();
  const { data: order, error } = await admin
    .from("book_orders")
    .update({ fulfilment_status: "shipped" })
    .eq("id", orderId)
    .eq("growth_client_id", client.id)
    .select("buyer_name, email")
    .single();

  if (error || !order) return { error: "Could not save, please try again." };

  try {
    await sendShippedEmail({ buyerName: order.buyer_name, email: order.email });
  } catch (err) {
    console.error("Shipped email failed", err);
  }

  revalidatePath("/dashboard");
  return { success: true };
}
