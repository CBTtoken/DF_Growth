"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminEmail } from "@/lib/auth/require-admin";
import { recordAndSend, deliver } from "@/lib/wa-inbox/send";
import { getBotCopy } from "@/lib/wa-inbox/copy";
import { isWindowOpen, hoursSince, NUDGE_OFFER_HOURS } from "@/lib/wa-inbox/window";

// Server actions for the inbox and thread screens. Every one gates on the
// admin allowlist first — these touch personal data and send real WhatsApp
// messages.

export type ActionResult = { ok: true } | { ok: false; message: string } | null;

async function requireAdmin(): Promise<{ email: string } | null> {
  const admin = await requireAdminEmail();
  return "error" in admin ? null : admin;
}

function threadPath(conversationId: string) {
  return `/admin/whatsapp/${conversationId}`;
}

async function loadConversation(conversationId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("wa_conversations")
    .select("id, wa_id, profile_name, door, last_inbound_at, nudge_sent_at, outcome, trade, suburb, urgency, labels")
    .eq("id", conversationId)
    .maybeSingle();
  return data;
}

// Free text reply from the composer. Refuses once the 24-hour window has
// closed: Meta would reject it anyway, and a reply that looks sent but
// never delivers is exactly what the interface must make impossible.
export async function sendReply(conversationId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const adminUser = await requireAdmin();
  if (!adminUser) return { ok: false, message: "Not signed in as an admin." };

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { ok: false, message: "Write a message first." };

  const conversation = await loadConversation(conversationId);
  if (!conversation) return { ok: false, message: "Conversation not found." };

  if (!isWindowOpen(conversation.last_inbound_at)) {
    return {
      ok: false,
      message: "The 24 hour window has closed, so a plain reply will not deliver. Reopening needs an approved template.",
    };
  }

  const admin = createAdminClient();
  const result = await recordAndSend(admin, {
    conversationId,
    to: conversation.wa_id,
    body,
    sentBy: adminUser.email,
  });

  if (result.ok) {
    await admin
      .from("wa_conversations")
      .update({ needs_human: false, updated_at: new Date().toISOString() })
      .eq("id", conversationId);
  }

  revalidatePath(threadPath(conversationId));
  return result.ok ? { ok: true } : { ok: false, message: `The message did not send: ${result.errorDetail}` };
}

// One tap on a saved answer sends it as written. The answer body is
// Dewald's own approved text, so there is nothing to review between tap
// and send.
export async function sendSavedAnswer(conversationId: string, answerId: string): Promise<ActionResult> {
  const adminUser = await requireAdmin();
  if (!adminUser) return { ok: false, message: "Not signed in as an admin." };

  const conversation = await loadConversation(conversationId);
  if (!conversation) return { ok: false, message: "Conversation not found." };
  if (!isWindowOpen(conversation.last_inbound_at)) {
    return { ok: false, message: "The 24 hour window has closed, so this will not deliver." };
  }

  const admin = createAdminClient();
  const { data: answer } = await admin
    .from("wa_saved_answers")
    .select("id, body")
    .eq("id", answerId)
    .maybeSingle();
  if (!answer) return { ok: false, message: "That saved answer no longer exists." };

  const result = await recordAndSend(admin, {
    conversationId,
    to: conversation.wa_id,
    body: answer.body,
    sentBy: adminUser.email,
    savedAnswerId: answer.id,
  });

  if (result.ok) {
    await admin
      .from("wa_conversations")
      .update({ needs_human: false, updated_at: new Date().toISOString() })
      .eq("id", conversationId);
  }

  revalidatePath(threadPath(conversationId));
  return result.ok ? { ok: true } : { ok: false, message: `The message did not send: ${result.errorDetail}` };
}

