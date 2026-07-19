import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";

// Triggered daily by .github/workflows/trial-reminders.yml. Paystack has no
// native trial-reminder feature (its start_date parameter only delays the
// first charge — see src/app/api/trial/convert), so this is the one piece
// of the trial flow that genuinely needs a scheduled job. Three passes, each
// looked up fresh so one client's failure in one pass can't skip another:
//   1. Day-5 heads-up — 2 days before trial_ends_at, sent once.
//   2. Trial actually ended with no payment — pauses the account and sends
//      the "pay now to reactivate" email.
//   3. Admin-granted free access (is_admin_comped, src/app/admin/clients/
//      [id]/actions.ts's grantAdminComp) has reached its admin_comp_until
//      date — pauses the account the same way, no email (this is a
//      Dewald-managed relationship, not a self-serve trial).
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
    .select("id, business_name, contact_email, trial_ends_at, billing_cycle")
    .eq("plan", "foundation")
    .eq("status", "active")
    .is("trial_reminder_sent_at", null)
    .not("trial_ends_at", "is", null)
    .lte("trial_ends_at", in2Days.toISOString())
    .gt("trial_ends_at", now.toISOString());

  for (const client of upcoming ?? []) {
    if (!client.contact_email) continue;

    // Foundation gained a real annual price 2026-07-19 — the account's own
    // stored billing_cycle (set at signup) decides which one to quote here.
    const priceLine = client.billing_cycle === "annual" ? "R900/year" : "R100/month";
    const convertUrl = `${siteUrl}/api/trial/convert?client=${client.id}`;
    const result = await sendEmail({
      to: client.contact_email,
      subject: "Your free trial ends in 2 days",
      html: `
        <p>Good day ${client.business_name},</p>
        <p>Your DigitalFlyer SA free trial ends on ${new Date(client.trial_ends_at).toLocaleDateString("en-ZA")}.</p>
        <p>To keep your page live with no interruption, add payment now, it's ${priceLine} after the trial:</p>
        <p><a href="${convertUrl}">Add payment</a></p>
        <p>If you don't add payment, your page will be paused until you do. Nothing is lost, you can reactivate any time.</p>
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
    .select("id, business_name, contact_email, billing_cycle")
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

    const priceLine = client.billing_cycle === "annual" ? "R900/year" : "R100/month";
    const convertUrl = `${siteUrl}/api/trial/convert?client=${client.id}`;
    const result = await sendEmail({
      to: client.contact_email,
      subject: "Your free trial has ended",
      html: `
        <p>Good day ${client.business_name},</p>
        <p>Your DigitalFlyer SA free trial has ended, so your page is paused for now.</p>
        <p>Add payment any time to reactivate it immediately, ${priceLine}, no long-term contract:</p>
        <p><a href="${convertUrl}">Reactivate my page</a></p>
      `,
    });
    if (!result.ok) {
      console.error("Trial-ended email failed", client.id, result.error);
    }
  }

  // Pass 3: admin-granted free access has reached its end date.
  const { data: compExpired } = await admin
    .from("growth_clients")
    .select("id")
    .eq("is_admin_comped", true)
    .eq("status", "active")
    .not("admin_comp_until", "is", null)
    .lte("admin_comp_until", now.toISOString());

  let adminCompsEnded = 0;
  for (const client of compExpired ?? []) {
    const { error } = await admin
      .from("growth_clients")
      .update({ status: "paused", is_admin_comped: false })
      .eq("id", client.id);
    if (error) {
      console.error("Failed to pause expired admin comp", client.id, error);
      continue;
    }
    adminCompsEnded++;
  }

  return NextResponse.json({ remindersSent, trialsEnded, adminCompsEnded });
}
