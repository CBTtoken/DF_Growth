import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { truncateOnWord } from "@/lib/text";
import { identityToken } from "@/lib/board/visitor";

// Growth Chat. Reads, and the one place a message is written.
//
// The rule that shapes all of it: a message must reach the other person
// even when they are not looking at the site. Nobody sits on a page waiting
// for a reply, so every message sends one email to the other side, and the
// email carries enough to answer from. A chat product without that is a
// page where two people leave notes for nobody.

export type ChatMessage = {
  id: string;
  sender: "public" | "member";
  body: string;
  createdAt: string;
  readAt: string | null;
};

export type ChatThread = {
  id: string;
  growthClientId: string;
  identityId: string;
  businessName: string;
  businessSlug: string;
  personName: string;
  lastMessageAt: string;
  unread: number;
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://growth.digitalflyersa.co.za";

/** The member's threads, newest activity first, with what they have not read. */
export async function listMemberThreads(growthClientId: string): Promise<ChatThread[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("board_threads")
    .select("id, growth_client_id, identity_id, last_message_at, board_identities!inner(display_name), growth_clients!inner(business_name, slug)")
    .eq("growth_client_id", growthClientId)
    .order("last_message_at", { ascending: false });

  return decorateThreads(data ?? [], "member");
}

/** The person's threads. Same shape, counted from the other side. */
export async function listIdentityThreads(identityId: string): Promise<ChatThread[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("board_threads")
    .select("id, growth_client_id, identity_id, last_message_at, board_identities!inner(display_name), growth_clients!inner(business_name, slug)")
    .eq("identity_id", identityId)
    .order("last_message_at", { ascending: false });

  return decorateThreads(data ?? [], "public");
}

type ThreadRow = {
  id: string;
  growth_client_id: string;
  identity_id: string;
  last_message_at: string;
  board_identities: { display_name: string };
  growth_clients: { business_name: string; slug: string };
};

async function decorateThreads(rows: unknown[], side: "public" | "member"): Promise<ChatThread[]> {
  const threads = rows as ThreadRow[];
  if (threads.length === 0) return [];

  // Unread means messages from the other side that this side has not read.
  const admin = createAdminClient();
  const { data: unreadRows } = await admin
    .from("board_messages")
    .select("thread_id")
    .in(
      "thread_id",
      threads.map((t) => t.id)
    )
    .eq("sender", side === "member" ? "public" : "member")
    .is("read_at", null);

  const unreadByThread = new Map<string, number>();
  for (const row of unreadRows ?? []) {
    unreadByThread.set(row.thread_id, (unreadByThread.get(row.thread_id) ?? 0) + 1);
  }

  return threads.map((thread) => ({
    id: thread.id,
    growthClientId: thread.growth_client_id,
    identityId: thread.identity_id,
    businessName: thread.growth_clients.business_name,
    businessSlug: thread.growth_clients.slug,
    personName: thread.board_identities.display_name,
    lastMessageAt: thread.last_message_at,
    unread: unreadByThread.get(thread.id) ?? 0,
  }));
}

/** Every message in a thread, and marks the other side's messages read. */
export async function readThread(threadId: string, side: "public" | "member"): Promise<ChatMessage[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("board_messages")
    .select("id, sender, body, created_at, read_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  const fromOtherSide = side === "member" ? "public" : "member";
  await admin
    .from("board_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("thread_id", threadId)
    .eq("sender", fromOtherSide)
    .is("read_at", null);

  return (data ?? []).map((row) => ({
    id: row.id,
    sender: row.sender as "public" | "member",
    body: row.body,
    createdAt: row.created_at,
    readAt: row.read_at,
  }));
}

/**
 * Writes a message, creating the thread if this is the first one, and
 * notifies the other side by email.
 *
 * The notification is deliberately not fire-and-forget silent: a failure is
 * logged, but it never fails the message itself. Somebody pressing send and
 * seeing an error because an email provider hiccupped would retype it and
 * send twice.
 */
export async function sendChatMessage(options: {
  growthClientId: string;
  identityId: string;
  sender: "public" | "member";
  body: string;
  openingPostId?: string | null;
}): Promise<{ threadId: string } | { error: string }> {
  const { growthClientId, identityId, sender, body, openingPostId } = options;
  const admin = createAdminClient();

  const [{ data: client }, { data: identity }] = await Promise.all([
    admin
      .from("growth_clients")
      .select("business_name, slug, contact_email, chat_enabled")
      .eq("id", growthClientId)
      .maybeSingle(),
    admin.from("board_identities").select("id, display_name, email").eq("id", identityId).maybeSingle(),
  ]);

  if (!client || !identity) return { error: "That conversation is no longer available." };

  // The member's switch. Checked on every write rather than only when the
  // button is drawn, so turning it off closes the door immediately rather
  // than at the next cache refresh.
  if (!client.chat_enabled && sender === "public") {
    return { error: `${client.business_name} is not taking messages here. Their WhatsApp number is on the post.` };
  }

  const { data: thread, error: threadError } = await admin
    .from("board_threads")
    .upsert(
      {
        growth_client_id: growthClientId,
        identity_id: identityId,
        opening_post_id: openingPostId ?? null,
        last_message_at: new Date().toISOString(),
      },
      { onConflict: "growth_client_id,identity_id" }
    )
    .select("id")
    .single();

  if (threadError || !thread) {
    console.error("Could not open a chat thread", threadError);
    return { error: "Could not send that, please try again." };
  }

  const { error: messageError } = await admin
    .from("board_messages")
    .insert({ thread_id: thread.id, sender, body });

  if (messageError) {
    console.error("Could not write a chat message", messageError);
    return { error: "Could not send that, please try again." };
  }

  const preview = truncateOnWord(body, 140);

  try {
    if (sender === "public" && client.contact_email) {
      await sendEmail({
        to: client.contact_email,
        subject: `${identity.display_name} sent you a message on DigitalFlyer`,
        html: chatEmail({
          heading: `${identity.display_name} sent you a message`,
          preview,
          action: "Read it and reply",
          href: `${SITE_URL}/dashboard/messages`,
          footer: "You can turn these messages off in your dashboard at any time.",
        }),
      });
    } else if (sender === "member" && identity.email) {
      await sendEmail({
        to: identity.email,
        fromName: client.business_name,
        subject: `${client.business_name} replied to you`,
        html: chatEmail({
          heading: `${client.business_name} replied`,
          preview,
          action: "Read it and reply",
          // A signed link rather than a bare address. This is what makes
          // the email address real without ever asking anybody to prove it:
          // clicking it recognises them and opens the conversation. A
          // made-up address simply never receives one.
          href: `${SITE_URL}/board/m/${identityToken(identity.id)}`,
          footer: "You are getting this because you messaged this business on DigitalFlyer.",
        }),
      });
    }
  } catch (err) {
    // The message is already saved. A failed notification is worth knowing
    // about and is not worth losing the message over.
    console.error("Chat notification email failed", err);
  }

  return { threadId: thread.id };
}

function chatEmail({
  heading,
  preview,
  action,
  href,
  footer,
}: {
  heading: string;
  preview: string;
  action: string;
  href: string;
  footer: string;
}): string {
  return `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #1c2b3a;">
      <p style="font-size: 18px; font-weight: 700; margin: 0 0 12px;">${heading}</p>
      <p style="font-size: 15px; line-height: 1.6; background: #f7f9fb; border-radius: 12px; padding: 16px; margin: 0 0 20px;">${preview}</p>
      <p style="margin: 0 0 24px;">
        <a href="${href}" style="display: inline-block; background: #1081b8; color: #ffffff; text-decoration: none; font-weight: 700; padding: 12px 22px; border-radius: 999px;">${action}</a>
      </p>
      <p style="font-size: 12px; color: #718096; margin: 0;">${footer}</p>
    </div>
  `;
}
