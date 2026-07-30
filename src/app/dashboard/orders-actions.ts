"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireGrowthClientId } from "@/lib/auth/require-growth-client";
import { sendBatchAssignedEmail, sendShippedEmail, sendSentForPrintingEmail } from "@/lib/email/book-order";

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

/**
 * Marks a whole batch as gone to the printer, with the date buyers are told.
 *
 * Dewald, 31 July: "sending to [the printer], leave that as a manual task
 * for the seller, you can add a button to indicate whether it was completed
 * or not?" So this does not try to talk to a printer. The seller sends the
 * spreadsheet themselves, however they already do it, and then presses this
 * to record that it happened and to tell everybody in the run.
 *
 * Works on the batch rather than the order, which is the point of batches
 * existing: one press covers all fifty and they cannot drift apart.
 */
export async function markBatchSentForPrinting(
  batchNumber: number,
  expectedDeliveryDate: string | null
): Promise<ActionResult> {
  const client = await requireGrowthClientId();
  if (client.error || !client.id) return { error: client.error ?? "Not signed in" };

  if (!Number.isInteger(batchNumber) || batchNumber < 1) {
    return { error: "Enter a valid batch number" };
  }

  // A date is optional, but a malformed one is not: it would reach a buyer.
  if (expectedDeliveryDate && !/^\d{4}-\d{2}-\d{2}$/.test(expectedDeliveryDate)) {
    return { error: "Enter the expected delivery date as a real date" };
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  // Upsert, because a batch can exist only as a number written on orders if
  // it was created before batches were real things.
  const { error: batchError } = await admin.from("book_batches").upsert(
    {
      growth_client_id: client.id,
      number: batchNumber,
      sent_to_printer_at: now,
      expected_delivery_date: expectedDeliveryDate,
      updated_at: now,
    },
    { onConflict: "growth_client_id,number" }
  );

  if (batchError) {
    console.error("Could not mark batch sent for printing", batchError);
    return { error: "Could not save, please try again." };
  }

  // Only paid orders. Somebody who has not paid is not having a book
  // printed, and should certainly not be told one is on its way.
  const { data: orders } = await admin
    .from("book_orders")
    .select("buyer_name, email")
    .eq("growth_client_id", client.id)
    .eq("batch_number", batchNumber)
    .eq("payment_status", "paid");

  const readableDate = expectedDeliveryDate
    ? new Date(`${expectedDeliveryDate}T00:00:00Z`).toLocaleDateString("en-ZA", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })
    : null;

  for (const order of orders ?? []) {
    try {
      await sendSentForPrintingEmail({
        buyerName: order.buyer_name,
        email: order.email,
        batchNumber,
        expectedDeliveryDate: readableDate,
      });
    } catch (err) {
      // One bad address must not stop the rest of the run being told.
      console.error("Sent for printing email failed", err);
    }
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
