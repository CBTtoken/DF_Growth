"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireGrowthClientId } from "@/lib/auth/require-growth-client";

// Handoff Sec 6: the in-app half of the notification requirement. A member
// dismisses their own spotlight banner once they've seen it (and, ideally,
// shared it) — scoped hard to the caller's own growth_client_id, same
// pattern as every other member-write action in this app, since there is
// no RLS update policy on page_poster_queue for members to lean on.
export async function dismissSpotlightBanner(queueId: string) {
  const client = await requireGrowthClientId();
  if (client.error || !client.id) return;

  const admin = createAdminClient();
  await admin
    .from("page_poster_queue")
    .update({ member_dismissed_at: new Date().toISOString() })
    .eq("id", queueId)
    .eq("growth_client_id", client.id);

  revalidatePath("/dashboard");
}
