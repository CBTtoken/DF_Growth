"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { isRateLimited, clientIpFromHeaders } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { verifyEmailAddress } from "@/lib/email/verify-address";
import { getDraftCandidateId, clearDraftCandidateId } from "@/lib/jobs/draft-session";
import { getLiveApplyIntent } from "@/lib/jobs/apply-intent";
import { emailAlreadyRegistered } from "@/lib/jobs/email-taken";
import { jobsPath } from "@/lib/jobs/host";

// Candidate signup, in two steps -- the same shape as KatisoBiz's own
// (src/app/bizup/signup/actions.ts): a typed code, not a clicked link, per
// this project's standing rule after the Zoho incident where mail scanners
// opened confirmation links before the recipient could.
//
// The one real difference: a person may already have a draft CV (built with
// no account at all, per the spec's "frictionless" rule) sitting behind the
// jobs_draft_cv cookie before they ever reach this form. Confirming here
// claims that row rather than creating a fresh one, so nothing typed before
// signup is lost.

export type JobsSignupState = {
  error?: Record<string, string[]> & { _form?: string[] };
  awaitingCode?: string;
  resent?: boolean;
} | null;

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name"),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().min(9, "Enter your mobile number"),
  password: z.string().min(8, "Use at least 8 characters"),
});

export async function signUpForJobs(_prev: JobsSignupState, formData: FormData): Promise<JobsSignupState> {
  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  const { fullName, email, phone, password } = parsed.data;

  const h = await headers();
  const ip = clientIpFromHeaders(h);
  if (isRateLimited(`jobs-signup:${ip}`, 5, 15 * 60 * 1000)) {
    return { error: { _form: ["Too many attempts. Please wait a few minutes and try again."] } };
  }

  const human = await verifyTurnstileToken(
    String(formData.get("turnstileToken") ?? ""),
    ip,
    "JOBS_TURNSTILE_SECRET_KEY",
  );
  if (!human) {
    return { error: { _form: ["We could not confirm you are a person. Please try again."] } };
  }

  const address = await verifyEmailAddress(email);
  if (!address.valid) {
    return { error: { email: ["We cannot find that email domain. Please check the spelling."] } };
  }

  // Checked before signUp, not only after. The identities check below is
  // Supabase's own signal and it does not fire in every state, which is how
  // somebody registered a second time on an address they already had and
  // was walked through the whole flow without being told.
  if (await emailAlreadyRegistered(email)) {
    return {
      error: {
        email: ["You already have an account on this email address. Log in instead and your CV will be waiting."],
      },
    };
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { jobs_full_name: fullName, jobs_phone: phone } },
  });

  if (error) {
    console.error("Jobs signUp failed", error.message);
    return { error: { _form: ["We couldn't start that signup. Please try again."] } };
  }

  if (data.user && data.user.identities?.length === 0) {
    return { error: { _form: ["There is already an account with that email. Log in instead."] } };
  }

  return { awaitingCode: email };
}

export async function confirmJobsSignup(_prev: JobsSignupState, formData: FormData): Promise<JobsSignupState> {
  const email = String(formData.get("email") ?? "").trim();
  const token = String(formData.get("code") ?? "").replace(/\s/g, "");
  if (!email || !token) {
    return { error: { code: ["Enter the code from your email."] }, awaitingCode: email };
  }

  const h = await headers();
  const ip = clientIpFromHeaders(h);
  if (isRateLimited(`jobs-confirm:${ip}`, 10, 15 * 60 * 1000)) {
    return { error: { _form: ["Too many attempts. Please wait a few minutes."] }, awaitingCode: email };
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "signup" });

  if (error || !data.user) {
    return { error: { code: ["That code is not right, or it has expired."] }, awaitingCode: email };
  }

  const meta = data.user.user_metadata ?? {};
  const fullName = String(meta.jobs_full_name ?? "").trim() || null;
  const phone = String(meta.jobs_phone ?? "").trim() || null;

  const admin = createAdminClient();

  // Idempotent: confirming twice (a resumed tab) must not create a second
  // account.
  const { data: existing } = await admin
    .from("jobs_candidates")
    .select("id")
    .eq("owner_user_id", data.user.id)
    .maybeSingle();

  if (!existing) {
    const draftId = await getDraftCandidateId();
    // Claim the unclaimed draft (owner_user_id still null) rather than
    // create a fresh row, so a CV built before signup is not lost. The
    // owner_user_id-is-null check also means a stale or someone-else's
    // cookie value can never claim an already-owned CV.
    const { data: claimed } = draftId
      ? await admin
          .from("jobs_candidates")
          .update({ owner_user_id: data.user.id, full_name: fullName, phone, email })
          .eq("id", draftId)
          .is("owner_user_id", null)
          .select("id")
          .maybeSingle()
      : { data: null };

    if (!claimed) {
      const { error: createError } = await admin.from("jobs_candidates").insert({
        owner_user_id: data.user.id,
        full_name: fullName,
        phone,
        email,
        // Signup asked for name and number, which are CV questions one and
        // two. Starting the builder back at question one would ask for
        // both again, which is exactly the kind of thing that makes people
        // think the product has forgotten them.
        cv_step: "primary_role",
      });
      if (createError) {
        console.error("Failed to create jobs_candidates row after confirmation", createError);
        return { error: { _form: ["We couldn't finish setting that up. Please try again."] }, awaitingCode: email };
      }
    }

    await clearDraftCandidateId();
  }

  // Somebody who started at a job advert goes back to that advert: they
  // came to apply for one specific thing, and the walkthrough found that
  // this was exactly where they were being lost. Everyone else lands on
  // the dashboard, never the home page or a mid-flow screen (handoff Job
  // 8) -- the dashboard shows the saved CV with its completeness bar as
  // the confirmation of what just happened.
  const intent = await getLiveApplyIntent();
  if (intent) redirect(await jobsPath(`/vacancies/${intent}`));

  // Straight on with the CV, not to a dashboard showing an empty one.
  // Signup is now the first screen of building it, so this is the second,
  // and stopping in between to explain a dashboard would be an
  // interruption in the middle of one task.
  redirect(await jobsPath("/cv"));
}

export async function resendJobsCode(_prev: JobsSignupState, formData: FormData): Promise<JobsSignupState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: { _form: ["We lost track of your email. Please start again."] } };

  const h = await headers();
  const ip = clientIpFromHeaders(h);
  if (isRateLimited(`jobs-resend:${ip}`, 3, 15 * 60 * 1000)) {
    return {
      error: { _form: ["You have asked for a few codes already. Please wait a few minutes."] },
      awaitingCode: email,
    };
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.resend({ type: "signup", email });

  if (error) {
    console.error("Jobs code resend failed", error.message);
    return { error: { _form: ["We couldn't send another code. Please try again in a moment."] }, awaitingCode: email };
  }

  return { awaitingCode: email, resent: true };
}
