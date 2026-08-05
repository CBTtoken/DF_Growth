import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";

// Handoff Sec 6: "not optional and it is half the value of the build." A
// spotlight the member never sees is a post to ~780 people; a spotlight
// they share is the whole point. Only new_member and spotlight posts
// notify, board_highlight posts are the member's own Board post being
// reshared (they already know it exists) and evergreen carries no member.
//
// WhatsApp was considered and deliberately left out of v1: a business-
// initiated WhatsApp message outside a customer's own 24-hour session
// window needs a Meta-approved message template, not the free-form
// sendWhatsAppText already in this codebase (the same constraint the
// WhatsApp Switchboard build hit and resolved with a paid utility
// template). Building that template is real work on its own and the
// handoff only requires "in-app notification at minimum" — this ships
// that plus email, which does not have the template restriction, and
// leaves WhatsApp as a named follow-up rather than a broken v1 attempt.
export async function notifySpotlightPublished(queueId: string): Promise<void> {
  const admin = createAdminClient();

  // Claim before send, same reasoning as KatisoBiz's document-opened
  // notification: two concurrent publish attempts must not double-email.
  const { data: claimed } = await admin
    .from("page_poster_queue")
    .update({ member_notified_at: new Date().toISOString() })
    .eq("id", queueId)
    .is("member_notified_at", null)
    .select("id, post_type, growth_client_id, link_url, meta_post_id")
    .maybeSingle();

  if (!claimed || !claimed.growth_client_id) return;
  if (claimed.post_type !== "new_member" && claimed.post_type !== "spotlight") return;

  const { data: client } = await admin
    .from("growth_clients")
    .select("business_name, contact_email")
    .eq("id", claimed.growth_client_id)
    .maybeSingle();

  if (!client?.contact_email) return;

  const label = claimed.post_type === "new_member" ? "welcome post" : "spotlight";
  // Graph API returns post ids as "{pageId}_{postId}", and facebook.com/{that}
  // resolves straight to the post's own permalink, so this needs no vanity
  // page URL on file to be exact.
  const postLink = claimed.meta_post_id ? `https://www.facebook.com/${claimed.meta_post_id}` : null;

  await sendEmail({
    to: client.contact_email,
    subject: `Your ${label} is live on the DigitalFlyer SA Facebook page`,
    html: `
      <p>Good day ${client.business_name},</p>
      <p>We just posted about you on the DigitalFlyer SA Facebook page. It reaches our own followers, but it goes a lot further if you share it from your own page too, that is where most of the real reach comes from.</p>
      ${postLink ? `<p><a href="${postLink}">Find the post and share it</a></p>` : ""}
      <p>Thank you for being part of DigitalFlyer.</p>
    `,
    fromName: "DigitalFlyer SA",
  });

  // The dashboard banner (DashboardSpotlightBanner) reads member_notified_at
  // being set and member_dismissed_at being null off this same row, so no
  // separate notifications table is needed for the in-app half.
}
