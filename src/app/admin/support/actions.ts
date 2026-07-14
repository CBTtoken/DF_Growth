"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminEmail } from "@/lib/auth/require-admin";

// Public Beta Polish Sprint Sec 5: the admin Support tab's own mark-read
// action — a plain toggle, no state machine needed for a pilot-scale inbox.
export async function markInquiryRead(inquiryId: string, read: boolean) {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) return;

  const admin = createAdminClient();
  await admin.from("homepage_inquiries").update({ read }).eq("id", inquiryId);
  revalidatePath("/admin/support");
}
