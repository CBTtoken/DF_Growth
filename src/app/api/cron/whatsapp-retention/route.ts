import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// The retention sweep (handoff section 7, "this is not optional"). Runs
// hourly from Vercel Cron. Two passes:
//
// 1. Auto-resolve: a conversation nobody ever marks with an outcome cannot
//    hold a person's messages forever. After wa_settings.auto_resolve_days
//    of total silence (updated_at is bumped by every message and admin
//    action) it is marked resolved with outcome_set_by 'auto', which
//    starts the retention clock like any other outcome.
//
// 2. Delete: once a conversation has carried an outcome for longer than
//    wa_settings.retention_hours (default 72, NOT yet attorney-approved,
//    configurable in /admin/whatsapp/answers), everything identifying is
//    deleted: the conversation row and, by cascade, every message. The
//    demand line survives because its conversation_id is `on delete set
//    null` — it keeps only trade, suburb, urgency, date and outcome.
//    Every deletion is written to wa_deletion_log first.
//
// Deletion is automatic and scheduled, never a button someone remembers to
// press.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: settings } = await admin
    .from("wa_settings")
    .select("retention_hours, auto_resolve_days")
    .single();
  const retentionHours = settings?.retention_hours ?? 72;
  const autoResolveDays = settings?.auto_resolve_days ?? 30;

  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  // Pass 1: auto-resolve the long-silent.
  const silenceCutoff = new Date(now - autoResolveDays * 24 * 60 * 60 * 1000).toISOString();
  const { data: autoResolved } = await admin
    .from("wa_conversations")
    .update({ outcome: "resolved", outcome_at: nowIso, outcome_set_by: "auto", updated_at: nowIso })
    .is("outcome", null)
    .lt("updated_at", silenceCutoff)
    .select("id");

  // Pass 2: delete what has served out its retention.
  const retentionCutoff = new Date(now - retentionHours * 60 * 60 * 1000).toISOString();
  const { data: due } = await admin
    .from("wa_conversations")
    .select("id, door, outcome, trade, suburb, urgency, created_at")
    .not("outcome", "is", null)
    .lt("outcome_at", retentionCutoff)
    .limit(200);

  let deleted = 0;
  for (const conversation of due ?? []) {
    // The demand line must be standing before its conversation goes. It is
    // normally written when door 1 finishes; a job thread that never got
    // that far still leaves whatever fields it collected.
    if (conversation.door === "job") {
      const { data: line } = await admin
        .from("wa_demand_lines")
        .select("id")
        .eq("conversation_id", conversation.id)
        .maybeSingle();
      if (line) {
        await admin.from("wa_demand_lines").update({ outcome: conversation.outcome }).eq("id", line.id);
      } else {
        await admin.from("wa_demand_lines").insert({
          conversation_id: conversation.id,
          trade: conversation.trade,
          suburb: conversation.suburb,
          urgency: conversation.urgency,
          requested_on: conversation.created_at?.slice(0, 10),
          outcome: conversation.outcome,
        });
      }
    }

    const { count: messageCount } = await admin
      .from("wa_messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversation.id);

    // Log before delete: if the delete fails the log overcounts by one row
    // that still exists, which the next run corrects; the reverse order
    // could delete without ever logging.
    await admin.from("wa_deletion_log").insert({
      conversation_id: conversation.id,
      door: conversation.door,
      outcome: conversation.outcome,
      messages_deleted: messageCount ?? 0,
      retention_hours: retentionHours,
    });

    const { error: deleteError } = await admin.from("wa_conversations").delete().eq("id", conversation.id);
    if (deleteError) {
      console.error("WhatsApp retention delete failed", conversation.id, deleteError);
      continue;
    }
    deleted += 1;
  }

  return NextResponse.json({
    ran: true,
    autoResolved: autoResolved?.length ?? 0,
    deleted,
    retentionHours,
  });
}
