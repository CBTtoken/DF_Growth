import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { generateUnsubscribeToken } from "@/lib/email/unsubscribe-token";

// Sprint 1 Build Item 5, extended 2026-07-25 (Dewald's call) from a single
// email into a bounded multi-touch sequence: keep nudging an unfinished signup
// up to MAX_NUDGES times, spaced a few days apart, and stop the moment they
// finish, unsubscribe, bounce, or complain. Capped deliberately — chasing
// someone forever trips spam filters and wrecks our sending reputation (the
// same bounce-rate risk that put the suppression fields there in the first
// place). Triggered daily by .github/workflows/onboarding-nudge.yml, same
// CRON_SECRET gate as before.

const MAX_NUDGES = 3;
const FIRST_NUDGE_MIN_AGE_DAYS = 3; // wait this long after signup before nudge 1
const MIN_GAP_DAYS = 4; // minimum days between consecutive nudges

// Copy escalates gently across the three touches. No em dashes, DigitalFlyer SA
// voice, "Good day {name},". The unsubscribe line is added by the caller.
function nudgeContent(nudgeNumber: number, businessName: string, onboardUrl: string) {
  switch (nudgeNumber) {
    case 1:
      return {
        subject: "Finish setting up your DigitalFlyer SA page",
        body: `
          <p>Good day ${businessName},</p>
          <p>You're a few steps away from a page that's ready to bring in real customers.</p>
          <p><a href="${onboardUrl}">Pick up right where you left off</a></p>
        `,
      };
    case 2:
      return {
        subject: "Your DigitalFlyer SA page is almost ready",
        body: `
          <p>Good day ${businessName},</p>
          <p>Your page just needs the finishing touches. Once it's live, local customers can find you on the marketplace, see your packages, and get in touch. It only takes a few minutes.</p>
          <p><a href="${onboardUrl}">Complete your page</a></p>
        `,
      };
    default:
      return {
        subject: "Last reminder: your DigitalFlyer SA page is waiting",
        body: `
          <p>Good day ${businessName},</p>
          <p>This is our last reminder. Your page is set up but not yet live, so customers can't find you yet. It only takes a few minutes to finish.</p>
          <p><a href="${onboardUrl}">Finish your page</a></p>
          <p>We won't send any more reminders after this.</p>
        `,
      };
  }
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const now = new Date();
  const firstEligible = new Date(now.getTime() - FIRST_NUDGE_MIN_AGE_DAYS * 24 * 60 * 60 * 1000);
  const gapCutoff = new Date(now.getTime() - MIN_GAP_DAYS * 24 * 60 * 60 * 1000);

  const { data: candidates } = await admin
    .from("growth_clients")
    .select("id, business_name, contact_email, business_description, onboarding_nudge_count")
    .in("status", ["pending_intake", "active"])
    .neq("signup_channel", "legacy_reactivation")
    // Hard stop once we've sent the full sequence.
    .lt("onboarding_nudge_count", MAX_NUDGES)
    // Old enough to have earned at least the first nudge.
    .lte("created_at", firstEligible.toISOString())
    // Never email a suppressed address (retention policy: unsubscribed members
    // are never contacted again until they re-register themselves).
    .is("email_unsubscribed_at", null)
    .is("email_bounced_at", null)
    .is("email_complained_at", null)
    // Either never nudged yet, or enough days have passed since the last one.
    .or(
      `onboarding_nudge_last_sent_at.is.null,onboarding_nudge_last_sent_at.lte.${gapCutoff.toISOString()}`
    );

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

    // They've effectively finished setting up — the whole point of the nudge is
    // gone, so stop (and don't burn a send or a spam-complaint risk).
    if (!notPublished && !thinProfile) continue;

    const nudgeNumber = (client.onboarding_nudge_count ?? 0) + 1;
    const onboardUrl = `${siteUrl}/onboard`;
    const unsubscribeLink = `${siteUrl}/unsubscribe?client=${client.id}&token=${generateUnsubscribeToken(client.id)}`;
    const { subject, body } = nudgeContent(nudgeNumber, client.business_name, onboardUrl);

    const html = `${body}<p style="font-size:12px;color:#6b7280;">You're receiving this because you started registering a business with DigitalFlyer SA. If you'd rather not hear from us, <a href="${unsubscribeLink}">unsubscribe</a>.</p>`;

    const result = await sendEmail({ to: client.contact_email, subject, html });

    if (result.ok) {
      const update: {
        onboarding_nudge_count: number;
        onboarding_nudge_last_sent_at: string;
        onboarding_nudge_sent_at?: string;
      } = {
        onboarding_nudge_count: nudgeNumber,
        onboarding_nudge_last_sent_at: now.toISOString(),
      };
      // Keep the legacy column meaning "first nudged at".
      if (nudgeNumber === 1) update.onboarding_nudge_sent_at = now.toISOString();

      await admin.from("growth_clients").update(update).eq("id", client.id);
      nudgesSent++;
    } else {
      console.error("Onboarding nudge email failed", client.id, result.error);
    }
  }

  return NextResponse.json({ nudgesSent });
}
