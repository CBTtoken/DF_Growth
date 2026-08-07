import { createAdminClient } from "@/lib/supabase/admin";
import { notifyNeedsHuman } from "@/lib/wa-inbox/notify";
import type { StatusUpdate } from "@/lib/wa-inbox/parse";

// Delivery receipts for outbound messages. sent -> delivered -> read only
// ever move forward (Meta can deliver receipts out of order); 'failed'
// always wins and flags the conversation so the failure is in the inbox,
// not only in a log.
const RANK: Record<string, number> = { queued: 0, sent: 1, delivered: 2, read: 3 };

export async function applyStatusUpdate(update: StatusUpdate): Promise<void> {
  const admin = createAdminClient();

  const { data: message } = await admin
    .from("wa_messages")
    .select("id, conversation_id, status")
    .eq("wamid", update.wamid)
    .maybeSingle();
  if (!message) return; // a status for something we never stored

  if (update.status === "failed") {
    await admin
      .from("wa_messages")
      .update({ status: "failed", error_detail: update.errorDetail ?? "Delivery failed" })
      .eq("id", message.id);

    const now = new Date().toISOString();
    const { data: conversation } = await admin
      .from("wa_conversations")
      .update({ needs_human: true, needs_human_since: now, updated_at: now })
      .eq("id", message.conversation_id)
      .select("id, wa_id, profile_name, door, notified_at")
      .single();
    if (conversation) await notifyNeedsHuman(admin, conversation);
    return;
  }

  const current = RANK[message.status] ?? 0;
  const incoming = RANK[update.status];
  if (incoming === undefined || incoming <= current) return;

  await admin.from("wa_messages").update({ status: update.status }).eq("id", message.id);
}
