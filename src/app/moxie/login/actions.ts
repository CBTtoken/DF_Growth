"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { moxiePath } from "@/lib/moxie/host";

/**
 * Reader accounts.
 *
 * Both handoffs put reader accounts out of scope, and both were written
 * when Moxie had no payments. Memberships make an account unavoidable: there
 * is nothing to attach a subscription to otherwise.
 *
 * Existing Supabase auth, no new system and no new vendor, exactly as the
 * eMag builder does it. A reader is an auth user with a row in
 * moxie_subscriptions or without one; nothing else distinguishes them from
 * any other account on this project.
 */

function safeNext(next: string | null): string {
  // Only same-site paths. An open redirect on a sign-in form is how a
  // phishing page borrows your domain's credibility.
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/editions";
  return next;
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next") ? String(formData.get("next")) : null);

  if (!email || !password) {
    redirect(await moxiePath(`/login?error=missing&next=${encodeURIComponent(next)}`));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(await moxiePath(`/login?error=invalid&next=${encodeURIComponent(next)}`));
  }

  redirect(await moxiePath(next));
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next") ? String(formData.get("next")) : null);

  if (!email || password.length < 8) {
    redirect(await moxiePath(`/login?mode=join&error=weak&next=${encodeURIComponent(next)}`));
  }

  const admin = createAdminClient();

  // Created through the admin API with email_confirm already true, rather
  // than through signUp, so no confirmation email is sent.
  //
  // Two reasons. A reader who has just paid should not be locked out of the
  // edition waiting for an email, and this project has already taken a
  // Supabase bounce-rate warning from mail sent to addresses that turned out
  // not to exist. Nothing here is protecting anything valuable enough to
  // justify that: the account exists to hold a membership, and the
  // membership is proven by a payment, not by an email round trip.
  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    // An existing account is not an error worth a scary message. Fall
    // through to a sign-in attempt, which either works or tells them the
    // password is wrong.
    const alreadyExists =
      createError.status === 422 || /already/i.test(createError.message ?? "");
    if (!alreadyExists) {
      console.error("Moxie reader signup failed", createError);
      redirect(await moxiePath(`/login?mode=join&error=failed&next=${encodeURIComponent(next)}`));
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(await moxiePath(`/login?error=exists&next=${encodeURIComponent(next)}`));
  }

  redirect(await moxiePath(next));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(await moxiePath("/"));
}
