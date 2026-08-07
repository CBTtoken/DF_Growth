"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { isRateLimited, clientIpFromHeaders } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { verifyEmailAddress } from "@/lib/email/verify-address";
import { jobsPath } from "@/lib/jobs/host";

// Employer signup, same two-step shape as candidate signup
// (src/app/jobs/signup/actions.ts): Turnstile before anything costs a
// send, an MX lookup before a code goes into the void, then a typed code
// (never a clicked link, the standing rule after the Zoho incident).
//
// The spec's "registration is one step" spirit holds: business name and
// cell up front, no verification wall before they can browse -- browsing
// is public anyway. The email exists because it is how they log in, and
// the code proves it works before an account exists.

export type EmployerSignupState = {
  error?: Record<string, string[]> & { _form?: string[] };
  awaitingCode?: string;
  resent?: boolean;
} | null;

const signupSchema = z.object({
  businessName: z.string().trim().min(2, "Enter your business name"),
  phone: z.string().trim().min(9, "Enter your cell number"),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters"),
});

export async function signUpEmployer(_prev: EmployerSignupState, formData: FormData): Promise<EmployerSignupState> {
  const parsed = signupSchema.safeParse({
    businessName: formData.get("businessName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  const { businessName, phone, email, password } = parsed.data;

  const h = await headers();
  const ip = clientIpFromHeaders(h);
  if (isRateLimited(`jobs-employer-signup:${ip}`, 5, 15 * 60 * 1000)) {
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

  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { jobs_employer_business_name: businessName, jobs_employer_phone: phone } },
  });

  if (error) {
    console.error("Jobs employer signUp failed", error.message);
    return { error: { _form: ["We couldn't start that signup. Please try again."] } };
  }

  if (data.user && data.user.identities?.length === 0) {
    return { error: { _form: ["There is already an account with that email. Log in instead."] } };
  }

  return { awaitingCode: email };
}

export async function confirmEmployerSignup(_prev: EmployerSignupState, formData: FormData): Promise<EmployerSignupState> {
  const email = String(formData.get("email") ?? "").trim();
  const token = String(formData.get("code") ?? "").replace(/\s/g, "");
  if (!email || !token) {
    return { error: { code: ["Enter the code from your email."] }, awaitingCode: email };
  }

  const h = await headers();
  const ip = clientIpFromHeaders(h);
  if (isRateLimited(`jobs-employer-confirm:${ip}`, 10, 15 * 60 * 1000)) {
    return { error: { _form: ["Too many attempts. Please wait a few minutes."] }, awaitingCode: email };
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "signup" });

  if (error || !data.user) {
    return { error: { code: ["That code is not right, or it has expired."] }, awaitingCode: email };
  }

  const meta = data.user.user_metadata ?? {};
  const businessName = String(meta.jobs_employer_business_name ?? "").trim() || "My business";
  const phone = String(meta.jobs_employer_phone ?? "").trim() || null;

  const admin = createAdminClient();

  // Idempotent: confirming twice must not create a second account.
  const { data: existing } = await admin
    .from("jobs_employers")
    .select("id")
    .eq("owner_user_id", data.user.id)
    .maybeSingle();

  if (!existing) {
    const { error: createError } = await admin.from("jobs_employers").insert({
      owner_user_id: data.user.id,
      business_name: businessName,
      phone,
      email,
    });
    if (createError) {
      console.error("Failed to create jobs_employers row after confirmation", createError);
      return { error: { _form: ["We couldn't finish setting that up. Please try again."] }, awaitingCode: email };
    }
  }

  redirect(await jobsPath("/employer"));
}

export async function resendEmployerCode(_prev: EmployerSignupState, formData: FormData): Promise<EmployerSignupState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: { _form: ["We lost track of your email. Please start again."] } };

  const h = await headers();
  const ip = clientIpFromHeaders(h);
  if (isRateLimited(`jobs-employer-resend:${ip}`, 3, 15 * 60 * 1000)) {
    return {
      error: { _form: ["You have asked for a few codes already. Please wait a few minutes."] },
      awaitingCode: email,
    };
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.resend({ type: "signup", email });

  if (error) {
    console.error("Jobs employer code resend failed", error.message);
    return { error: { _form: ["We couldn't send another code. Please try again in a moment."] }, awaitingCode: email };
  }

  return { awaitingCode: email, resent: true };
}
