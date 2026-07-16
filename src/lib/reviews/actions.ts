"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { reviewerSignupSchema } from "@/lib/schemas/reviews";
import { isRateLimited, clientIpFromHeaders } from "@/lib/rate-limit";

type ReviewerSignupState = { error?: Record<string, string[]> & { _form?: string[] }; success?: boolean } | null;

// Rate & Review Sprint 1, Sec 2/3: "anyone can leave a review, but only
// through a verified account." Plain supabase.auth.signUp() (not
// admin.createUser, which never sends mail) — this is exactly what that
// method is for, dispatched through the same Resend/custom-SMTP relay
// already configured for every other Supabase Auth email in this project.
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

  // Hardcoded rather than derived from a request header (Host/
  // X-Forwarded-Host are attacker-controllable — a spoofed value here
  // could redirect a real confirmation link, carrying real session tokens,
  // to an attacker's domain) or trusted from NEXT_PUBLIC_SITE_URL, which
  // is baked in at Vercel build time and has been unreliable this session
  // (it's flat-out localhost in local dev). This is the one real
  // production origin this app is ever meant to run on.
  const TRUSTED_SITE_URL = "https://growth.digitalflyersa.co.za";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${TRUSTED_SITE_URL}/review-confirmed`,
    },
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

// Called from /review-confirmed right after the client establishes the
// session from the email link's tokens. Publishes any of this reviewer's
// reviews that were waiting on this exact confirmation (Sec 3:
// "unverified submissions sit pending, not visible, until confirmed") —
// a no-op for a brand-new account with no reviews yet. Uses the admin
// client for the actual write, matching this project's established
// pattern of server-side writes rather than client-permitted RLS updates.
export async function confirmReviewerEmail(): Promise<{ ok: boolean; reason?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: `no-session${userError ? `: ${userError.message}` : ""}` };

  const admin = createAdminClient();
  const { data: account, error: accountError } = await admin
    .from("reviewer_accounts")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!account) return { ok: false, reason: `no-account${accountError ? `: ${accountError.message}` : ""}` };

  await admin
    .from("reviews")
    .update({ status: "published", verified_at: new Date().toISOString() })
    .eq("reviewer_account_id", account.id)
    .eq("status", "pending_verification");

  return { ok: true };
}
