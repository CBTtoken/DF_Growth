import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";

// Triggered daily by .github/workflows/trial-reminders.yml. Paystack has no
// native trial-reminder feature (its start_date parameter only delays the
// first charge — see src/app/api/trial/convert), so this is the one piece
// of the trial flow that genuinely needs a scheduled job. Two passes, each
// looked up fresh so one client's failure in the first pass can't skip the
// second:
//   1. Day-5 heads-up — 2 days before trial_ends_at, sent once.
//   2. Trial actually ended with no payment — pauses the account and sends
//      the "pay now to reactivate" email.
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const now = new Date();
  const in2Days = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

  let remindersSent = 0;
  let trialsEnded = 0;

  // Pass 1: day-5 heads-up.
  const { data: upcoming } = await admin
    .from("growth_clients")
    .select("id, business_name, contact_email, trial_ends_at")
    .eq("plan", "foundation")
    .eq("status", "active")
    .is("trial_reminder_sent_at", null)
    .not("trial_ends_at", "is", null)
    .lte("trial_ends_at", in2Days.toISOString())
    .gt("trial_ends_at", now.toISOString());

  for (const client of upcoming ?? []) {
    if (!client.contact_email) continue;

    const convertUrl = `${siteUrl}/api/trial/convert?client=${client.id}`;
    const result = await sendEmail({
      to: client.contact_email,
      subject: "Your free trial ends in 2 days",
      html: `
        <p>Hi ${client.business_name},</p>
        <p>Your DigitalFlyer Growth free trial ends on ${new Date(client.trial_ends_at).toLocaleDateString("en-ZA")}.</p>
        <p>To keep your page live with no interruption, add payment now — it's R100/month after the trial:</p>
        <p><a href="${convertUrl}">Add payment</a></p>
        <p>If you don't add payment, your page will be paused until you do — nothing is lost, you can reactivate any time.</p>
      `,
    });

    if (result.ok) {
      await admin
        .from("growth_clients")
        .update({ trial_reminder_sent_at: now.toISOString() })
        .eq("id", client.id);
      remindersSent++;
    } else {
      console.error("Trial reminder email failed", client.id, result.error);
    }
  }

  // Pass 2: trial actually over, never converted — pause and notify.
  const { data: expired } = await admin
    .from("growth_clients")
    .select("id, business_name, contact_email")
    .eq("plan", "foundation")
    .eq("status", "active")
    .is("paystack_reference", null)
    .not("trial_ends_at", "is", null)
    .lte("trial_ends_at", now.toISOString());

  for (const client of expired ?? []) {
    const { error } = await admin.from("growth_clients").update({ status: "paused" }).eq("id", client.id);
    if (error) {
      console.error("Failed to pause expired trial", client.id, error);
      continue;
    }
    trialsEnded++;

    if (!client.contact_email) continue;

    const convertUrl = `${siteUrl}/api/trial/convert?client=${client.id}`;
    const result = await sendEmail({
      to: client.contact_email,
      subject: "Your free trial has ended",
      html: `
        <p>Hi ${client.business_name},</p>
        <p>Your DigitalFlyer Growth free trial has ended, so your page is paused for now.</p>
        <p>Add payment any time to reactivate it immediately — R100/month, no long-term contract:</p>
        <p><a href="${convertUrl}">Reactivate my page</a></p>
      `,
    });
    if (!result.ok) {
      console.error("Trial-ended email failed", client.id, result.error);
    }
  }

  return NextResponse.json({ remindersSent, trialsEnded });
}
