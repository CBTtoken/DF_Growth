"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { reviewerSignupSchema } from "@/lib/schemas/reviews";
import { isRateLimited, clientIpFromHeaders } from "@/lib/rate-limit";

type ReviewerSignupState = { error?: Record<string, string[]> & { _form?: string[] }; success?: boolean } | null;

// Rate & Review Sprint 1, Sec 2/3: "anyone can leave a review, but only
// through a verified account." Real bug found via live testing: a
// clickable-link confirmation email is a single-use token, and several
// email providers (Zoho's link-scanning included — confirmed live,
// error_code=otp_expired) automatically open links in incoming mail to
// scan them for safety, consuming the token before the real recipient
// ever clicks it. The email itself confirms correctly (Supabase's own
// scanner-triggered request completes it) but the human is then locked
// out — every fix short of removing the clickable link entirely just
// treated a symptom. Supabase generates the same 6-digit OTP code
// alongside the link for every signup regardless — switching the email
// template to show only the code (Dewald, dashboard-side) and verifying
// it via verifyOtp() below removes the vulnerable link from the email
// altogether, not just from this app's own handling of it.
export async function signUpReviewer(_prevState: ReviewerSignupState, formData: FormData): Promise<ReviewerSignupState> {
  const parsed = reviewerSignupSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const ip = clientIpFromHeaders(await headers());
  if (isRateLimited(`reviewer-signup:${ip}`, 10, 10 * 60 * 1000)) {
    return { error: { _form: ["Too many attempts — please wait a few minutes and try again."] } };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    console.error("Reviewer signup failed", error);
    return { error: { _form: ["Something went wrong — please try again."] } };
  }

  // Supabase returns a "successful" user with an empty identities array for
  // an email that's already registered, rather than a clear error — this is
  // the documented anti-enumeration behavior, and the standard way to
  // detect it.
  if (!data.user || data.user.identities?.length === 0) {
    return { error: { _form: ["That email already has an account — log in instead."] } };
  }

  const admin = createAdminClient();
  const { error: insertError } = await admin
    .from("reviewer_accounts")
    .insert({ user_id: data.user.id, display_name: parsed.data.displayName });

  if (insertError) {
    console.error("Failed to create reviewer_accounts row", insertError);
    return { error: { _form: ["Something went wrong — please try again."] } };
  }

  return { success: true };
}

type VerifyOtpState = { error?: string; success?: boolean } | null;

// Verifies the 6-digit code from the "Confirm signup" email. Runs entirely
// server-side against the cookie-backed SSR client — verifyOtp() both
// confirms the account AND establishes the session in one call, writing
// the session cookie directly as part of this request. No hash-fragment
// parsing, no redirect URL, no separate "finish" page needed at all — the
// whole class of bug that came from splitting those steps across a
// client-side token exchange and a follow-up server read doesn't exist
// when it's one atomic server call.
export async function verifyReviewerSignupOtp(_prevState: VerifyOtpState, formData: FormData): Promise<VerifyOtpState> {
  const email = String(formData.get("email") ?? "").trim();
  const token = String(formData.get("token") ?? "").trim();
  if (!email || !token) {
    return { error: "Enter the code from your email." };
  }

  const ip = clientIpFromHeaders(await headers());
  if (isRateLimited(`reviewer-otp:${ip}`, 10, 10 * 60 * 1000)) {
    return { error: "Too many attempts — please wait a few minutes and try again." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "signup" });

  if (error || !data.user) {
    return { error: "That code is incorrect or has expired — check your email for the latest one." };
  }

  // Publishes any of this reviewer's reviews that were waiting on this
  // exact confirmation (Sec 3: "unverified submissions sit pending, not
  // visible, until confirmed") — a no-op for a brand-new account with no
  // reviews yet.
  const admin = createAdminClient();
  const { data: account } = await admin
    .from("reviewer_accounts")
    .select("id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (account) {
    await admin
      .from("reviews")
      .update({ status: "published", verified_at: new Date().toISOString() })
      .eq("reviewer_account_id", account.id)
      .eq("status", "pending_verification");
  }

  return { success: true };
}
