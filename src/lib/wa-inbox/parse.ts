// Extracts inbound messages AND delivery status updates from Meta's webhook
// envelope. Defensive throughout (`unknown` in, optional chaining) because
// Meta changes this payload without notice; an unexpected shape must degrade
// to "nothing parsed", never crash the webhook.
//
// This replaces lib/whatsapp/parse-webhook.ts for the inbox build: that
// parser silently dropped status updates, and a dropped "failed" status is
// exactly the silent send failure the handoff calls the worst possible
// outcome.

export type InboundMessage = {
  // The sender's phone number (messages[].from), the address replies go to.
  waId: string;
  // Meta's business-scoped user id, kept because Meta has said phone
  // numbers may be absent for username-only accounts in future.
  bsuid: string | null;
  profileName: string | null;
  wamid: string;
  // 'text' | 'button_reply' | 'list_reply' | 'reaction' | 'image' |
  // 'document' | 'audio' | 'video' | 'sticker' | 'location' | 'unsupported'
  kind: string;
  // Human-readable rendering for the thread: the text, the tapped button's
  // title, the reaction emoji, or a placeholder like "[Photo]".
  body: string | null;
  // The tapped button/list row id, when kind is button_reply/list_reply.
  interactiveId: string | null;
};

export type StatusUpdate = {
  wamid: string;
  // 'sent' | 'delivered' | 'read' | 'failed'
  status: string;
  errorDetail: string | null;
};

const MEDIA_PLACEHOLDERS: Record<string, string> = {
  image: "[Photo]",
  document: "[Document]",
  audio: "[Voice note]",
  video: "[Video]",
  sticker: "[Sticker]",
  location: "[Location]",
};

export function parseWebhook(payload: unknown): { messages: InboundMessage[]; statuses: StatusUpdate[] } {
  const messages: InboundMessage[] = [];
  const statuses: StatusUpdate[] = [];

  if (typeof payload !== "object" || payload === null) return { messages, statuses };
  const entries = (payload as { entry?: unknown }).entry;
  if (!Array.isArray(entries)) return { messages, statuses };

  for (const entry of entries) {
    const changes = (entry as { changes?: unknown })?.changes;
    if (!Array.isArray(changes)) continue;

    for (const change of changes) {
      const value = (change as { value?: unknown })?.value as
        | {
            contacts?: { wa_id?: string; profile?: { name?: string } }[];
            messages?: {
              from?: string;
              user_id?: string;
              id?: string;
              type?: string;
              text?: { body?: string };
              interactive?: {
                type?: string;
                button_reply?: { id?: string; title?: string };
                list_reply?: { id?: string; title?: string };
              };
              // Template quick-reply taps arrive as type "button".
              button?: { payload?: string; text?: string };
              reaction?: { message_id?: string; emoji?: string };
            }[];
            statuses?: {
              id?: string;
              status?: string;
              errors?: { code?: number; title?: string; message?: string; error_data?: { details?: string } }[];
            }[];
          }
        | undefined;

      for (const status of value?.statuses ?? []) {
        if (!status?.id || !status.status) continue;
        const err = status.errors?.[0];
        statuses.push({
          wamid: status.id,
          status: status.status,
          errorDetail: err
            ? `${err.code ?? ""} ${err.title ?? err.message ?? ""} ${err.error_data?.details ?? ""}`.trim()
            : null,
        });
      }

      for (const message of value?.messages ?? []) {
        const waId = message.from;
        if (!waId || !message.id) continue;

        const contact = value?.contacts?.find((c) => c.wa_id === waId);
        const type = message.type ?? "unsupported";

        let kind = "unsupported";
        let body: string | null = null;
        let interactiveId: string | null = null;

        if (type === "text") {
          kind = "text";
          body = message.text?.body ?? null;
        } else if (type === "interactive") {
          const reply = message.interactive?.button_reply ?? message.interactive?.list_reply;
          kind = message.interactive?.list_reply ? "list_reply" : "button_reply";
          body = reply?.title ?? null;
          interactiveId = reply?.id ?? null;
        } else if (type === "button") {
          kind = "button_reply";
          body = message.button?.text ?? null;
          interactiveId = message.button?.payload ?? null;
        } else if (type === "reaction") {
          kind = "reaction";
          body = message.reaction?.emoji ?? null;
        } else if (type in MEDIA_PLACEHOLDERS) {
          kind = type;
          body = MEDIA_PLACEHOLDERS[type];
        }

        messages.push({
          waId,
          bsuid: message.user_id ?? null,
          profileName: contact?.profile?.name ?? null,
          wamid: message.id,
          kind,
          body,
          interactiveId,
        });
      }
    }
  }

  return { messages, statuses };
}
