import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { JOBS_ORIGIN } from "@/lib/jobs/host";

/** A note, not an essay. Long enough to say why, short enough to read on a phone. */
export const MESSAGE_MAX = 1500;

export type ApplicationMessage = {
  id: string;
  senderRole: "employer" | "candidate";
  body: string;
  createdAt: string;
};

/**
 * The thread on one application, oldest first, which is how a conversation
 * reads.
 */
export async function loadThread(applicationId: string): Promise<ApplicationMessage[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("jobs_application_messages")
    .select("id, sender_role, body, created_at")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: true })
    .limit(100);

  return (data ?? []).map((m) => ({
    id: m.id,
    senderRole: m.sender_role as "employer" | "candidate",
    body: m.body,
    createdAt: m.created_at,
  }));
}

/**
 * Mark everything the other side wrote as read, called when a thread is
 * opened. Scoped to messages from the other party: opening your own
 * outbox must not clear your own unread badge for them.
 */
export async function markThreadRead(
  applicationId: string,
  readerRole: "employer" | "candidate",
): Promise<void> {
  const admin = createAdminClient();
  const otherSide = readerRole === "employer" ? "candidate" : "employer";
  await admin
    .from("jobs_application_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("application_id", applicationId)
    .eq("sender_role", otherSide)
    .is("read_at", null);
}

/**
 * Unread counts per application for one side, so a dashboard can show
 * "2 new messages" without loading every thread.
 */
export async function unreadByApplication(
  applicationIds: string[],
  readerRole: "employer" | "candidate",
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (applicationIds.length === 0) return counts;

  const admin = createAdminClient();
  const otherSide = readerRole === "employer" ? "candidate" : "employer";
  const { data } = await admin
    .from("jobs_application_messages")
    .select("application_id")
    .in("application_id", applicationIds)
    .eq("sender_role", otherSide)
    .is("read_at", null);

  for (const row of data ?? []) {
    counts.set(row.application_id, (counts.get(row.application_id) ?? 0) + 1);
  }
  return counts;
}

function escape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Telling the other side a message is waiting.
 *
 * The message body is included: an alert that only says "you have a
 * message" is an alert that has to be clicked to mean anything, and a job
 * seeker on a metered phone should not have to spend data to find out
 * whether it mattered. The link is there for replying.
 *
 * Nothing here reveals contact details either way. The employer's number
 * is not in a seeker's email and the seeker's number is not in the
 * employer's, because the thread is the channel and it stays that way.
 *
 * Never throws: a failed alert must not fail the message, which is already
 * saved and already visible on the other side's dashboard.
 */
export async function sendMessageAlert({
  to,
  toName,
  fromName,
  vacancyTitle,
  body,
  forRole,
  applicationId,
}: {
  to: string;
  toName: string;
  fromName: string;
  vacancyTitle: string;
  body: string;
  /** Which side is receiving, so the link points at the right screen. */
  forRole: "employer" | "candidate";
  applicationId: string;
}): Promise<{ ok: boolean }> {
  if (!to) return { ok: false };

  const url =
    forRole === "employer"
      ? `${JOBS_ORIGIN}/employer/applicants/${applicationId}`
      : `${JOBS_ORIGIN}/dashboard/applications/${applicationId}`;

  try {
    const result = await sendEmail({
      to,
      subject:
        forRole === "candidate"
          ? `${fromName} sent you a message about ${vacancyTitle}`
          : `${fromName} replied about ${vacancyTitle}`,
      html: `
        <p>Good day ${escape(toName)},</p>
        <p><strong>${escape(fromName)}</strong> sent you a message about the ${escape(vacancyTitle)} position on KatisoBiz Jobs.</p>
        <blockquote style="margin:0;padding:12px 16px;border-left:3px solid #ddd;color:#444;white-space:pre-line;">${escape(body)}</blockquote>
        <p><a href="${url}">Read it and reply</a></p>
        <p style="color:#666;font-size:13px;">Replies go through KatisoBiz Jobs so both sides have a record. Applying for a job never costs money, and no real employer asks you to pay for anything.</p>
        <p>DigitalFlyer SA</p>
      `,
    });
    return { ok: result.ok };
  } catch (err) {
    console.error("Failed to send message alert", err);
    return { ok: false };
  }
}
