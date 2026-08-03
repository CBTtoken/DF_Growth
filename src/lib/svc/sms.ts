import "server-only";

import { sendEmail } from "@/lib/email/resend";

/**
 * The OTP delivery interface, and the reason it exists as its own file.
 *
 * Cell-number OTP over SMS needs an SMS gateway, and there is none in this
 * stack yet: choosing and paying for one is Dewald's open decision from the
 * Sprint 1 audit (WhatsApp is off the table until Sprint 5). Everything
 * above this file talks to sendOtpCode() and does not know or care which
 * channel carried the code, so the day an SMS provider exists it is added
 * here, switched by SVC_OTP_CHANNEL=sms, and nothing else changes.
 *
 * Until then the code is delivered to the member's email address, plainly
 * labelled as the verification code for their cell number. That makes the
 * whole signup flow real and testable end to end today: the same code, the
 * same expiry, the same verification, only the transport differs.
 */
export async function sendOtpCode({
  cell,
  code,
  email,
}: {
  cell: string;
  code: string;
  email?: string;
}): Promise<{ ok: boolean; channel?: string; error?: string }> {
  const channel = process.env.SVC_OTP_CHANNEL ?? "email";

  if (channel === "sms") {
    // The seam for the future SMS provider. Deliberately unimplemented
    // rather than guessed at: the provider, sender ID and API shape are
    // Dewald's to choose.
    console.error("SVC_OTP_CHANNEL=sms is configured but no SMS provider is implemented yet");
    return { ok: false, error: "sms_not_implemented" };
  }

  if (!email) return { ok: false, error: "no_email_for_otp" };

  // Local development convenience: the code also lands in the server log,
  // never in production.
  if (process.env.NODE_ENV !== "production") {
    console.log(`[svc otp] code for ${cell}: ${code}`);
  }

  const { ok, error } = await sendEmail({
    to: email,
    subject: `${code} is your Smart Value Club verification code`,
    fromName: "Smart Value Club",
    html: `
      <p style="font-size:15px;line-height:1.65;color:#1a1a1a;margin:0 0 16px;">Good day,</p>
      <p style="font-size:15px;line-height:1.65;color:#1a1a1a;margin:0 0 16px;">
        Your verification code for the cell number ending in ${cell.slice(-4)} is:
      </p>
      <p style="font-size:32px;font-weight:700;letter-spacing:6px;color:#1a6b3c;margin:0 0 16px;">${code}</p>
      <p style="font-size:14px;line-height:1.65;color:#4b5563;margin:0;">
        The code expires in 10 minutes. If you did not request it, you can ignore this email.
      </p>
    `,
  });

  if (!ok) {
    console.error("SVC OTP email failed", error);
    return { ok: false, error: "send_failed" };
  }

  return { ok: true, channel: "email" };
}
