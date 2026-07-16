"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminEmail } from "@/lib/auth/require-admin";

// Rate & Review Sprint 2, Sec 3: "keep, remove, or dismiss the flag."
// Flagging never touched publication status (see the Sprint 2 migration
// comment), so "keep" and "dismiss the flag" resolve to the exact same
// state change — the review was visible the whole time either way, this
// just clears the flag so it drops off the queue. Two admin actions, not
// three, because a third button doing the same thing as a second would be
// UI for its own sake.
export async function clearReviewFlag(reviewId: string) {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) return;

  const admin = createAdminClient();
  await admin
    .from("reviews")
    .update({ flagged_by: null, flagged_reason: null, flagged_at: null })
    .eq("id", reviewId);

  revalidatePath("/admin/reviews");
}

// The one action that actually hides a review (status -> 'removed', which
// every public/dashboard query already excludes) — reserved for a human
// admin decision per Sec 2, never automatic.
export async function removeReview(reviewId: string) {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) return;

  const admin = createAdminClient();
  await admin
    .from("reviews")
    .update({ status: "removed", flagged_by: null, flagged_reason: null, flagged_at: null })
    .eq("id", reviewId);

  revalidatePath("/admin/reviews");
}
