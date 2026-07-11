import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";

// Sprint 1, Build Item 5. Triggered daily by
// .github/workflows/onboarding-nudge.yml — same CRON_SECRET-gated pattern
// as trial-reminders. Finds any account created 3-4 days ago that either
// hasn't published a live page yet, or published with a clearly thin
// profile (no business description, or zero photos), and hasn't already
// been nudged. WhatsApp explicitly out of scope this sprint (confirmed
// 2026-07-11) — email only, via the same Resend helper used elsewhere.
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const now = new Date();
  const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  const { data: candidates } = await admin
    .from("growth_clients")
    .select("id, business_name, contact_email, business_description")
    .in("status", ["pending_intake", "active"])
    .is("onboarding_nudge_sent_at", null)
    .gte("created_at", fourDaysAgo.toISOString())
    .lte("created_at", threeDaysAgo.toISOString());

  let nudgesSent = 0;

  for (const client of candidates ?? []) {
    if (!client.contact_email) continue;

    const { data: landingPage } = await admin
      .from("landing_pages")
      .select("published")
      .eq("growth_client_id", client.id)
      .maybeSingle();

    const { count: photoCount } = await admin
      .from("client_photos")
      .select("id", { count: "exact", head: true })
      .eq("growth_client_id", client.id);

    const notPublished = !landingPage?.published;
    const thinProfile = !client.business_description || (photoCount ?? 0) === 0;

    if (!notPublished && !thinProfile) continue;

    const result = await sendEmail({
      to: client.contact_email,
      subject: "Finish setting up your DigitalFlyer page",
      html: `
        <p>Hi ${client.business_name},</p>
        <p>You're a few steps away from a page that's ready to bring in real customers.</p>
        <p><a href="${siteUrl}/onboard">Pick up right where you left off</a></p>
      `,
    });

    if (result.ok) {
      await admin
        .from("growth_clients")
        .update({ onboarding_nudge_sent_at: now.toISOString() })
        .eq("id", client.id);
      nudgesSent++;
    } else {
      console.error("Onboarding nudge email failed", client.id, result.error);
    }
  }

  return NextResponse.json({ nudgesSent });
}
