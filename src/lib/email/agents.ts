import { sendEmail } from "@/lib/email/resend";
import { getAgentReferralLink } from "@/lib/agents/referral-cookie";

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
// account, then payout setup)." Payout is manual (bank details handled
// directly, not through this app — confirmed 2026-07-17, not worth
// building Paystack Transfer Recipient integration for the handful of
// real agents this programme has today), so that part of the original
// spec line is now a plain "we'll be in touch" rather than a link to a
// feature that isn't being built.
export async function sendAgentApprovedEmail({
  fullName,
  email,
  referralCode,
}: {
  fullName: string;
  email: string;
  referralCode: string;
}): Promise<void> {
  const referralLink = getAgentReferralLink(referralCode);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  const result = await sendEmail({
    to: email,
    subject: "You're approved as a DigitalFlyer Growth agent",
    html: `
      <p>Good day ${fullName},</p>
      <p>Good news, your agent application has been approved.</p>
      <p>Your referral link is ready to use right away:</p>
      <p><a href="${referralLink}">${referralLink}</a></p>
      <p>Share it with your network. Anyone who signs up for Growth or Enterprise on an annual plan through your link earns you commission, 25% on your first 10 referrals, 40% from your 11th referral onward.</p>
      <p>As an approved agent, you also get your own free page to promote your own business — permanent, not a trial, no payment step, ever:</p>
      <p><a href="${siteUrl}/agents/setup-page">Set up your free page</a></p>
      <p>We'll be in touch separately about your payout details.</p>
    `,
  });

  if (!result.ok) {
    console.error("Agent approved email failed", email, result.error);
  }
}

// Sec 10: "New referral converts to a paying annual member: notify the
// agent, this is their real motivation loop."
export async function sendAgentReferralConvertedEmail({
  fullName,
  email,
  referredBusinessName,
  ratePercent,
}: {
  fullName: string;
  email: string;
  referredBusinessName: string;
  ratePercent: number;
}): Promise<void> {
  const result = await sendEmail({
    to: email,
    subject: `${referredBusinessName} just converted — you earned commission`,
    html: `
      <p>Good day ${fullName},</p>
      <p><strong>${referredBusinessName}</strong> just paid for their DigitalFlyer Growth annual plan through your referral link.</p>
      <p>You've earned ${ratePercent}% commission on this payment. Check your dashboard for the full breakdown:</p>
      <p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard">Go to your dashboard</a></p>
    `,
  });

  if (!result.ok) {
    console.error("Agent referral converted email failed", email, result.error);
  }
}

// Sec 10: "Commission marked paid: notify the agent with the amount and
// reference."
export async function sendAgentCommissionPaidEmail({
  fullName,
  email,
  amount,
  reference,
}: {
  fullName: string;
  email: string;
  amount: number;
  reference: string | null;
}): Promise<void> {
  const result = await sendEmail({
    to: email,
    subject: "Your commission has been paid",
    html: `
      <p>Good day ${fullName},</p>
      <p>We've just paid out R${amount.toFixed(2)} in referral commission to you${reference ? ` (reference: ${reference})` : ""}.</p>
      <p>Thanks for helping grow DigitalFlyer Growth.</p>
    `,
  });

  if (!result.ok) {
    console.error("Agent commission paid email failed", email, result.error);
  }
}

// Sec 10: "Agent crosses into the 40% tier (referral 11): a specific
// milestone email, this is worth celebrating... and a reminder that it
// now also applies to their earlier referrals' renewals." Sent exactly
// once, at the moment they cross the threshold — see commission.ts for
// where that moment is detected.
export async function sendAgentTierMilestoneEmail({
  fullName,
  email,
}: {
  fullName: string;
  email: string;
}): Promise<void> {
  const result = await sendEmail({
    to: email,
    subject: "You've reached the 40% commission tier",
    html: `
      <p>Good day ${fullName},</p>
      <p>Big news — with your 11th converted referral, you've moved up to the 40% commission tier.</p>
      <p>This applies to every referral going forward, and to your existing referrals' renewals too, not just new ones.</p>
      <p>Thanks for everything you've brought to DigitalFlyer Growth so far.</p>
    `,
  });

  if (!result.ok) {
    console.error("Agent tier milestone email failed", email, result.error);
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
