"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { reviewerSignupSchema, reviewSubmissionSchema } from "@/lib/schemas/reviews";
import { isRateLimited, clientIpFromHeaders } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";

type ReviewFormState = { error?: Record<string, string[]> & { _form?: string[] }; success?: boolean } | null;

function parseReviewFields(formData: FormData) {
  return reviewSubmissionSchema.safeParse({
    rating: formData.get("rating"),
    reviewText: formData.get("reviewText"),
  });
}

// Rate & Review Sprint 1, Sec 2/3: "anyone can leave a review, but only
// through a verified account." Combined signup + review submission in one
// action — the real user journey is "I want to leave a review," account
// creation is incidental to that, not a separate destination. Real bug
// found via live testing and now fixed: a clickable-link confirmation
// email is a single-use token, and several email providers (Zoho's
// link-scanning confirmed live, error_code=otp_expired) automatically open
// links in incoming mail to scan them for safety, consuming the token
// before the real recipient ever clicks it. Switched to a 6-digit OTP
// code instead (verifyReviewerSignupOtp below) — no clickable link in the
// email at all, nothing for a scanner to consume.
export async function submitReviewNewReviewer(_prevState: ReviewFormState, formData: FormData): Promise<ReviewFormState> {
  const businessId = String(formData.get("businessId") ?? "");
  const signupParsed = reviewerSignupSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  const reviewParsed = parseReviewFields(formData);

  if (!businessId) {
    return { error: { _form: ["Something went wrong — please reload and try again."] } };
  }
  if (!signupParsed.success) {
    return { error: signupParsed.error.flatten().fieldErrors };
  }
  if (!reviewParsed.success) {
    return { error: reviewParsed.error.flatten().fieldErrors };
  }

  const h = await headers();
  const ip = clientIpFromHeaders(h);
  if (isRateLimited(`review-submit:${ip}`, 10, 10 * 60 * 1000)) {
    return { error: { _form: ["Too many attempts — please wait a few minutes and try again."] } };
  }

  const turnstileOk = await verifyTurnstileToken(String(formData.get("turnstileToken") ?? ""), ip);
  if (!turnstileOk) {
    return { error: { _form: ["Verification failed — please try again."] } };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: signupParsed.data.email,
    password: signupParsed.data.password,
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
  const { data: account, error: insertAccountError } = await admin
    .from("reviewer_accounts")
    .insert({ user_id: data.user.id, display_name: signupParsed.data.displayName })
    .select("id")
    .single();

  if (insertAccountError || !account) {
    console.error("Failed to create reviewer_accounts row", insertAccountError);
    return { error: { _form: ["Something went wrong — please try again."] } };
  }

  const { error: reviewError } = await admin.from("reviews").insert({
    business_id: businessId,
    reviewer_account_id: account.id,
    rating: reviewParsed.data.rating,
    review_text: reviewParsed.data.reviewText,
    status: "pending_verification",
  });

  if (reviewError) {
    console.error("Failed to create review", reviewError);
    return { error: { _form: ["Something went wrong saving your review — please try again."] } };
  }

  return { success: true };
}

// Returning reviewer: log in with an existing account and submit directly
// — signInWithPassword fails outright for an unconfirmed email when
// Supabase's own "Confirm email" setting is on, so a successful login here
// already proves the account is verified; the review publishes
// immediately, no OTP step needed.
export async function submitReviewExistingReviewer(_prevState: ReviewFormState, formData: FormData): Promise<ReviewFormState> {
  const businessId = String(formData.get("businessId") ?? "");
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const reviewParsed = parseReviewFields(formData);

  if (!businessId || !email || !password) {
    return { error: { _form: ["Enter your email and password."] } };
  }
  if (!reviewParsed.success) {
    return { error: reviewParsed.error.flatten().fieldErrors };
  }

  const h = await headers();
  const ip = clientIpFromHeaders(h);
  if (isRateLimited(`review-login:${ip}`, 10, 10 * 60 * 1000)) {
    return { error: { _form: ["Too many attempts — please wait a few minutes and try again."] } };
  }

  const turnstileOk = await verifyTurnstileToken(String(formData.get("turnstileToken") ?? ""), ip);
  if (!turnstileOk) {
    return { error: { _form: ["Verification failed — please try again."] } };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return { error: { _form: ["Incorrect email or password."] } };
  }

  const admin = createAdminClient();
  const { data: account } = await admin
    .from("reviewer_accounts")
    .select("id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (!account) {
    return { error: { _form: ["No reviewer account found for this login."] } };
  }

  const { error: reviewError } = await admin.from("reviews").insert({
    business_id: businessId,
    reviewer_account_id: account.id,
    rating: reviewParsed.data.rating,
    review_text: reviewParsed.data.reviewText,
    status: "published",
    verified_at: new Date().toISOString(),
  });

  if (reviewError) {
    // 23505 = unique_violation — the (business_id, reviewer_account_id)
    // constraint (Sec 3: "one review per verified account per business").
    if (reviewError.code === "23505") {
      return { error: { _form: ["You've already reviewed this business."] } };
    }
    console.error("Failed to create review", reviewError);
    return { error: { _form: ["Something went wrong saving your review — please try again."] } };
  }

  return { success: true };
}

type VerifyOtpState = { error?: string; success?: boolean } | null;

// Verifies the 6-digit code from the "Confirm signup" email. Runs entirely
// server-side against the cookie-backed SSR client — verifyOtp() both
// confirms the account AND establishes the session in one call, writing
// the session cookie directly as part of this request. No hash-fragment
// parsing, no redirect URL, no separate "finish" page needed at all.
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
  // visible, until confirmed").
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
