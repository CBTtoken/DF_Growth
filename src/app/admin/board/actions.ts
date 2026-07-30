"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminEmail } from "@/lib/auth/require-admin";
import { logModeration } from "@/lib/board/moderation";

// The human half of the split. Everything here is a decision a rule
// refused to make, and every one of them is logged with who made it.

async function decide(commentId: string, outcome: "published" | "removed", note?: string) {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) return;

  const admin = createAdminClient();
  const { data: comment } = await admin
    .from("board_comments")
    .update({
      status: outcome,
      held_reason: outcome === "published" ? null : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", commentId)
    .select("id, board_posts!inner(slug)")
    .maybeSingle();

  if (!comment) return;

  // The reports that asked the question are answered by the same decision,
  // rather than being left open forever behind a comment that has already
  // been dealt with.
  await admin
    .from("board_reports")
    .update({ status: outcome === "removed" ? "upheld" : "rejected" })
    .eq("target_type", "comment")
    .eq("target_id", commentId)
    .eq("status", "open");

  await logModeration({
    targetType: "comment",
    targetId: commentId,
    action: outcome === "published" ? "restored" : "removed",
    rule: "admin decision",
    actor: { kind: "admin", email: admin_.email },
    note,
  });

  const slug = (comment as unknown as { board_posts: { slug: string } }).board_posts.slug;
  revalidatePath(`/board/post/${slug}`);
  revalidatePath("/admin/board");
  revalidatePath("/dashboard/board");
}

/** Puts a held comment back in public. */
export async function restoreComment(commentId: string): Promise<void> {
  await decide(commentId, "published");
}

/** Ends it. The row stays, so the log still points at something. */
export async function removeComment(commentId: string): Promise<void> {
  await decide(commentId, "removed");
}

/**
 * A report about a post rather than a comment.
 *
 * Taking a member's own post down is a heavier act than removing a stranger's
 * comment about it, so the only automatic part is that it reaches this queue.
 */
export async function hidePost(postId: string): Promise<void> {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) return;

  const admin = createAdminClient();
  const { data: post } = await admin
    .from("board_posts")
    .update({ status: "removed", updated_at: new Date().toISOString() })
    .eq("id", postId)
    .select("slug")
    .maybeSingle();

  await admin
    .from("board_reports")
    .update({ status: "upheld" })
    .eq("target_type", "post")
    .eq("target_id", postId)
    .eq("status", "open");

  await logModeration({
    targetType: "post",
    targetId: postId,
    action: "removed",
    rule: "admin decision",
    actor: { kind: "admin", email: admin_.email },
  });

  if (post?.slug) revalidatePath(`/board/post/${post.slug}`);
  revalidatePath("/board");
  revalidatePath("/admin/board");
}

/** The report was wrong, or the post is fine. Closes it without touching the post. */
export async function dismissPostReports(postId: string): Promise<void> {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) return;

  const admin = createAdminClient();
  await admin
    .from("board_reports")
    .update({ status: "rejected" })
    .eq("target_type", "post")
    .eq("target_id", postId)
    .eq("status", "open");

  await logModeration({
    targetType: "post",
    targetId: postId,
    action: "restored",
    rule: "admin decision",
    actor: { kind: "admin", email: admin_.email },
    note: "Reports dismissed, post left up",
  });

  revalidatePath("/admin/board");
}
