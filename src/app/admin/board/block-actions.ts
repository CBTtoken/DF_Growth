"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminEmail } from "@/lib/auth/require-admin";
import { logModeration } from "@/lib/board/moderation";

// Blocking a person, which is what the email address was collected for.
//
// Dewald's own reasoning when we agreed to store it: "think of spam or these
// people coming with these scams and schemes". A report deals with one
// message. A block deals with the person.
//
// What blocking does, exactly, so nobody has to guess: everything they have
// written goes out of public view, and nothing they write later appears.
// currentVisitor returns null for a blocked identity, so they are treated
// like a stranger rather than being told they are blocked, which is what
// stops them simply making a second one immediately.

export async function blockIdentity(identityId: string, reason: string): Promise<void> {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) return;

  const admin = createAdminClient();
  const { data: identity } = await admin
    .from("board_identities")
    .update({ blocked_at: new Date().toISOString(), blocked_reason: reason || "Blocked by an administrator" })
    .eq("id", identityId)
    .select("id, display_name, email")
    .maybeSingle();

  if (!identity) return;

  // Their comments come down.
  const { data: comments } = await admin
    .from("board_comments")
    .update({ status: "removed", updated_at: new Date().toISOString() })
    .eq("identity_id", identityId)
    .in("status", ["published", "held", "pending_verification"])
    .select("id, board_posts!inner(slug)");

  // And their posts.
  const { data: posts } = await admin
    .from("board_posts")
    .update({ status: "removed", updated_at: new Date().toISOString() })
    .eq("identity_id", identityId)
    .eq("status", "published")
    .select("id, slug");

  for (const comment of comments ?? []) {
    await logModeration({
      targetType: "comment",
      targetId: comment.id,
      action: "removed",
      rule: "author blocked",
      actor: { kind: "admin", email: admin_.email },
      note: reason || undefined,
    });
    const slug = (comment as unknown as { board_posts: { slug: string } }).board_posts?.slug;
    if (slug) revalidatePath(`/board/post/${slug}`);
  }

  for (const post of posts ?? []) {
    await logModeration({
      targetType: "post",
      targetId: post.id,
      action: "removed",
      rule: "author blocked",
      actor: { kind: "admin", email: admin_.email },
      note: reason || undefined,
    });
    revalidatePath(`/board/post/${post.slug}`);
  }

  revalidatePath("/board");
  revalidatePath("/admin/board");
}

/** Undoing it. Their old content stays down, because removal was a separate decision. */
export async function unblockIdentity(identityId: string): Promise<void> {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) return;

  const admin = createAdminClient();
  await admin
    .from("board_identities")
    .update({ blocked_at: null, blocked_reason: null })
    .eq("id", identityId);

  revalidatePath("/admin/board");
}

/** The form on the moderation queue. */
export async function blockFromForm(identityId: string, formData: FormData): Promise<void> {
  await blockIdentity(identityId, String(formData.get("reason") ?? "").trim().slice(0, 300));
}
