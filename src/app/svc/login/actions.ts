"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { svcPath } from "@/lib/svc/host";
import { normalizeCell, getMemberByCell } from "@/lib/svc/member";
import { createAndSendOtp, verifyOtp } from "@/lib/svc/otp";
import { clientIpFromHeaders, isRateLimited } from "@/lib/rate-limit";

/**
 * Two front doors, per the handoff's Sprint 1 list: email with password,
 * and cell number with a one-time code. Both end in the same Supabase
 * session for the same auth user.
 */

export async function signInWithEmail(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(`${await svcPath("/login")}?error=missing`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`${await svcPath("/login")}?error=invalid`);
  }

  // An admin login with no SVC membership (Dewald's own account is one)
  // goes straight to admin rather than to a dashboard that has nothing
  // to show. Everyone else lands on the dashboard, which now handles the
  // signed-in-but-not-a-member state itself instead of bouncing back to
  // login, which read as a broken flash.
  if (data?.user) {
    const { getMemberByAuthUser } = await import("@/lib/svc/member");
    const member = await getMemberByAuthUser(data.user.id);
    if (!member) {
      const { getSvcAdmin } = await import("@/lib/svc/admin");
      if (await getSvcAdmin()) redirect(await svcPath("/admin"));
    }
  }

  redirect(await svcPath("/account"));
}

/**
 * Cell login, step one. Anti-enumeration: the answer is the same whether
 * the number is registered or not, so this form cannot be used to test
 * which numbers are members.
 */
export async function startCellLogin(formData: FormData) {
  const cellRaw = String(formData.get("cell") ?? "");
  const cell = normalizeCell(cellRaw);

  if (!cell) {
    redirect(`${await svcPath("/login")}?mode=cell&error=cell`);
  }

  const ip = clientIpFromHeaders(await headers());
  if (isRateLimited(`svc-cell-login:${ip}`, 8, 10 * 60 * 1000)) {
    redirect(`${await svcPath("/login")}?mode=cell&error=slow`);
  }

  const member = await getMemberByCell(cell!);
  if (member?.cell_verified_at && member.auth_user_id) {
    await createAndSendOtp({ cell: cell!, purpose: "login", email: member.email });
  }

  // Same destination either way.
  redirect(`${await svcPath("/login/verify")}?cell=${encodeURIComponent(cell!)}`);
}

/**
 * Cell login, step two. Our own OTP proves possession of the cell number;
 * the Supabase session is then established through an admin-generated
 * magic link token that never leaves the server. No password touches this
 * path.
 */
export async function verifyCellLogin(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim();
  const cellRaw = String(formData.get("cell") ?? "");
  const cell = normalizeCell(cellRaw);

  if (!cell || !/^[0-9]{6}$/.test(code)) {
    redirect(`${await svcPath("/login/verify")}?cell=${encodeURIComponent(cellRaw)}&error=invalid`);
  }

  const result = await verifyOtp({ cell: cell!, purpose: "login", code });
  if (!result.ok) {
    redirect(
      `${await svcPath("/login/verify")}?cell=${encodeURIComponent(cell!)}&error=${result.error ?? "invalid"}`
    );
  }

  const member = await getMemberByCell(cell!);
  if (!member?.auth_user_id) {
    redirect(`${await svcPath("/login")}?mode=cell&error=invalid`);
  }

  const admin = createAdminClient();
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: member!.email,
  });
  const tokenHash = linkData?.properties?.hashed_token;
  if (linkError || !tokenHash) {
    console.error("SVC cell login link generation failed", linkError);
    redirect(`${await svcPath("/login")}?mode=cell&error=failed`);
  }

  const supabase = await createClient();
  const { error: sessionError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash!,
  });
  if (sessionError) {
    console.error("SVC cell login session failed", sessionError);
    redirect(`${await svcPath("/login")}?mode=cell&error=failed`);
  }

  redirect(await svcPath("/account"));
}

export async function signOutSvc() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(await svcPath("/"));
}
