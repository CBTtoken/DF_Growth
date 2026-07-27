"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { setActiveProductPreference } from "@/lib/bizup/product";
import { sendDigitalFlyerCapiEvent } from "@/lib/meta/digitalflyer-capi";
import { isRateLimited, clientIpFromHeaders } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { verifyEmailAddress } from "@/lib/email/verify-address";

// KatisoBiz signup, in two steps.
//
// The first version of this created the account and signed the member
// straight in with email_confirm set, which meant a mistyped address
// silently produced an account that could never receive a document and
// could never be recovered. Found by Dewald on the live page.
//
// It is now a real verification: a typed code, matching this project's
// standing rule after the Zoho incident, where mail scanners opened
// confirmation links before the recipient could and consumed the token.
// A code cannot be consumed by a scanner.
//
// Three gates, cheapest first:
//   1. Turnstile, so a bot never reaches the mail sender at all.
//   2. An MX lookup on the domain, which catches gmial.com before we send
//      anything and before the member waits for a code that cannot arrive.
//   3. The code itself, which proves they actually own the address.

export type SignupState = {
  error?: Record<string, string[]> & { _form?: string[] };
  /** Set once the code is on its way, which is what swaps the form for the code screen. */
  awaitingCode?: string;
  /** True when a fresh code has just gone out, so the screen can say so. */
  resent?: boolean;
} | null;

const signupSchema = z.object({
  businessName: z.string().trim().min(2, "Enter your business name"),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().min(9, "Enter your mobile number"),
  password: z.string().min(8, "Use at least 8 characters"),
});

export async function signUpForBizUp(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const parsed = signupSchema.safeParse({
    businessName: formData.get("businessName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  const { businessName, email, phone, password } = parsed.data;

  const h = await headers();
  const ip = clientIpFromHeaders(h);
  if (isRateLimited(`bizup-signup:${ip}`, 5, 15 * 60 * 1000)) {
    return { error: { _form: ["Too many attempts. Please wait a few minutes and try again."] } };
  }

  // Gate 1. Before anything else, so an automated signup never costs us a
  // send and never lands in the mail provider's bounce statistics.
  // The field name must match TurnstileWidget's hidden input, which is
  // "turnstileToken", not Cloudflare's own "cf-turnstile-response". Reading
  // the wrong one fails closed and silently blocks every signup, which is
  // exactly what happened on the first pass here.
  const human = await verifyTurnstileToken(
    String(formData.get("turnstileToken") ?? ""),
    ip,
    "BIZUP_TURNSTILE_SECRET_KEY",
  );
  if (!human) {
    return { error: { _form: ["We could not confirm you are a person. Please try again."] } };
  }

  // Gate 2. A real MX lookup on the domain. This is the one that catches
  // the typo Dewald raised: gmial.com, outlok.com, a missing letter in a
  // company domain. Far better to say so now than to send a code into a
  // void and leave someone waiting.
  const address = await verifyEmailAddress(email);
  if (!address.valid) {
    return {
      error: {
        email: ["We cannot find that email domain. Please check the spelling."],
      },
    };
  }

  // signUp, not admin createUser: this sends the confirmation code and
  // leaves the account unverified until the code comes back. The business
  // name and phone ride along as user metadata rather than being written to
  // a table now, so an abandoned signup leaves no half-made account behind.
  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { bizup_business_name: businessName, bizup_phone: phone } },
  });

  if (error) {
    console.error("KatisoBiz signUp failed", error.message);
    return { error: { _form: ["We couldn't start that signup. Please try again."] } };
  }

  // Supabase returns a user with an empty identities array when the address
  // is already registered, rather than saying so, to avoid confirming which
  // addresses exist. Worth handling explicitly, because "check your email"
  // would leave a returning member waiting for a code that never comes.
  if (data.user && data.user.identities?.length === 0) {
    return {
      error: { _form: ["There is already an account with that email. Log in instead."] },
    };
  }

  return { awaitingCode: email };
}

/**
 * Step two: the code. verifyOtp both confirms the address and establishes
 * the session in one call, which is why this flow needs no callback route,
 * no hash parsing and no redirect-URL configuration.
 */