// The hour-20 nudge (handoff section 6). Offered, never automatic: this
// action IS the offer being taken. Guards repeat the offer conditions so a
// stale page cannot nudge a thread that has since replied.
export async function sendNudge(conversationId: string): Promise<ActionResult> {
  const adminUser = await requireAdmin();
  if (!adminUser) return { ok: false, message: "Not signed in as an admin." };

  const conversation = await loadConversation(conversationId);
  if (!conversation) return { ok: false, message: "Conversation not found." };

  if (!conversation.last_inbound_at || !isWindowOpen(conversation.last_inbound_at)) {
    return { ok: false, message: "The window has already closed, the nudge cannot deliver." };
  }
  if (hoursSince(conversation.last_inbound_at) < NUDGE_OFFER_HOURS) {
    return { ok: false, message: "They replied recently, no nudge needed." };
  }
  if (conversation.nudge_sent_at) {
    return { ok: false, message: "The nudge has already been sent for this window." };
  }
  if (conversation.outcome) {
    return { ok: false, message: "This conversation is finished." };
  }

  const admin = createAdminClient();
  const copy = await getBotCopy(admin);
  if (!copy["nudge_20h"]) return { ok: false, message: "The nudge text is missing from the answer library." };

  const result = await recordAndSend(admin, {
    conversationId,
    to: conversation.wa_id,
    body: copy["nudge_20h"],
    sentBy: adminUser.email,
  });

  if (result.ok) {
    await admin
      .from("wa_conversations")
      .update({ nudge_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", conversationId);
  }

  revalidatePath(threadPath(conversationId));
  return result.ok ? { ok: true } : { ok: false, message: `The nudge did not send: ${result.errorDetail}` };
}

// "Try again" on a failed send. Only free-text messages retry; the
// scripted button/list messages are rebuilt by the flow, not replayed.
export async function retrySend(messageId: string): Promise<ActionResult> {
  const adminUser = await requireAdmin();
  if (!adminUser) return { ok: false, message: "Not signed in as an admin." };

  const admin = createAdminClient();
  const { data: message } = await admin
    .from("wa_messages")
    .select("id, conversation_id, body, kind, status, saved_answer_id, sent_by")
    .eq("id", messageId)
    .maybeSingle();
  if (!message || message.status !== "failed" || message.kind !== "text" || !message.body) {
    return { ok: false, message: "This message cannot be retried." };
  }

  const conversation = await loadConversation(message.conversation_id);
  if (!conversation) return { ok: false, message: "Conversation not found." };
  if (!isWindowOpen(conversation.last_inbound_at)) {
    return { ok: false, message: "The 24 hour window has closed, so this will not deliver." };
  }

  const result = await deliver(admin, message.id, {
    conversationId: message.conversation_id,
    to: conversation.wa_id,
    body: message.body,
    sentBy: message.sent_by ?? adminUser.email,
    savedAnswerId: message.saved_answer_id,
  });

  revalidatePath(threadPath(message.conversation_id));
  return result.ok ? { ok: true } : { ok: false, message: `Still failing: ${result.errorDetail}` };
}

// Opening a thread clears its unread badge, same as WhatsApp itself.
export async function markThreadRead(conversationId: string): Promise<void> {
  if (!(await requireAdmin())) return;
  const admin = createAdminClient();
  await admin.from("wa_conversations").update({ unread_count: 0 }).eq("id", conversationId);
  revalidatePath("/admin/whatsapp");
}

export async function addLabel(conversationId: string, label: string): Promise<void> {
  if (!(await requireAdmin())) return;
  const clean = label.trim().toLowerCase();
  if (!clean) return;
  const admin = createAdminClient();
  const { data } = await admin.from("wa_conversations").select("labels").eq("id", conversationId).maybeSingle();
  if (!data) return;
  if (!data.labels.includes(clean)) {
    await admin
      .from("wa_conversations")
      .update({ labels: [...data.labels, clean], updated_at: new Date().toISOString() })
      .eq("id", conversationId);
  }
  revalidatePath(threadPath(conversationId));
}

export async function removeLabel(conversationId: string, label: string): Promise<void> {
  if (!(await requireAdmin())) return;
  const admin = createAdminClient();
  const { data } = await admin.from("wa_conversations").select("labels").eq("id", conversationId).maybeSingle();
  if (!data) return;
  await admin
    .from("wa_conversations")
    .update({ labels: data.labels.filter((l: string) => l !== label), updated_at: new Date().toISOString() })
    .eq("id", conversationId);
  revalidatePath(threadPath(conversationId));
}

// Marking an outcome is what starts the retention clock; the thread screen
// says so next to these buttons. For a job request the demand line gets
// the outcome immediately, so the recruitment map is right even before the
// conversation is cleaned up.
export async function setOutcome(conversationId: string, outcome: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, message: "Not signed in as an admin." };
  if (!["converted", "declined", "resolved", "unmatched"].includes(outcome)) {
    return { ok: false, message: "Unknown outcome." };
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data: conversation } = await admin
    .from("wa_conversations")
    .update({ outcome, outcome_at: now, outcome_set_by: "admin", needs_human: false, updated_at: now })
    .eq("id", conversationId)
    .select("id, door")
    .maybeSingle();
  if (!conversation) return { ok: false, message: "Conversation not found." };

  if (conversation.door === "job") {
    await admin.from("wa_demand_lines").update({ outcome }).eq("conversation_id", conversationId);
  }

  revalidatePath(threadPath(conversationId));
  revalidatePath("/admin/whatsapp");
  return { ok: true };
}

export async function reopenConversation(conversationId: string): Promise<void> {
  if (!(await requireAdmin())) return;
  const admin = createAdminClient();
  await admin
    .from("wa_conversations")
    .update({ outcome: null, outcome_at: null, outcome_set_by: null, updated_at: new Date().toISOString() })
    .eq("id", conversationId);
  await admin.from("wa_demand_lines").update({ outcome: null }).eq("conversation_id", conversationId);
  revalidatePath(threadPath(conversationId));
  revalidatePath("/admin/whatsapp");
}

// Door 1's three structured fields, editable so Dewald can fix a typo or
// fill in what a half-finished thread never collected. The demand line is
// kept in step.
export async function saveJobFields(conversationId: string, formData: FormData): Promise<void> {
  if (!(await requireAdmin())) return;
  const trade = String(formData.get("trade") ?? "").trim() || null;
  const suburb = String(formData.get("suburb") ?? "").trim() || null;
  const urgency = String(formData.get("urgency") ?? "").trim() || null;

  const admin = createAdminClient();
  await admin
    .from("wa_conversations")
    .update({ trade, suburb, urgency, updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  const { data: line } = await admin
    .from("wa_demand_lines")
    .select("id")
    .eq("conversation_id", conversationId)
    .maybeSingle();
  if (line) {
    await admin.from("wa_demand_lines").update({ trade, suburb, urgency }).eq("id", line.id);
  } else if (trade || suburb || urgency) {
    await admin.from("wa_demand_lines").insert({ conversation_id: conversationId, trade, suburb, urgency });
  }

  revalidatePath(threadPath(conversationId));
}
