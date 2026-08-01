"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deskEmail } from "@/lib/desk/auth";
import { isRateLimited, clientIpFromHeaders } from "@/lib/rate-limit";

type LoginState = { error?: string } | null;

// One account, his. Anything else is signed straight back out, so a valid
// Growth or KatisoBiz login cannot be used to reach The Desk.
export async function deskLogin(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Email and password, please." };

  const ip = clientIpFromHeaders(await headers());
  if (isRateLimited(`desk-login:${ip}`, 10, 10 * 60 * 1000)) {
    return { error: "Too many attempts. Wait a few minutes." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) return { error: "Incorrect email or password." };

  if (data.user.email?.toLowerCase() !== deskEmail()) {
    await supabase.auth.signOut();
    return { error: "That account cannot use this." };
  }

  redirect("/desk");
}

export async function deskLogout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/desk/login");
}