export async function confirmBizUpSignup(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const email = String(formData.get("email") ?? "").trim();
  const token = String(formData.get("code") ?? "").replace(/\s/g, "");
  if (!email || !token) {
    return { error: { code: ["Enter the code from your email."] }, awaitingCode: email };
  }

  const h = await headers();
  const ip = clientIpFromHeaders(h);
  if (isRateLimited(`bizup-confirm:${ip}`, 10, 15 * 60 * 1000)) {
    return { error: { _form: ["Too many attempts. Please wait a few minutes."] }, awaitingCode: email };
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "signup" });

  if (error || !data.user) {
    return { error: { code: ["That code is not right, or it has expired."] }, awaitingCode: email };
  }

  const meta = data.user.user_metadata ?? {};
  const businessName = String(meta.bizup_business_name ?? "").trim() || "My business";
  const phone = String(meta.bizup_phone ?? "").trim() || null;

  const admin = createAdminClient();

  // Idempotent: a member who confirms, navigates away and comes back must
  // not end up with a second account. owner_user_id is unique anyway, so
  // this is the friendly path rather than the only defence.
  const { data: existing } = await admin
    .from("bizup_accounts")
    .select("id")
    .eq("owner_user_id", data.user.id)
    .maybeSingle();

  if (!existing) {
    const { error: accountError } = await admin.from("bizup_accounts").insert({
      owner_user_id: data.user.id,
      business_name: businessName,
      email,
      phone,
    });
    if (accountError) {
      console.error("Failed to create KatisoBiz account after confirmation", accountError);
      return { error: { _form: ["We couldn't finish setting that up. Please try again."] }, awaitingCode: email };
    }
  }

  await setActiveProductPreference("bizup");

  // Fired only now, on a verified account, so the conversion count is not
  // inflated by abandoned or mistyped signups. Awaited rather than fired
  // and forgotten: neither bare promises nor after() reliably complete on
  // this deployment.
  const eventId = crypto.randomUUID();
  const host = h.get("host") ?? "katisobiz.co.za";
  await sendDigitalFlyerCapiEvent({
    eventName: "CompleteRegistration",
    email,
    eventId,
    eventSourceUrl: `https://${host}/bizup/signup`,
    clientUserAgent: h.get("user-agent"),
    contentName: "bizup_free",
  });

  // A visitor who picked a paid plan on the pricing table goes straight to
  // paying for it. Every account is created on the free tier because it
  // has to exist before it can be charged, so without this they were
  // silently left there having clicked "R49".
  const chosenPlan = String(formData.get("plan") ?? "");
  if (chosenPlan === "paid" || chosenPlan === "unlimited") {
    redirect(`/bizup/upgrade?ev=${eventId}&plan=${chosenPlan}`);
  }

  redirect(`/bizup/welcome?ev=${eventId}`);
}

/**
 * Sends a fresh code to the same address.
 *
 * Dewald: "what happens if the code expired, I clicked on start again and
 * nothing happens". Two problems, and this is the one that matters. Codes
 * expire after an hour, and there was no way to ask for another: the only
 * escape was to abandon the signup entirely and hope. A member who has
 * already typed four fields and proved they are human should never be sent
 * back to the beginning for a reason that is not their fault.
 */
export async function resendBizUpCode(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: { _form: ["We lost track of your email. Please start again."] } };

  const h = await headers();
  const ip = clientIpFromHeaders(h);
  // Tighter than the signup limit: this sends a real email every time and
  // needs no form to be filled in first, so it is the cheaper thing to abuse.
  if (isRateLimited(`bizup-resend:${ip}`, 3, 15 * 60 * 1000)) {
    return {
      error: { _form: ["You have asked for a few codes already. Please wait a few minutes."] },
      awaitingCode: email,
    };
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.resend({ type: "signup", email });

  if (error) {
    console.error("KatisoBiz code resend failed", error.message);
    return {
      error: { _form: ["We couldn't send another code. Please try again in a moment."] },
      awaitingCode: email,
    };
  }

  return { awaitingCode: email, resent: true };
}
