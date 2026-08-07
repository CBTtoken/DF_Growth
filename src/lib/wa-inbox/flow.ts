import { createAdminClient } from "@/lib/supabase/admin";
import { getBotCopy, type BotCopy } from "@/lib/wa-inbox/copy";
import { recordAndSend } from "@/lib/wa-inbox/send";
import { notifyNeedsHuman } from "@/lib/wa-inbox/notify";
import type { InboundMessage } from "@/lib/wa-inbox/parse";
import type { ButtonSpec, ListRow } from "@/lib/wa-inbox/graph";

// The three doors (handoff sections 2 and 3), as a plain state machine on
// wa_conversations.flow_step. Every reply is fixed text from wa_bot_copy or
// wa_saved_answers; nothing here composes, assembles or paraphrases a
// sentence. The moment a message falls outside the script, the only action
// is needs_human = true, which puts the thread in front of Dewald.
//
// Door button ids are stable identifiers, never shown to anyone.
const DOOR_IDS = { door_job: "job", door_member: "member", door_join: "join" } as const;
const OTHER_ROW_ID = "answer_other";
const URGENCY_IDS: Record<string, string> = {
  urgency_today: "Today",
  urgency_week: "This week",
  urgency_norush: "No rush",
};

type Conversation = {
  id: string;
  wa_id: string;
  bsuid: string | null;
  profile_name: string | null;
  door: string | null;
  flow_step: string;
  trade: string | null;
  suburb: string | null;
  urgency: string | null;
  labels: string[];
  outcome: string | null;
  needs_human: boolean;
  notified_at: string | null;
};

export async function handleInbound(message: InboundMessage): Promise<void> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("wa_conversations")
    .select(
      "id, wa_id, bsuid, profile_name, door, flow_step, trade, suburb, urgency, labels, outcome, needs_human, notified_at"
    )
    .eq("wa_id", message.waId)
    .maybeSingle();

  const copy = await getBotCopy(admin);

  if (!existing) {
    await startConversation(admin, message, copy);
    return;
  }

  const conversation = existing as Conversation;

  // Store the inbound message first. wamid is unique, so a webhook Meta
  // redelivers inserts nothing and the whole handler becomes a no-op.
  const { error: insertError } = await admin.from("wa_messages").insert({
    conversation_id: conversation.id,
    direction: "in",
    wamid: message.wamid,
    kind: message.kind,
    body: message.body,
    status: "received",
  });
  if (insertError) {
    if (insertError.code === "23505") return; // duplicate delivery, already handled
    console.error("Failed to store inbound WhatsApp message", insertError);
    return;
  }

  // Every inbound message resets the 24-hour window, including a thumbs
  // up, and re-arms the once-per-window nudge.
  const now = new Date().toISOString();
  await admin
    .from("wa_conversations")
    .update({
      last_inbound_at: now,
      nudge_sent_at: null,
      profile_name: message.profileName ?? conversation.profile_name,
      bsuid: message.bsuid ?? conversation.bsuid,
      unread_count: await nextUnread(admin, conversation.id),
      updated_at: now,
    })
    .eq("id", conversation.id);

  // A reaction is a window reset and nothing more; it is not an answer to
  // any question.
  if (message.kind === "reaction") return;

  await advance(admin, conversation, message, copy);
}

async function nextUnread(admin: ReturnType<typeof createAdminClient>, conversationId: string): Promise<number> {
  // Read-increment rather than a DB function: webhook deliveries for one
  // conversation arrive effectively serially, and the count is a badge,
  // not a ledger.
  const { data } = await admin.from("wa_conversations").select("unread_count").eq("id", conversationId).single();
  return (data?.unread_count ?? 0) + 1;
}

