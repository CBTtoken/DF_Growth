"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentBoardIdentity } from "@/lib/board/engagement";
import { findAuthUserByEmail } from "@/lib/board/identity";
import { sendChatMessage } from "@/lib/board/chat";
import { isRateLimited, clientIpFromHeaders } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { stripEmDashes } from "@/lib/text";
import { z } from "zod";

// Growth Chat, the public half.
//
// Verification comes first here, unlike a comment. A comment is written and
// held until the code arrives, because losing what somebody typed is worse
// than showing it late. A message is different: an unverified message
// sitting in a member's inbox from somebody who never finished verifying is
// noise he cannot act on, so nothing is stored until the person is real.
// The message text waits in the browser for the half minute that takes.

const identitySchema = z.object({
  displayName: z.string().trim().min(2, "Enter your name").max(40),
  email: z.string().trim().toLowerCase().email("Enter a real email address"),
});

export type ChatIdentityState = { error?: string; needsCode?: boolean; email?: string } | null;

/** Sends the code, with no message attached yet. */
export async function requestBoardCode(_prevState: ChatIdentityState, formData: FormData): Promise<ChatIdentityState> {
  const ip = clientIpFromHeaders(await headers());
  if (isRateLimited(`board-code:${ip}`, 6, 10 * 60 * 1000)) {
    return { error: "Too many attempts, please wait a few minutes and try again." };
  }

  const parsed = identitySchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const turnstileOk = await verifyTurnstileToken(String(formData.get("turnstileToken") ?? ""), ip);
  if (!turnstileOk) return { error: "Verification failed, please reload the page and try again." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { shouldCreateUser: true },
  });
  if (error) {
    console.error("Board chat OTP send failed", error);
    return { error: "Could not send the code. Check the address and try again." };
  }

  const user = await findAuthUserByEmail(parsed.data.email);
  if (!user) return { error: "Could not start verification, please try again." };

  const admin = createAdminClient();
  const { error: identityError } = await admin.from("board_identities").upsert(
    {
      user_id: user.id,
      email: parsed.data.email,
      display_name: parsed.data.displayName,
    },
    { onConflict: "user_id" }
  );

  if (identityError) {
    console.error("Board identity upsert failed", identityError);
    return { error: "Could not start verification, please try again." };
  }

  return { needsCode: true, email: parsed.data.email };
}

export type SendMessageState = { error?: string; needsIdentity?: boolean; sent?: boolean } | null;

/** A member of the public messaging a business. */
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

  const body = stripEmDashes(String(formData.get("body") ?? "").trim());
  if (body.length < 2) return { error: "Write your message first." };
  if (body.length > 2000) return { error: "That is longer than a first message needs to be." };

  const identity = await currentBoardIdentity();
  if (!identity) return { needsIdentity: true };

  const result = await sendChatMessage({
    growthClientId,
    identityId: identity.id,
    sender: "public",
    body,
    openingPostId: postId,
  });

  if ("error" in result) return { error: result.error };

  revalidatePath("/board/messages");
  return { sent: true };
}

/** The person replying inside their own thread. */
export async function replyAsPublic(threadId: string, _prevState: SendMessageState, formData: FormData): Promise<SendMessageState> {
  const identity = await currentBoardIdentity();
  if (!identity) return { needsIdentity: true };

  const body = stripEmDashes(String(formData.get("body") ?? "").trim());
  if (body.length < 2) return { error: "Write your message first." };

  const admin = createAdminClient();
  const { data: thread } = await admin
    .from("board_threads")
    .select("growth_client_id, identity_id, opening_post_id")
    .eq("id", threadId)
    // Scoped to the caller's own identity, so a thread id from a form can
    // never be used to write into somebody else's conversation.
    .eq("identity_id", identity.id)
    .maybeSingle();

  if (!thread) return { error: "That conversation is no longer available." };

  const result = await sendChatMessage({
    growthClientId: thread.growth_client_id,
    identityId: identity.id,
    sender: "public",
    body,
    openingPostId: thread.opening_post_id,
  });

  if ("error" in result) return { error: result.error };

  revalidatePath("/board/messages");
  return { sent: true };
}
