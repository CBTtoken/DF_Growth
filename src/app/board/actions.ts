"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { boardCommentSchema, boardOtpSchema } from "@/lib/schemas/board-engagement";
import { currentBoardIdentity } from "@/lib/board/engagement";
import { findAuthUserByEmail } from "@/lib/board/identity";
import { autoRuleForNewComment, applyReportRules, logModeration } from "@/lib/board/moderation";
import { isRateLimited, clientIpFromHeaders } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { hashIp } from "@/lib/reviews/fraud-signals";
import { stripEmDashes } from "@/lib/text";

// The Board, Phase 2. Everything the public can do, and nothing more.
//
// The shape of the identity here is the thing to understand before changing
// any of it. A person proves an email with a code. There is no password, no
// profile and no login screen, and the auth record exists only to hold the
// proof that the address was verified. Section 6 of the handoff puts real
// public accounts in Phase 3, behind the data retention decision, and this
// deliberately stops short of that line.

export type CommentState =
  | { error?: Record<string, string[]> & { _form?: string[] } }
  | { needsCode: true; email: string }
  | { success: true; held: boolean }
  | null;

/**
 * Writes a comment, and starts email verification when the person has not
 * verified before.
 *
 * A returning visitor with a session posts immediately. A new one has the
 * comment stored out of sight, gets a code, and the comment appears the
 * moment the code is entered. That ordering matters: asking someone to
 * verify first and then write again is how you lose the comment.
 */
export async function submitComment(postSlug: string, _prevState: CommentState, formData: FormData): Promise<CommentState> {
  const h = await headers();
  const ip = clientIpFromHeaders(h);

  if (isRateLimited(`board-comment:${ip}`, 8, 10 * 60 * 1000)) {
    return { error: { _form: ["That is a lot of comments in a short time. Give it a few minutes."] } };
  }

  const parsed = boardCommentSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    body: formData.get("body"),
    quoteConsent: formData.get("quoteConsent") === "on",
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const turnstileOk = await verifyTurnstileToken(String(formData.get("turnstileToken") ?? ""), ip);
  if (!turnstileOk) {
    return { error: { _form: ["Verification failed, please reload the page and try again."] } };
  }

  const admin = createAdminClient();
  const { data: post } = await admin
    .from("board_posts")
    .select("id, slug, growth_client_id")
    .eq("slug", postSlug)
    .eq("status", "published")
    .maybeSingle();

  if (!post) return { error: { _form: ["That post is no longer available."] } };

  const body = stripEmDashes(parsed.data.body);
  const auto = autoRuleForNewComment(body);
  const ipFingerprint = hashIp(ip);

  // Already verified, in this browser: straight in.
  const existing = await currentBoardIdentity();
  if (existing) {
    const { error } = await admin.from("board_comments").insert({
      post_id: post.id,
      identity_id: existing.id,
      body,
      status: auto ? "held" : "published",
      held_reason: auto?.reason ?? null,
      ip_fingerprint: ipFingerprint,
    });
    if (error) return { error: { _form: ["Could not post that, please try again."] } };

    if (!auto) revalidatePath(`/board/post/${post.slug}`);
    return { success: true, held: Boolean(auto) };
  }

  // New person. shouldCreateUser creates the unconfirmed auth record and
  // sends the code in one call, the same mechanism the review flow uses
  // after a link-based confirmation proved unusable: several mail providers
  // scan incoming links and consume a single-use token before the recipient
  // ever clicks it. A typed code has nothing for a scanner to consume.
  const supabase = await createClient();
  const { error: otpError } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { shouldCreateUser: true },
  });

  if (otpError) {
    console.error("Board OTP send failed", otpError);
    return { error: { _form: ["Could not send the code. Check the address and try again."] } };
  }

  const user = await findAuthUserByEmail(parsed.data.email);
  if (!user) {
    return { error: { _form: ["Could not start verification, please try again."] } };
  }

  // upsert on user_id: somebody who verified before, on another device, has
  // an identity already, and a second comment must not create a second one.
  const { data: identity, error: identityError } = await admin
    .from("board_identities")
    .upsert(
      {
        user_id: user.id,
        email: parsed.data.email,
        display_name: parsed.data.displayName,
        quote_consent: parsed.data.quoteConsent,
      },
      { onConflict: "user_id" }
    )
    .select("id")
    .single();

  if (identityError || !identity) {
    console.error("Board identity upsert failed", identityError);
    return { error: { _form: ["Could not start verification, please try again."] } };
  }

  const { error: commentError } = await admin.from("board_comments").insert({
    post_id: post.id,
    identity_id: identity.id,
    body,
    status: "pending_verification",
    held_reason: auto?.reason ?? null,
    ip_fingerprint: ipFingerprint,
  });

  if (commentError) return { error: { _form: ["Could not save that, please try again."] } };

  return { needsCode: true, email: parsed.data.email };
}

export type OtpState = { error?: string; success?: boolean; held?: boolean } | null;

