import { sendEmail } from "@/lib/email/resend";

// Sec 10: "confirmation email, 'we've received your application.'"
export async function sendAgentApplicationReceivedEmail({
  fullName,
  email,
}: {
  fullName: string;
  email: string;
}): Promise<void> {
  const result = await sendEmail({
    to: email,
    subject: "We've received your agent application",
    html: `
      <p>Good day ${fullName},</p>
      <p>Thanks for applying to the DigitalFlyer Growth agent referral programme. We've received your application and will review it shortly.</p>
      <p>We'll be in touch by email once a decision has been made.</p>
    `,
  });

  if (!result.ok) {
    console.error("Agent application received email failed", email, result.error);
  }
}

// Sec 10: "invite email with next steps (complete your free Growth
// account, then payout setup)." Sprint 1 doesn't have the comped-account
// or payout-setup flows built yet (both Sprint 2), so this points to the
// application/apply area for now rather than a link that doesn't exist —
// updated once those routes ship.
export async function sendAgentApprovedEmail({
  fullName,
  email,
  referralCode,
}: {
  fullName: string;
  email: string;
  referralCode: string;
}): Promise<void> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const referralLink = `${siteUrl}/r/${referralCode}`;

  const result = await sendEmail({
    to: email,
    subject: "You're approved as a DigitalFlyer Growth agent",
    html: `
      <p>Good day ${fullName},</p>
      <p>Good news, your agent application has been approved.</p>
      <p>Your referral link is ready to use right away:</p>
      <p><a href="${referralLink}">${referralLink}</a></p>
      <p>Share it with your network. Anyone who signs up for Growth or Enterprise on an annual plan through your link earns you commission, 25% on your first 10 referrals, 40% from your 11th referral onward.</p>
      <p>We'll be in touch separately about setting up your own free Growth account and your payout details.</p>
    `,
  });

  if (!result.ok) {
    console.error("Agent approved email failed", email, result.error);
  }
}

// Sec 10: "polite email, no reason required in the automated message."
export async function sendAgentRejectedEmail({
  fullName,
  email,
}: {
  fullName: string;
  email: string;
}): Promise<void> {
  const result = await sendEmail({
    to: email,
    subject: "Update on your agent application",
    html: `
      <p>Good day ${fullName},</p>
      <p>Thank you for your interest in the DigitalFlyer Growth agent referral programme. After review, we won't be moving forward with your application at this time.</p>
      <p>We appreciate you taking the time to apply.</p>
    `,
  });

  if (!result.ok) {
    console.error("Agent rejected email failed", email, result.error);
  }
}
