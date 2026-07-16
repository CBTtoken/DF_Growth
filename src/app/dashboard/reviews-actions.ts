"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireGrowthClientId } from "@/lib/auth/require-growth-client";

// Rate & Review Sprint 2, Sec 6: "one public reply per review, editable
// after posting." Scoped to the caller's own business via the
// `.eq("business_id", client.id)` below rather than a separate ownership
// lookup — if reviewId doesn't belong to this business, the update simply
// matches zero rows, the same safe-no-op pattern used elsewhere in this
// codebase (see AccountSection's plan-scoped writes).
export async function replyToReview(reviewId: string, formData: FormData) {
  const client = await requireGrowthClientId();
  if (client.error) return;

  const replyText = String(formData.get("replyText") ?? "").trim();
  if (!replyText) return;

  const admin = createAdminClient();
  await admin
    .from("reviews")
    .update({ business_reply: replyText, business_reply_at: new Date().toISOString() })
    .eq("id", reviewId)
    .eq("business_id", client.id);

  revalidatePath("/dashboard");
}

// Sec 2/6: "Businesses can never delete or edit a review. They can flag one
// for admin review... a human at DigitalFlyer makes the actual removal
// call." This only ever sets the flag, never touches `status` — see the
// migration comment on why flagging must stay orthogonal to publication.
// `.is("flagged_by", null)` guards against a business re-flagging (with a
// different reason) something already in the admin queue — the first flag
// stands until an admin resolves it.
export async function flagReviewAsBusiness(reviewId: string, formData: FormData) {
  const client = await requireGrowthClientId();
  if (client.error) return;

  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return;

  const admin = createAdminClient();
  await admin
    .from("reviews")
    .update({ flagged_by: "business", flagged_reason: reason, flagged_at: new Date().toISOString() })
    .eq("id", reviewId)
    .eq("business_id", client.id)
    .is("flagged_by", null);

  revalidatePath("/dashboard");
}