/**
 * Enters the code, which both verifies the address and publishes whatever
 * was waiting on it.
 *
 * verifyOtp establishes the session cookie as part of this same request, so
 * there is no redirect, no hash fragment and no separate finish page.
 */
export async function verifyBoardOtp(postSlug: string, _prevState: OtpState, formData: FormData): Promise<OtpState> {
  const ip = clientIpFromHeaders(await headers());
  if (isRateLimited(`board-otp:${ip}`, 10, 10 * 60 * 1000)) {
    return { error: "Too many attempts, please wait a few minutes and try again." };
  }

  const parsed = boardOtpSchema.safeParse({ email: formData.get("email"), token: formData.get("token") });
  if (!parsed.success) return { error: "Enter the code from your email." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email: parsed.data.email,
    token: parsed.data.token,
    type: "email",
  });

  if (error || !data.user) {
    return { error: "That code is incorrect or has expired. Check your email for the latest one." };
  }

  const admin = createAdminClient();
  const { data: identity } = await admin
    .from("board_identities")
    .update({ verified_at: new Date().toISOString() })
    .eq("user_id", data.user.id)
    .select("id")
    .maybeSingle();

  if (!identity) return { error: "Something went wrong, please try again." };

  // Anything held by a rule at submission stays held. Only the plainly fine
  // ones go live, and the person is told which happened.
  const { data: published } = await admin
    .from("board_comments")
    .update({ status: "published", updated_at: new Date().toISOString() })
    .eq("identity_id", identity.id)
    .eq("status", "pending_verification")
    .is("held_reason", null)
    .select("id");

  const { data: heldOnes } = await admin
    .from("board_comments")
    .update({ status: "held", updated_at: new Date().toISOString() })
    .eq("identity_id", identity.id)
    .eq("status", "pending_verification")
    .not("held_reason", "is", null)
    .select("id, held_reason");

  for (const comment of published ?? []) {
    await logModeration({
      targetType: "comment",
      targetId: comment.id,
      action: "published",
      rule: "email verified",
      actor: { kind: "system" },
    });
  }
  for (const comment of heldOnes ?? []) {
    await logModeration({
      targetType: "comment",
      targetId: comment.id,
      action: "held",
      rule: comment.held_reason ?? "automatic rule",
      actor: { kind: "system" },
    });
  }

  revalidatePath(`/board/post/${postSlug}`);
  return { success: true, held: (heldOnes?.length ?? 0) > 0 && (published?.length ?? 0) === 0 };
}

export type LikeState = { needsIdentity?: boolean; liked?: boolean; error?: string } | null;

/** One tap on or off. Requires a verified identity, same as a comment. */
export async function toggleLike(postSlug: string): Promise<LikeState> {
  const identity = await currentBoardIdentity();
  if (!identity) return { needsIdentity: true };

  const admin = createAdminClient();
  const { data: post } = await admin
    .from("board_posts")
    .select("id")
    .eq("slug", postSlug)
    .eq("status", "published")
    .maybeSingle();

  if (!post) return { error: "That post is no longer available." };

  const { data: existing } = await admin
    .from("board_likes")
    .select("post_id")
    .eq("post_id", post.id)
    .eq("identity_id", identity.id)
    .maybeSingle();

  if (existing) {
    await admin.from("board_likes").delete().eq("post_id", post.id).eq("identity_id", identity.id);
    revalidatePath(`/board/post/${postSlug}`);
    return { liked: false };
  }

  await admin.from("board_likes").insert({ post_id: post.id, identity_id: identity.id });
  revalidatePath(`/board/post/${postSlug}`);
  return { liked: true };
}

export type ReportState = { error?: string; success?: boolean } | null;

/**
 * Reporting a comment or a post. Open to anyone, verified or not.
 *
 * Never gated behind verification. Something genuinely bad needs to be
 * reportable by whoever happens to see it, and a report only ever queues
 * work for a person. An unverified report cannot take anything down on its
 * own, which is what stops this being a tool for whoever dislikes a
 * business the most.
 */
export async function reportContent(
  targetType: "post" | "comment",
  targetId: string,
  postSlug: string,
  _prevState: ReportState,
  formData: FormData
): Promise<ReportState> {
  const ip = clientIpFromHeaders(await headers());
  if (isRateLimited(`board-report:${ip}`, 5, 10 * 60 * 1000)) {
    return { error: "Too many reports, please wait a few minutes and try again." };
  }

  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);
  const identity = await currentBoardIdentity();
  const admin = createAdminClient();

  await admin.from("board_reports").insert({
    target_type: targetType,
    target_id: targetId,
    reported_by_identity_id: identity?.id ?? null,
    reason: reason || null,
  });

  if (targetType === "comment") {
    const { held } = await applyReportRules(targetId);
    if (held) revalidatePath(`/board/post/${postSlug}`);
  }

  // Same answer either way, rather than telling a reporter whether their
  // report was the one that tipped it.
  return { success: true };
}
