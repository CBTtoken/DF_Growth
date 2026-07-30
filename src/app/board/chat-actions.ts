"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentVisitor, resolveVisitor } from "@/lib/board/visitor";
import { sendChatMessage } from "@/lib/board/chat";
import { isRateLimited, clientIpFromHeaders } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { stripEmDashes } from "@/lib/text";
import { z } from "zod";

// Messaging a business, in one step.
//
// Name, email and the message, all on the same screen, and it sends. The
// email is not verified and is not asked for twice: it is where the reply
// goes, and a made-up one means no reply. That is the whole check.

const messageSchema = z.object({
  displayName: z.string().trim().min(2, "Enter your name").max(40),
  email: z.string().trim().toLowerCase().email("We need a real email address to send you their reply"),
  body: z.string().trim().min(2, "Write your message first").max(2000, "That is longer than a first message needs to be"),
});

export type SendMessageState = { error?: string; sent?: boolean } | null;

export async function sendPublicMessage(
  growthClientId: string,
  postId: string | null,
  _prevState: SendMessageState,
  formData: FormData
): Promise<SendMessageState> {
  const ip = clientIpFromHeaders(await headers());
  if (isRateLimited(`board-chat:${ip}`, 20, 10 * 60 * 1000)) {
    return { error: "That is a lot of messages in a short time. Give it a few minutes." };
  }

  const existing = await currentVisitor();

  const parsed = messageSchema.safeParse({
    // Somebody who has already commented on this device does not get asked
    // again: their name and address come from the identity they already
    // have, and the form only shows the message box.
    displayName: formData.get("displayName") || existing?.displayName,
    email: formData.get("email") || existing?.email,
    body: formData.get("body"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Only a first-time sender has to pass the bot check. A returning one
  // already did.
  if (!existing) {
    const turnstileOk = await verifyTurnstileToken(String(formData.get("turnstileToken") ?? ""), ip);
    if (!turnstileOk) {
      return { error: "Could not confirm you are a person, please reload the page and try again." };
    }
  }

  const resolved = await resolveVisitor({ displayName: parsed.data.displayName, email: parsed.data.email });
  if ("error" in resolved) return { error: resolved.error };

  const result = await sendChatMessage({
    growthClientId,
    identityId: resolved.visitor.id,
    sender: "public",
    body: stripEmDashes(parsed.data.body),
    openingPostId: postId,
  });

  if ("error" in result) return { error: result.error };

  revalidatePath("/board/messages");
  return { sent: true };
}

/** The person replying inside their own thread. */
export async function replyAsPublic(threadId: string, _prevState: SendMessageState, formData: FormData): Promise<SendMessageState> {
  const visitor = await currentVisitor();
  if (!visitor) return { error: "Open this from the link in your email to reply." };

  const body = stripEmDashes(String(formData.get("body") ?? "").trim());
  if (body.length < 2) return { error: "Write your message first." };

  const admin = createAdminClient();
  const { data: thread } = await admin
    .from("board_threads")
    .select("growth_client_id, opening_post_id")
    .eq("id", threadId)
    // Scoped to the caller's own identity, so a thread id from a form can
    // never be used to write into somebody else's conversation.
    .eq("identity_id", visitor.id)
    .maybeSingle();

  if (!thread) return { error: "That conversation is no longer available." };

  const result = await sendChatMessage({
    growthClientId: thread.growth_client_id,
    identityId: visitor.id,
    sender: "public",
    body,
    openingPostId: thread.opening_post_id,
  });

  if ("error" in result) return { error: result.error };

  revalidatePath("/board/messages");
  return { sent: true };
}
