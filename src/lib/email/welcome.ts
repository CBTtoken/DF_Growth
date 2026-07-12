import { sendEmail } from "@/lib/email/resend";

// Sprint 1, Build Item 4: Day 0 welcome sequence, triggered the moment a
// trial or paid account finishes onboarding and the page actually goes
// live (called from the two exact points in onboard/actions.ts where that
// happens — saveStep6 for Foundation, saveStep7 for Growth/Enterprise).
// WhatsApp explicitly out of scope this sprint (confirmed 2026-07-11,
// Growth has no WhatsApp-sending infrastructure of its own yet) — email
// only, via the same Resend helper already used for trial reminders and
// lead notifications.
//
// The "5 to 10 Minute Rule" client education asset's content hasn't been
// supplied yet — WELCOME_ASSET_URL is an env var specifically so it can be
// dropped in later (Vercel env var change + redeploy) without touching
// this template's code or copy. Omitted from the email entirely while
// unset, rather than shipping a broken or placeholder-looking link.
export async function sendWelcomeEmail({
  businessName,
  contactEmail,
  slug,
}: {
  businessName: string;
  contactEmail: string | null;
  slug: string;
}): Promise<void> {
  if (!contactEmail) return;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const dashboardUrl = `${siteUrl}/dashboard`;
  const pageUrl = `${siteUrl}/g/${slug}`;
  const assetUrl = process.env.WELCOME_ASSET_URL;

  const result = await sendEmail({
    to: contactEmail,
    subject: "Your page is live!",
    html: `
      <p>Good day ${businessName},</p>
      <p>Great news, your DigitalFlyer SA page is live right now:</p>
      <p><a href="${pageUrl}">${pageUrl}</a></p>
      <p>Head to your dashboard any time to add testimonials, check your leads, and manage your page:</p>
      <p><a href="${dashboardUrl}">Go to your dashboard</a></p>
      ${
        assetUrl
          ? `<p>Before you go, take 5-10 minutes to read our quick-start guide, it'll help you get the most out of your new page:</p><p><a href="${assetUrl}">Read the 5 to 10 Minute Rule</a></p>`
          : ""
      }
    `,
  });

  if (!result.ok) {
    console.error("Welcome email failed", contactEmail, result.error);
  }
}
