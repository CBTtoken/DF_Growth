"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { forgotPasswordSchema } from "@/lib/schemas/auth";
import { isRateLimited, clientIpFromHeaders } from "@/lib/rate-limit";

type ForgotPasswordState = { error?: Record<string, string[]> & { _form?: string[] }; success?: boolean } | null;

// Public Beta Polish Sprint Sec 1. Always returns the same success message
// regardless of whether the email actually has an account — standard
// anti-enumeration practice, and matches resetPasswordForEmail's own
// behavior (it doesn't error for an unknown email either).
export async function requestPasswordReset(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  // Public Beta Polish Sprint Sec 1 acceptance criteria: 5 per 10 minutes
  // per email. Keyed by email (not IP) specifically per that wording —
  // this is the one endpoint where the spec calls out the key explicitly.
  if (isRateLimited(`password-reset:${parsed.data.email.toLowerCase()}`, 5, 10 * 60 * 1000)) {
    return { error: { _form: ["Too many requests for this email — please wait a few minutes and try again."] } };
  }

  // Also keyed by IP as a lighter secondary guard against one script
  // working through a list of emails.
  const ip = clientIpFromHeaders(await headers());
  if (isRateLimited(`password-reset-ip:${ip}`, 20, 10 * 60 * 1000)) {
    return { error: { _form: ["Too many requests — please wait a few minutes and try again."] } };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
  });

  if (error) {
    console.error("Failed to send password reset email", error);
  }

  return { success: true };
}