async function startConversation(
  admin: ReturnType<typeof createAdminClient>,
  message: InboundMessage,
  copy: BotCopy
): Promise<void> {
  const now = new Date().toISOString();
  const { data: created, error } = await admin
    .from("wa_conversations")
    .insert({
      wa_id: message.waId,
      bsuid: message.bsuid,
      profile_name: message.profileName,
      flow_step: "door",
      last_inbound_at: now,
      unread_count: 1,
    })
    .select("id")
    .single();

  if (error || !created) {
    // A concurrent first message already created it; store this message
    // against the existing row on the next delivery rather than losing it.
    if (error?.code === "23505") {
      await handleInbound(message);
      return;
    }
    console.error("Failed to create wa_conversation", error);
    return;
  }

  await admin.from("wa_messages").insert({
    conversation_id: created.id,
    direction: "in",
    wamid: message.wamid,
    kind: message.kind,
    body: message.body,
    status: "received",
  });

  // The three-door first reply (handoff section 2): immediate, fixed text,
  // three tap buttons, no guessing at intent.
  const buttons: ButtonSpec[] = [
    { id: "door_job", title: copy["door_button_job"] ?? "Someone for a job" },
    { id: "door_member", title: copy["door_button_member"] ?? "I am a member" },
    { id: "door_join", title: copy["door_button_join"] ?? "I want to join" },
  ];
  if (copy["welcome_doors"]) {
    await recordAndSend(admin, {
      conversationId: created.id,
      to: message.waId,
      body: copy["welcome_doors"],
      sentBy: "system",
      buttons,
    });
  }
}

