import type { SupabaseClient } from "@supabase/supabase-js";
import { sendText, sendButtons, sendList, type ButtonSpec, type ListRow, type SendResult } from "@/lib/wa-inbox/graph";

// Every outbound message is written to wa_messages BEFORE the Graph API is
// called, then updated with the result. A send that fails therefore always
// exists as a visible 'failed' row in the thread; it can never vanish into
// a log (handoff section 1: a silent failure is the worst possible
// outcome). On failure the conversation is also flagged needs_human so the
// inbox surfaces it, not just the thread.

type OutboundKind = "text" | "buttons" | "list";

export type OutboundSpec = {
  conversationId: string;
  to: string;
  body: string;
  // 'system' for scripted sends, the admin's email for typed ones.
  sentBy: string;
  savedAnswerId?: string | null;
  buttons?: ButtonSpec[];
  list?: { buttonText: string; rows: ListRow[] };
};

export async function recordAndSend(admin: SupabaseClient, spec: OutboundSpec): Promise<SendResult> {
  const kind: OutboundKind = spec.buttons ? "buttons" : spec.list ? "list" : "text";

  const { data: row, error: insertError } = await admin
    .from("wa_messages")
    .insert({
      conversation_id: spec.conversationId,
      direction: "out",
      kind,
      body: spec.body,
      status: "queued",
      sent_by: spec.sentBy,
      saved_answer_id: spec.savedAnswerId ?? null,
    })
    .select("id")
    .single();

  if (insertError || !row) {
    console.error("Failed to record outbound WhatsApp message", insertError);
    return { ok: false, wamid: null, status: -1, errorDetail: "Could not record the message" };
  }

  return deliver(admin, row.id, spec);
}

// Also used by the thread screen's "Try again" on a failed message: the
// same row is re-sent and updated in place, so the thread shows one message
// with its true current state rather than a pile of failed duplicates.
export async function deliver(admin: SupabaseClient, messageId: string, spec: OutboundSpec): Promise<SendResult> {
  let result: SendResult;
  if (spec.buttons) {
    result = await sendButtons(spec.to, spec.body, spec.buttons);
  } else if (spec.list) {
    result = await sendList(spec.to, spec.body, spec.list.buttonText, spec.list.rows);
  } else {
    result = await sendText(spec.to, spec.body);
  }

  await admin
    .from("wa_messages")
    .update(
      result.ok
        ? { status: "sent", wamid: result.wamid, error_detail: null }
        : { status: "failed", error_detail: result.errorDetail }
    )
    .eq("id", messageId);

  const now = new Date().toISOString();
  await admin
    .from("wa_conversations")
    .update(
      result.ok
        ? { last_outbound_at: now, updated_at: now }
        : { needs_human: true, needs_human_since: now, updated_at: now }
    )
    .eq("id", spec.conversationId);

  return result;
}
