"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { moxiePath, MOXIE_ORIGIN } from "@/lib/moxie/host";
import { sendEmail } from "@/lib/email/resend";

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
    // Owner analytics, 3 August 2026: marks this account as a Moxie reader
    // so the funnel can count "signed up but never paid" honestly. Only
    // accounts created from here carry it, so the dashboard says the count
    // starts from this date rather than pretending to know the past.
    user_metadata: { moxie_reader: true, moxie_reader_since: new Date().toISOString() },
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

  // Only a genuinely new account gets the welcome treatment. An existing
  // reader who used the join form again just signs in and carries on.
  const isNew = !createError;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(await moxiePath(`/login?error=exists&next=${encodeURIComponent(next)}`));
  }

  if (isNew) {
    // Dewald, 3 August: registered as a new reader and got no thank you and
    // no email, which read as the whole flow being broken. The account was
    // fine; the silence was the bug. The email is best effort and never
    // blocks the signup: the reader is already signed in either way.
    const { ok, error: mailError } = await sendEmail({
      to: email,
      subject: "Welcome to Moxie",
      fromName: "Moxie Magazine",
      replyTo: "editor@moxiemag.co.za",
      html: `
        <p style="font-size:15px;line-height:1.65;color:#1f2937;margin:0 0 16px;">Good day,</p>
        <p style="font-size:15px;line-height:1.65;color:#1f2937;margin:0 0 16px;">
          Your Moxie reader account is ready. Moxie is South Africa's family discovery magazine:
          science, nature, history, travel, food and puzzles, written for curious minds aged 8 to 80,
          with a new edition on the 1st of every month.
        </p>
        <p style="font-size:15px;line-height:1.65;color:#1f2937;margin:0 0 16px;">
          As a signed-in reader you can open any edition once it reaches the free window.
          Members read every edition the day it comes out, for R49 a month.
        </p>
        <p style="margin:24px 0;">
          <a href="${MOXIE_ORIGIN}/editions" style="display:inline-block;background:#c85a1e;color:#ffffff;font-size:15px;font-weight:700;padding:13px 26px;text-decoration:none;">Browse the editions</a>
        </p>
        <p style="font-size:15px;line-height:1.65;color:#1f2937;margin:0;">Have the Moxie.<br />The Moxie team</p>
      `,
    });
    if (!ok) console.error("Moxie welcome email failed", mailError);

    redirect(await moxiePath(`/welcome?joined=1&next=${encodeURIComponent(next)}`));
  }

  redirect(await moxiePath(next));
}

/**
 * A signed-in person changes their own password.
 *
 * Dewald, 3 August: "admin users can't change their passwords". True of
 * every reader, actually, since team accounts arrive with a password
 * somebody else typed. Lives on the account page for exactly that reason.
 *
 * The current password is asked for and verified first. A session alone
 * would technically satisfy Supabase, but a laptop left open should not be
 * enough to quietly take over an account.
 */
export async function changePassword(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect(await moxiePath("/login?next=/account"));

  const current = String(formData.get("current") ?? "");
  const fresh = String(formData.get("fresh") ?? "");
  const again = String(formData.get("again") ?? "");

  if (fresh.length < 8) redirect(await moxiePath("/account?password=weak"));
  if (fresh !== again) redirect(await moxiePath("/account?password=mismatch"));

  const { error: wrongCurrent } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: current,
  });
  if (wrongCurrent) redirect(await moxiePath("/account?password=wrong"));

  const { error } = await supabase.auth.updateUser({ password: fresh });
  if (error) {
    console.error("Password change failed", error);
    redirect(await moxiePath("/account?password=failed"));
  }

  redirect(await moxiePath("/account?password=changed"));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(await moxiePath("/"));
}