async function advance(
  admin: ReturnType<typeof createAdminClient>,
  conversation: Conversation,
  message: InboundMessage,
  copy: BotCopy
): Promise<void> {
  const send = (body: string, extras?: { buttons?: ButtonSpec[]; list?: { buttonText: string; rows: ListRow[] } }) =>
    recordAndSend(admin, {
      conversationId: conversation.id,
      to: conversation.wa_id,
      body,
      sentBy: "system",
      ...extras,
    });

  const update = (fields: Record<string, unknown>) =>
    admin
      .from("wa_conversations")
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq("id", conversation.id);

  const toDewald = async (extraFields: Record<string, unknown> = {}) => {
    await update({
      flow_step: "done",
      needs_human: true,
      needs_human_since: new Date().toISOString(),
      ...extraFields,
    });
    await notifyNeedsHuman(admin, conversation);
  };

  // Media, stickers and anything else the script cannot read: hand the
  // thread to Dewald rather than asking the person to repeat themselves.
  const unreadable = message.kind !== "text" && message.kind !== "button_reply" && message.kind !== "list_reply";

  switch (conversation.flow_step) {
    case "door": {
      const doorKey = message.interactiveId as keyof typeof DOOR_IDS | null;
      const door = doorKey ? DOOR_IDS[doorKey] : undefined;

      if (door === "job") {
        await update({ door, flow_step: "door1_trade", labels: addLabel(conversation.labels, "job request") });
        if (copy["door1_ask_trade"]) await send(copy["door1_ask_trade"]);
        return;
      }
      if (door === "member") {
        const rows = await savedAnswerRows(admin, "member", copy);
        await update({ door, flow_step: "door2_menu", labels: addLabel(conversation.labels, "member support") });
        if (rows.length > 1 && copy["door2_menu_intro"]) {
          await send(copy["door2_menu_intro"], {
            list: { buttonText: copy["door2_menu_button"] ?? "Choose a question", rows },
          });
        } else {
          // No saved answers written yet: nothing to offer, straight to
          // Dewald with the member-support handoff line.
          if (copy["door2_handoff"]) await send(copy["door2_handoff"]);
          await toDewald();
        }
        return;
      }
      if (door === "join") {
        await update({ door, flow_step: "door3_question", labels: addLabel(conversation.labels, "joining") });
        if (copy["door3_question"]) {
          await send(copy["door3_question"], {
            buttons: [
              { id: "join_found", title: copy["door3_button_found"] ?? "Get found online" },
              { id: "join_invoice", title: copy["door3_button_invoice"] ?? "Quotes and invoices" },
            ],
          });
        }
        return;
      }

      // They typed instead of tapping. Do not argue with a human: no
      // re-prompt loop, straight to Dewald.
      await toDewald();
      return;
    }

    case "door1_trade": {
      if (unreadable || !message.body) {
        await toDewald();
        return;
      }
      await update({ trade: message.body, flow_step: "door1_suburb" });
      if (copy["door1_ask_suburb"]) await send(copy["door1_ask_suburb"]);
      return;
    }

    case "door1_suburb": {
      if (unreadable || !message.body) {
        await toDewald();
        return;
      }
      await update({ suburb: message.body, flow_step: "door1_urgency" });
      if (copy["door1_ask_urgency"]) {
        await send(copy["door1_ask_urgency"], {
          buttons: [
            { id: "urgency_today", title: copy["urgency_button_today"] ?? "Today" },
            { id: "urgency_week", title: copy["urgency_button_week"] ?? "This week" },
            { id: "urgency_norush", title: copy["urgency_button_norush"] ?? "No rush" },
          ],
        });
      }
      return;
    }

    case "door1_urgency": {
      if (unreadable) {
        await toDewald();
        return;
      }
      const urgency = (message.interactiveId && URGENCY_IDS[message.interactiveId]) || message.body || null;

      // The demand line is written the moment the three fields exist, not
      // at cleanup time: it must already be standing when its conversation
      // is eventually deleted (handoff section 7).
      await admin.from("wa_demand_lines").insert({
        conversation_id: conversation.id,
        trade: conversation.trade,
        suburb: conversation.suburb,
        urgency,
      });

      await toDewald({ urgency });
      if (copy["door1_handoff"]) await send(copy["door1_handoff"]);
      return;
    }

    case "door2_menu": {
      if (message.kind === "list_reply" && message.interactiveId && message.interactiveId !== OTHER_ROW_ID) {
        const { data: answer } = await admin
          .from("wa_saved_answers")
          .select("id, body")
          .eq("id", message.interactiveId)
          .eq("active", true)
          .maybeSingle();
        if (answer) {
          // A saved answer resolves the question without Dewald; the
          // thread stays in the menu so they can pick another.
          await recordAndSend(admin, {
            conversationId: conversation.id,
            to: conversation.wa_id,
            body: answer.body,
            sentBy: "system",
            savedAnswerId: answer.id,
          });
          return;
        }
      }
      // "Something else", a typed message, or an answer that no longer
      // exists: Dewald takes it.
      if (copy["door2_handoff"]) await send(copy["door2_handoff"]);
      await toDewald();
      return;
    }

    case "door3_question": {
      if (message.interactiveId === "join_found" || message.interactiveId === "join_invoice") {
        const replySlug = message.interactiveId === "join_found" ? "door3_reply_found" : "door3_reply_invoice";
        const label = message.interactiveId === "join_found" ? "wants to get found" : "wants quotes and invoices";
        if (copy[replySlug]) await send(copy[replySlug]);
        if (copy["door3_handoff"]) await send(copy["door3_handoff"]);
        await toDewald({ labels: addLabel(conversation.labels, label) });
        return;
      }
      await toDewald();
      return;
    }

    // 'done' and anything unexpected: the script is finished, every new
    // message is Dewald's to read.
    default: {
      if (!conversation.needs_human) {
        await update({ needs_human: true, needs_human_since: new Date().toISOString() });
      }
      await notifyNeedsHuman(admin, conversation);
      return;
    }
  }
}

function addLabel(labels: string[], label: string): string[] {
  return labels.includes(label) ? labels : [...labels, label];
}

async function savedAnswerRows(
  admin: ReturnType<typeof createAdminClient>,
  group: string,
  copy: BotCopy
): Promise<ListRow[]> {
  const { data } = await admin
    .from("wa_saved_answers")
    .select("id, button_label")
    .eq("group_slug", group)
    .eq("active", true)
    .order("sort_order")
    .limit(9);

  const rows: ListRow[] = (data ?? []).map((a) => ({ id: a.id, title: a.button_label }));
  rows.push({ id: OTHER_ROW_ID, title: copy["door2_other_row"] ?? "Something else" });
  return rows;
}
