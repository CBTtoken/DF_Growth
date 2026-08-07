// Thin wrapper over the WhatsApp Cloud API's /messages endpoint. Plain
// fetch, no SDK, same approach as lib/meta/capi.ts. Verified against Meta's
// live docs 2026-08-07: v25.0 current, interactive button titles cap at 20
// characters, list row titles at 24, list body at 4096.
//
// The number is still unverified with Meta, so WHATSAPP_ACCESS_TOKEN and
// WHATSAPP_PHONE_NUMBER_ID are not set yet. Every send fails cleanly and
// visibly until they are (the inbox shows the failure on the message), and
// going live is only those two env vars plus WHATSAPP_APP_SECRET, no code
// change.
//
// WHATSAPP_GRAPH_BASE_URL exists for local verification only: pointing it
// at a stub server lets the whole pipeline run end to end before the number
// is live. Unset (production), it is graph.facebook.com.
const GRAPH_BASE = process.env.WHATSAPP_GRAPH_BASE_URL ?? "https://graph.facebook.com";
const GRAPH_VERSION = "v25.0";

export type SendResult = {
  ok: boolean;
  wamid: string | null;
  status: number;
  errorDetail: string | null;
};

export type ButtonSpec = { id: string; title: string };
export type ListRow = { id: string; title: string; description?: string };

async function postMessage(payload: Record<string, unknown>): Promise<SendResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    return {
      ok: false,
      wamid: null,
      status: 0,
      errorDetail: "WhatsApp is not connected yet. The access token and phone number id are missing.",
    };
  }

  try {
    const res = await fetch(`${GRAPH_BASE}/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", ...payload }),
    });

    const body = (await res.json().catch(() => null)) as {
      messages?: { id?: string }[];
      error?: { message?: string; code?: number };
    } | null;

    if (!res.ok) {
      const detail = body?.error
        ? `${body.error.code ?? res.status}: ${body.error.message ?? "unknown error"}`
        : `HTTP ${res.status}`;
      console.error("WhatsApp send failed", detail);
      return { ok: false, wamid: null, status: res.status, errorDetail: detail };
    }

    return { ok: true, wamid: body?.messages?.[0]?.id ?? null, status: res.status, errorDetail: null };
  } catch (err) {
    console.error("WhatsApp send request threw", err);
    return { ok: false, wamid: null, status: -1, errorDetail: String(err) };
  }
}

export function sendText(to: string, body: string): Promise<SendResult> {
  return postMessage({ to, type: "text", text: { body, preview_url: true } });
}

// Up to three tap buttons. Meta caps titles at 20 characters; anything
// longer is rejected by the API, so it is truncated here rather than
// failing the whole send over one long label.
export function sendButtons(to: string, body: string, buttons: ButtonSpec[]): Promise<SendResult> {
  return postMessage({
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: body },
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({
          type: "reply",
          reply: { id: b.id, title: b.title.slice(0, 20) },
        })),
      },
    },
  });
}

// A list message: one "open" button revealing up to ten rows. Used for the
// member-support saved answers, where three buttons is not enough.
export function sendList(to: string, body: string, buttonText: string, rows: ListRow[]): Promise<SendResult> {
  return postMessage({
    to,
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: body },
      action: {
        button: buttonText.slice(0, 20),
        sections: [
          {
            rows: rows.slice(0, 10).map((r) => ({
              id: r.id,
              title: r.title.slice(0, 24),
              ...(r.description ? { description: r.description.slice(0, 72) } : {}),
            })),
          },
        ],
      },
    },
  });
}
