"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminEmail } from "@/lib/auth/require-admin";

// List Your Event Sec 6: "routes to a manual admin review queue before it
// goes live." Publishes a pending_review event and clears any system flag
// reason that came with it — matches keep/dismiss's reasoning in
// admin/reviews/actions.ts.
export async function publishEvent(eventId: string) {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) return;

  const admin = createAdminClient();
  await admin
    .from("events")
    .update({ status: "published", flagged_by: null, flagged_reason: null, flagged_at: null })
    .eq("id", eventId);

  revalidatePath("/admin/events");
}

// For an already-published event with a public/system flag (Sec 6's
// "report this event" action, or a system-detected signal on a listing
// that was auto-published before this flag was raised) — clears the flag,
// leaves the event exactly as it was otherwise. Same reasoning as
// admin/reviews/actions.ts's clearReviewFlag: "keep" and "dismiss the
// flag" are the same outcome here, since flagging never hid the event.
export async function dismissEventFlag(eventId: string) {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) return;

  const admin = createAdminClient();
  await admin
    .from("events")
    .update({ flagged_by: null, flagged_reason: null, flagged_at: null })
    .eq("id", eventId);

  revalidatePath("/admin/events");
}

// The one action that actually hides an event — reserved for a human
// admin decision, whether it started as pending_review or was already
// live and got flagged.
export async function removeEvent(eventId: string) {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) return;

  const admin = createAdminClient();
  await admin
    .from("events")
    .update({ status: "removed", flagged_by: null, flagged_reason: null, flagged_at: null })
    .eq("id", eventId);

  revalidatePath("/admin/events");
}
