"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { svcPath, isSvcHost, SVC_ORIGIN } from "@/lib/svc/host";
import { clientIpFromHeaders, isRateLimited } from "@/lib/rate-limit";

/**
 * Same anti-enumeration stance as the platform's own forgot-password: the
 * answer is identical whether the email has an account or not.
 *
 * The redirect target is SVC's own auth callback on whichever hostname the
 * member is actually using, so the reset finishes inside SVC's own styling
 * rather than bouncing through Growth's. The callback URL must be in
 * Supabase's redirect allowlist; that is an operator step in the Sprint 1
 * report.
 */
export async function requestSvcPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const back = await svcPath("/forgot-password");

  if (!email || !email.includes("@")) redirect(`${back}?error=email`);

  if (isRateLimited(`svc-password-reset:${email}`, 5, 10 * 60 * 1000)) {
    redirect(`${back}?error=slow`);
  }
  const ip = clientIpFromHeaders(await headers());
  if (isRateLimited(`svc-password-reset-ip:${ip}`, 20, 10 * 60 * 1000)) {
    redirect(`${back}?error=slow`);
  }

  const host = (await headers()).get("host") ?? "";
  const proto = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  const origin = isSvcHost(host) ? SVC_ORIGIN : `${proto}://${host}`;
  const callbackPath = await svcPath("/auth/callback");

  const admin = createAdminClient();
  const { error } = await admin.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}${callbackPath}`,
  });
  if (error) console.error("SVC password reset email failed", error);

  redirect(`${back}?sent=1`);
}
