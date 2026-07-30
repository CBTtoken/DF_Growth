"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentVisitor, resolveVisitor } from "@/lib/board/visitor";
import { autoRuleForNewComment, applyReportRules } from "@/lib/board/moderation";
import { isRateLimited, clientIpFromHeaders } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { hashIp } from "@/lib/reviews/fraud-signals";
import { stripEmDashes } from "@/lib/text";
import { z } from "zod";

// Everything the public can do, with nobody ever leaving the screen.
//
// The emailed code is gone. What proves a human is the invisible Cloudflare
// check that was already here, plus rate limiting. What makes somebody
// contactable, and blockable, is an email address they type once and never
// have to prove. A made-up address costs them their replies and costs us
// nothing.

const commentSchema = z.object({
  displayName: z.string().trim().min(2, "Enter your name").max(40, "Keep it under 40 characters"),
  body: z.string().trim().min(2, "Write something first").max(1000, "Keep it under 1000 characters"),
  email: z.string().trim().toLowerCase().email("That email does not look right").optional().or(z.literal("")),
  quoteConsent: z.boolean().default(false),
});

export type CommentState = { error?: string; success?: boolean; held?: boolean } | null;

/**
 * A comment, posted immediately.
 *
 * No code, no wait, no second screen. Held only when an automatic rule says
 * so, which today means a link in the body, and the person is told which
 * happened either way.
 */
export async function submitComment(
  postSlug: string,
  /** Set when this is a reply rather than a new comment. */
  parentCommentId: string | null,
  _prevState: CommentState,
  formData: FormData
): Promise<CommentState> {
  const h = await headers();
  const ip = clientIpFromHeaders(h);

  if (isRateLimited(`board-comment:${ip}`, 8, 10 * 60 * 1000)) {
    return { error: "That is a lot of comments in a short time. Give it a few minutes." };
  }

  const parsed = commentSchema.safeParse({
    displayName: formData.get("displayName"),
    body: formData.get("body"),
    email: formData.get("email") ?? "",
    quoteConsent: formData.get("quoteConsent") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const turnstileOk = await verifyTurnstileToken(String(formData.get("turnstileToken") ?? ""), ip);
  if (!turnstileOk) {
    return { error: "Could not confirm you are a person, please reload the page and try again." };
  }

  const admin = createAdminClient();
  const { data: post } = await admin
    .from("board_posts")
    .select("id, slug")
    .eq("slug", postSlug)
    .eq("status", "published")
    .maybeSingle();

  if (!post) return { error: "That post is no longer available." };

  const resolved = await resolveVisitor({
    displayName: parsed.data.displayName,
    email: parsed.data.email || null,
    quoteConsent: parsed.data.quoteConsent,
  });
  if ("error" in resolved) return { error: resolved.error };

  const body = stripEmDashes(parsed.data.body);
  const auto = autoRuleForNewComment(body);

  // A reply has to belong to a comment on this same post. Checked rather
  // than trusted, since the id arrives from a form.
  let parentId: string | null = null;
  if (parentCommentId) {
    const { data: parent } = await admin
      .from("board_comments")
      .select("id, parent_comment_id")
      .eq("id", parentCommentId)
      .eq("post_id", post.id)
      .eq("status", "published")
      .maybeSingle();
    // Replying to a reply attaches to the same parent rather than starting
    // a third level nobody can read.
    parentId = parent ? parent.parent_comment_id ?? parent.id : null;
  }

  const { error } = await admin.from("board_comments").insert({
    post_id: post.id,
    identity_id: resolved.visitor.id,
    parent_comment_id: parentId,
    body,
    status: auto ? "held" : "published",
    held_reason: auto?.reason ?? null,
    ip_fingerprint: hashIp(ip),
  });

  if (error) return { error: "Could not post that, please try again." };

  if (!auto) revalidatePath(`/board/post/${post.slug}`);
  return { success: true, held: Boolean(auto) };
}

export type LikeState = { liked?: boolean; error?: string } | null;

/**
 * One tap, nothing asked.
 *
 * A like from somebody with no identity yet creates a nameless one on the
 * spot, which exists only to stop the same device counting twice. Asking
 * for a name before somebody may tap a heart would be the same mistake as
 * the code, in miniature.
 */
export async function toggleLike(postSlug: string): Promise<LikeState> {
  const ip = clientIpFromHeaders(await headers());
  if (isRateLimited(`board-like:${ip}`, 60, 10 * 60 * 1000)) {
    return { error: "Too many taps, give it a minute." };
  }

  const admin = createAdminClient();
  const { data: post } = await admin
    .from("board_posts")
    .select("id")
    .eq("slug", postSlug)
    .eq("status", "published")
    .maybeSingle();

  if (!post) return { error: "That post is no longer available." };

  let visitor = await currentVisitor();
  if (!visitor) {
    // Nameless on purpose. This identity exists only to stop the same
    // device counting twice, and the placeholder must never end up as the
    // author of a post or a comment, so anything that shows a name asks
    // for one.
    const resolved = await resolveVisitor({ displayName: "Someone" });
    if ("error" in resolved) return { error: resolved.error };
    visitor = resolved.visitor;
  }

  const { data: existing } = await admin
    .from("board_likes")
    .select("post_id")
    .eq("post_id", post.id)
    .eq("identity_id", visitor.id)
    .maybeSingle();

  if (existing) {
    await admin.from("board_likes").delete().eq("post_id", post.id).eq("identity_id", visitor.id);
    revalidatePath(`/board/post/${postSlug}`);
    return { liked: false };
  }

  await admin.from("board_likes").insert({ post_id: post.id, identity_id: visitor.id });
  revalidatePath(`/board/post/${postSlug}`);
  return { liked: true };
}

export type ReportState = { error?: string; success?: boolean } | null;

/**
 * Reporting, open to anyone, verified or not.
 *
 * A report only ever queues work for a person. An unverified one cannot
 * take anything down on its own, which is what stops this being a tool for
 * whoever dislikes a business the most.
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
  const visitor = await currentVisitor();
  const admin = createAdminClient();

  await admin.from("board_reports").insert({
    target_type: targetType,
    target_id: targetId,
    reported_by_identity_id: visitor?.id ?? null,
    reason: reason || null,
  });

  if (targetType === "comment") {
    const { held } = await applyReportRules(targetId);
    if (held) revalidatePath(`/board/post/${postSlug}`);
  }

  return { success: true };
}
