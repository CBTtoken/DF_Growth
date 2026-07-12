// Combined spec Sec 32.1/32.4: extracts real incoming messages from Meta's
// webhook envelope. Defensive on purpose (optional chaining throughout,
// `unknown` input) rather than trusting a fixed shape — the Sec 31
// changelog check found Meta actively changing this payload (BSUID rollout
// landed mid-2026 with no advance notice to existing integrations), so this
// parser assumes the shape can shift again rather than hard-crashing on an
// unexpected field.
export type IncomingWhatsAppMessage = {
  // Meta's Business-Scoped User ID (messages[].user_id) — the durable
  // per-conversation identifier, see the migration's own comment for why
  // this is used instead of phone number.
  bsuid: string;
  phoneNumber: string | null;
  profileName: string | null;
  messageId: string;
  type: string;
  text: string | null;
  mediaId: string | null;
};

export function parseWhatsAppWebhook(payload: unknown): IncomingWhatsAppMessage[] {
  const results: IncomingWhatsAppMessage[] = [];

  if (typeof payload !== "object" || payload === null) return results;
  const entries = (payload as { entry?: unknown }).entry;
  if (!Array.isArray(entries)) return results;

  for (const entry of entries) {
    const changes = (entry as { changes?: unknown })?.changes;
    if (!Array.isArray(changes)) continue;

    for (const change of changes) {
      const value = (change as { value?: unknown })?.value as
        | {
            contacts?: { wa_id?: string; profile?: { name?: string } }[];
            // "messages" is absent on status-update (delivered/read)
            // webhooks — those aren't real incoming messages, nothing to
            // process, silently skipped below.
            messages?: {
              from?: string;
              user_id?: string;
              id?: string;
              type?: string;
              text?: { body?: string };
              image?: { id?: string };
              document?: { id?: string };
            }[];
          }
        | undefined;

      if (!value?.messages) continue;

      for (const message of value.messages) {
        // user_id (BSUID) is confirmed present on every messages webhook
        // regardless of username adoption — fall back to `from` only for
        // defensiveness against an unexpected/older payload shape, not
        // because it's expected to be missing in practice.
        const bsuid = message.user_id ?? message.from;
        if (!bsuid) continue;

        const contact = value.contacts?.find((c) => c.wa_id === message.from);

        results.push({
          bsuid,
          phoneNumber: message.from ?? null,
          profileName: contact?.profile?.name ?? null,
          messageId: message.id ?? "",
          type: message.type ?? "unknown",
          text: message.text?.body ?? null,
          mediaId: message.image?.id ?? message.document?.id ?? null,
        });
      }
    }
  }

  return results;
}
