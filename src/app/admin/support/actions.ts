"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminEmail } from "@/lib/auth/require-admin";
import { sendSupportReplyEmail } from "@/lib/email/support-reply";

// Public Beta Polish Sprint Sec 5: the admin Support tab's own mark-read
// action — a plain toggle, no state machine needed for a pilot-scale inbox.
export async function markInquiryRead(inquiryId: string, read: boolean) {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) return;

  const admin = createAdminClient();
  await admin.from("homepage_inquiries").update({ read }).eq("id", inquiryId);
  revalidatePath("/admin/support");
}

// Archiving is how an enquiry leaves the open list once it has been dealt
// with. It also marks the enquiry read: something filed away must not keep
// counting towards the unread badge on the admin home page.
//
// Un-archiving deliberately does not un-read it. Pulling something back out
// of the archive means looking at it again, not pretending it was never
// seen.
export async function setInquiryArchived(inquiryId: string, archived: boolean) {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) return;

  const admin = createAdminClient();
  await admin
    .from("homepage_inquiries")
    .update(archived ? { archived_at: new Date().toISOString(), read: true } : { archived_at: null })
    .eq("id", inquiryId);
  revalidatePath("/admin/support");
  revalidatePath("/admin");
}

// Permanent, and meant to be: this is the spam button. Anything worth
// keeping a record of should be archived instead, which is why the two
// actions are not the same button with a different label. Replies cascade
// with the row (see the migration).
export async function deleteInquiry(inquiryId: string) {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) return;

  const admin = createAdminClient();
  await admin.from("homepage_inquiries").delete().eq("id", inquiryId);
  revalidatePath("/admin/support");
  revalidatePath("/admin");
}

export type ReplyState = { ok: boolean; message: string } | null;

// Replying from inside the inbox rather than through a mailto: link, so
// that what was said is recorded against the enquiry and the next person
// to open it can see the thread. The send has to succeed before anything
// is written down: a reply logged for an email that never left would be
// worse than no record at all.
export async function replyToInquiry(
  inquiryId: string,
  _prevState: ReplyState,
  formData: FormData
): Promise<ReplyState> {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) return { ok: false, message: "Not signed in as an admin." };

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { ok: false, message: "Type a reply first." };

  const admin = createAdminClient();
  const { data: inquiry } = await admin
    .from("homepage_inquiries")
    .select("id, name, email, message")
    .eq("id", inquiryId)
    .maybeSingle();

  if (!inquiry) return { ok: false, message: "That enquiry no longer exists." };

  const sent = await sendSupportReplyEmail({
    name: inquiry.name,
    email: inquiry.email,
    originalMessage: inquiry.message,
    body,
  });

  if (!sent.ok) {
    console.error("Support reply failed", inquiry.email, sent.error);
    return { ok: false, message: "The email did not send. Nothing was saved, so you can try again." };
  }

  await admin.from("homepage_inquiry_replies").insert({
    inquiry_id: inquiry.id,
    admin_email: admin_.email,
    body,
  });

  // A replied-to enquiry is by definition read.
  await admin
    .from("homepage_inquiries")
    .update({ replied_at: new Date().toISOString(), read: true })
    .eq("id", inquiry.id);

  revalidatePath("/admin/support");
  revalidatePath("/admin");
  return { ok: true, message: `Reply sent to ${inquiry.email}.` };
}
