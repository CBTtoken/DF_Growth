"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireGrowthClientId } from "@/lib/auth/require-growth-client";
import { reviewRequestMessage } from "@/lib/reviews/request-message";
import { toWhatsAppNumber } from "@/lib/bizup/whatsapp";

// Handoff: scripts/handoff-unified-account-and-reviews.md, Job 4.
//
// The "Grow Your Reviews" block's send button. No automatic trigger exists
// on the Growth side (a Growth member with no KatisoBiz activity has no
// completion event to fire from), so this is the manual route: the member
// names a customer, this writes the message, WhatsApp opens with it ready,
// they press send. Same posture as every other wa.me handoff in this
// codebase — nothing here ever contacts a customer on its own.
export async function sendGrowReviewRequest(formData: FormData): Promise<void> {
  const client = await requireGrowthClientId();
  if (client.error) redirect("/login");

  const customerName = String(formData.get("customerName") ?? "").trim();
  const customerNumber = String(formData.get("customerNumber") ?? "").trim();

  const admin = createAdminClient();
  const { data: growthClient } = await admin
    .from("growth_clients")
    .select("business_name, slug")
    .eq("id", client.id)
    .single();

  if (!growthClient) redirect("/dashboard");

  const reviewUrl = `https://growth.digitalflyersa.co.za/${growthClient.slug}#reviews`;

  const message = reviewRequestMessage({
    customerName: customerName || null,
    businessName: growthClient.business_name,
    reviewUrl,
    invoice: null,
  });

  const number = toWhatsAppNumber(customerNumber);
  const target = number ? `https://wa.me/${number}` : "https://wa.me/";
  redirect(`${target}?text=${encodeURIComponent(message)}`);
}
