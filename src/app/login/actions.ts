"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveLandingPath } from "@/lib/auth/resolve-landing-path";
import { loginSchema } from "@/lib/schemas/auth";
import { isRateLimited, clientIpFromHeaders } from "@/lib/rate-limit";

type LoginState = { error?: Record<string, string[]> & { _form?: string[] } } | null;

// Public Beta Polish Sprint Sec 1: replaces the old signInWithOtp
// magic-link send with real email+password sign-in. The one wrinkle is
// every account created before this shipped has no password at all
// (has_password isn't set in their app_metadata) — signInWithPassword
// fails for them the same generic way it fails for a wrong password, so a
// second, admin-only lookup distinguishes "this account just needs to be
// migrated" (send a fresh set-password email, explain why) from "wrong
// email or password" (generic message, doesn't confirm whether the
// account exists).
export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const ip = clientIpFromHeaders(await headers());
  if (isRateLimited(`login:${ip}`, 10, 10 * 60 * 1000)) {
    return { error: { _form: ["Too many attempts — please wait a few minutes and try again."] } };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    const admin = createAdminClient();
    const lookupRes = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(parsed.data.email)}`,
      {
        headers: {
          apikey: process.env.SUPABASE_SECRET_KEY!,
          Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
        },
      }
    );
    const lookupData = await lookupRes.json();
    const existingUser = lookupData?.users?.[0] as { id: string; app_metadata?: { has_password?: boolean } } | undefined;

    if (existingUser && existingUser.app_metadata?.has_password !== true) {
      const { error: resetError } = await admin.auth.resetPasswordForEmail(parsed.data.email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      });
      if (resetError) console.error("Failed to send migration set-password email", resetError);
      return {
        error: {
          _form: [
            "We've upgraded how you sign in — check your email for a link to set up a password for your account.",
          ],
        },
      };
    }

    return { error: { _form: ["Incorrect email or password."] } };
  }

  const landingPath = await resolveLandingPath(data.user.id);
  redirect(landingPath);
}
