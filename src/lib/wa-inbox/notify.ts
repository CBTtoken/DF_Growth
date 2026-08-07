import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/resend";

// "Dewald needs a notification when a conversation needs him. Use whatever
// notification path Growth Admin already has" (handoff section 5). Growth
// Admin's existing path is the badge on /admin plus an email to
// info@digitalflyer.co.za (same address the onboarding signup notification
// uses), so this does exactly that.
//
// Throttled per conversation: one email per hour at most, so a person
// sending five messages in a row is one email, not five. The email carries
// the name and door only, never the message text, because message content
// is the retention-controlled personal data and an email inbox is outside
// the cleanup's reach.
const ADMIN_NOTIFY_EMAIL = "info@digitalflyer.co.za";
const THROTTLE_MINUTES = 60;

export async function notifyNeedsHuman(
  admin: SupabaseClient,
  conversation: { id: string; profile_name: string | null; wa_id: string; door: string | null; notified_at: string | null }
): Promise<void> {
  if (conversation.notified_at) {
    const ageMinutes = (Date.now() - new Date(conversation.notified_at).getTime()) / 60000;
    if (ageMinutes < THROTTLE_MINUTES) return;
  }

  // Claim before send so two webhook deliveries cannot double-email.
  // PostgREST needs `is` for null equality, so the filter differs by case.
  const claimQuery = admin
    .from("wa_conversations")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", conversation.id);
  const { data: claimed } = await (conversation.notified_at
    ? claimQuery.eq("notified_at", conversation.notified_at)
    : claimQuery.is("notified_at", null)
  )
    .select("id")
    .maybeSingle();
  if (!claimed) return;

  const who = conversation.profile_name || `+${conversation.wa_id}`;
  const doorLabel =
    conversation.door === "job"
      ? "needs someone for a job"
      : conversation.door === "member"
        ? "is a member needing help"
        : conversation.door === "join"
          ? "wants to join"
          : "is waiting";

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  await sendEmail({
    to: ADMIN_NOTIFY_EMAIL,
    subject: `WhatsApp: ${who} is waiting for you`,
    html: `
      <p>Good day Dewald,</p>
      <p>${who} ${doorLabel} on WhatsApp and the automatic part is done. The rest needs you.</p>
      <p><a href="${siteUrl}/admin/whatsapp/${conversation.id}">Open the conversation</a></p>
    `,
    fromName: "DigitalFlyer Growth Admin",
  });
}
