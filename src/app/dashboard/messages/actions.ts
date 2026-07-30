"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireGrowthClientId } from "@/lib/auth/require-growth-client";
import { sendChatMessage } from "@/lib/board/chat";
import { stripEmDashes } from "@/lib/text";

type ReplyState = { error?: string; sent?: boolean } | null;

/** The business replying. Scoped to its own threads. */
export async function replyAsMember(threadId: string, _prevState: ReplyState, formData: FormData): Promise<ReplyState> {
  const client = await requireGrowthClientId();
  if (client.error || !client.id) return { error: "Please log in again." };
  const clientId = client.id;

  const body = stripEmDashes(String(formData.get("body") ?? "").trim());
  if (body.length < 2) return { error: "Write your reply first." };

  const admin = createAdminClient();
  const { data: thread } = await admin
    .from("board_threads")
    .select("identity_id, opening_post_id")
    .eq("id", threadId)
    .eq("growth_client_id", clientId)
    .maybeSingle();

  if (!thread) return { error: "That conversation is no longer available." };

  const result = await sendChatMessage({
    growthClientId: clientId,
    identityId: thread.identity_id,
    sender: "member",
    body,
    openingPostId: thread.opening_post_id,
  });

  if ("error" in result) return { error: result.error };

  revalidatePath("/dashboard/messages");
  return { sent: true };
}

/**
 * The member's own switch for in-app chat.
 *
 * Section 6: "Member controls whether he accepts in-app chat at all." Off
 * removes the Message button from his posts and refuses new messages, and
 * leaves his WhatsApp button exactly where it was. Existing conversations
 * stay readable, because going quiet on somebody mid-conversation is worse
 * than never having offered.
 */
export async function setChatEnabled(enabled: boolean): Promise<void> {
  const client = await requireGrowthClientId();
  if (client.error || !client.id) return;
  const clientId = client.id;

  const admin = createAdminClient();
  const { data: updated } = await admin
    .from("growth_clients")
    .update({ chat_enabled: enabled })
    .eq("id", clientId)
    .select("slug")
    .maybeSingle();

  revalidatePath("/dashboard/messages");
  // Every post page shows or hides the button based on this, and they are
  // statically cached, so they have to be refreshed rather than waiting out
  // the revalidate window.
  const { data: posts } = await admin.from("board_posts").select("slug").eq("growth_client_id", clientId);
  for (const post of posts ?? []) {
    revalidatePath(`/board/post/${post.slug}`);
  }
  if (updated?.slug) revalidatePath(`/${updated.slug}`);
}
