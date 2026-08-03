"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSvcClient } from "@/lib/svc/db";
import { svcPath } from "@/lib/svc/host";
import { normalizeCell, getMemberByCell, getCurrentMember } from "@/lib/svc/member";
import { createAndSendOtp, verifyOtp } from "@/lib/svc/otp";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { clientIpFromHeaders, isRateLimited } from "@/lib/rate-limit";

/**
 * Signup, step one: details in, OTP out.
 *
 * The account and member row are created before the OTP completes, in
 * pending state with the cell unverified. Nothing downstream trusts an
 * unverified cell (referrals and issuing both check cell_verified_at), so
 * an abandoned signup is inert rather than dangerous, and the person can
 * pick up where they left off by signing in.
 *
 * No password is ever stored or logged here beyond handing it to Supabase
 * auth, which stores only its hash.
 */
export async function startSignup(formData: FormData) {
  const firstName = String(formData.get("firstName") ?? "").trim();
  const surname = String(formData.get("surname") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const cellRaw = String(formData.get("cell") ?? "");
  const popia = formData.get("popia") === "on";
  const marketing = formData.get("marketing") === "on";
  const pkg = String(formData.get("package") ?? "svc-membership");

  const back = async (error: string) =>
    redirect(`${await svcPath("/join")}?package=${encodeURIComponent(pkg)}&error=${error}`);

  if (!firstName || !surname || !email) await back("missing");
  if (password.length < 8) await back("weak");
  if (!popia) await back("popia");

  const cell = normalizeCell(cellRaw);
  if (!cell) await back("cell");

  const ip = clientIpFromHeaders(await headers());
  if (isRateLimited(`svc-join:${ip}`, 10, 10 * 60 * 1000)) await back("slow");

  // An anonymous form that creates accounts and triggers OTP delivery, so
  // it gets the full Turnstile check per the house rule. The Growth signup
  // exception (account only after payment) does not apply here: this form
  // creates the account first.
  const token = formData.get("turnstileToken");
  const human = await verifyTurnstileToken(
    typeof token === "string" ? token : null,
    ip,
    "SVC_TURNSTILE_SECRET_KEY"
  );
  if (!human) await back("verify");

  // The same cell number cannot join twice (handoff section 8: matching is
  // on verified cell number).
  const existing = await getMemberByCell(cell!);
  if (existing?.cell_verified_at) await back("cell_exists");

  const admin = createAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { svc_member: true, svc_member_since: new Date().toISOString() },
  });

  let authUserId = created?.user?.id ?? null;

  if (createError) {
    const alreadyExists =
      createError.status === 422 || /already/i.test(createError.message ?? "");
    if (!alreadyExists) {
      console.error("SVC signup auth user creation failed", createError);
      await back("failed");
    }
  }

  // Sign in, which both establishes the session and, for an existing
  // account, proves the password belongs to whoever is claiming the email.
  const supabase = await createClient();
  const { data: signedIn, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) await back("email_exists");
  authUserId = signedIn?.user?.id ?? authUserId;
  if (!authUserId) await back("failed");

  const db = createSvcClient();
  const now = new Date().toISOString();

  // One member row per auth user; an unverified row belonging to someone
  // else keeps its cell number until it verifies, so a different signup
  // claiming the same cell simply proceeds and whoever verifies first owns
  // the number (the unique constraint arbitrates).
  if (existing && existing.auth_user_id !== authUserId) await back("cell_exists");

  const memberValues = {
    auth_user_id: authUserId,
    cell_number: cell!,
    email,
    first_name: firstName,
    surname,
    status: "pending",
    popia_consent_at: now,
    marketing_opt_in: marketing,
    marketing_opt_in_at: marketing ? now : null,
    updated_at: now,
  };

  const { error: memberError } = existing
    ? await db.from("member").update(memberValues).eq("id", existing.id)
    : await db.from("member").upsert(memberValues, { onConflict: "auth_user_id" });

  if (memberError) {
    console.error("SVC member row write failed", memberError);
    await back("failed");
  }

  const sent = await createAndSendOtp({ cell: cell!, purpose: "signup", email });
  if (!sent.ok) {
    console.error("SVC signup OTP send failed", sent.error);
    await back("otp_failed");
  }

  redirect(`${await svcPath("/join/verify")}?package=${encodeURIComponent(pkg)}`);
}

/**
 * Signup, step two: the code comes back and the cell number is verified.
 */
export async function verifySignupOtp(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim();
  const pkg = String(formData.get("package") ?? "svc-membership");

  const member = await getCurrentMember();
  if (!member) redirect(await svcPath("/join"));

  const back = async (error: string) =>
    redirect(`${await svcPath("/join/verify")}?package=${encodeURIComponent(pkg)}&error=${error}`);

  if (!/^[0-9]{6}$/.test(code)) await back("format");

  const result = await verifyOtp({ cell: member!.cell_number, purpose: "signup", code });
  if (!result.ok) await back(result.error ?? "invalid");

  const db = createSvcClient();
  const { error } = await db
    .from("member")
    .update({ cell_verified_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", member!.id);
  if (error) {
    console.error("SVC cell verification write failed", error);
    await back("failed");
  }

  redirect(`${await svcPath("/join/checkout")}?package=${encodeURIComponent(pkg)}`);
}

/** A fresh code, rate limited so the resend button cannot be hammered. */
export async function resendSignupOtp(formData: FormData) {
  const pkg = String(formData.get("package") ?? "svc-membership");
  const member = await getCurrentMember();
  if (!member) redirect(await svcPath("/join"));

  const ip = clientIpFromHeaders(await headers());
  if (isRateLimited(`svc-otp-resend:${member!.id}:${ip}`, 3, 10 * 60 * 1000)) {
    redirect(`${await svcPath("/join/verify")}?package=${encodeURIComponent(pkg)}&error=slow`);
  }

  await createAndSendOtp({ cell: member!.cell_number, purpose: "signup", email: member!.email });
  redirect(`${await svcPath("/join/verify")}?package=${encodeURIComponent(pkg)}&resent=1`);
}
