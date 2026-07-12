// Combined spec Sec 32.1: same Graph API version already re-verified against
// Meta's current docs for lib/meta/capi.ts on 2026-07-08 — re-check before
// reusing this file far in the future, Meta's WhatsApp Cloud API surface
// changes often (see the Sec 31 changelog check this build started with,
// which found the BSUID identifier change).
const GRAPH_API_VERSION = "v25.0";

function authHeaders() {
  return { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` };
}

// `to` accepts either a phone number or a BSUID — confirmed in Meta's own
// BSUID documentation ("You can use BSUIDs to message WhatsApp users when
// their phone numbers are not available"), so callers can pass whichever
// identifier a conversation is actually keyed on without translation.
export async function sendWhatsAppText(to: string, body: string): Promise<{ ok: boolean; status: number }> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body },
        }),
      }
    );
    if (!res.ok) console.error("WhatsApp send failed", res.status, await res.text());
    return { ok: res.ok, status: res.status };
  } catch (err) {
    console.error("WhatsApp send request failed", err);
    return { ok: false, status: -1 };
  }
}

// Sec 32.5 acceptance criteria: a logo/photo sent as a WhatsApp media
// message must be fetched and stored the same way the dashboard upload
// does. Two-step Graph API dance is required, not optional — the media ID
// from the webhook only resolves to a real (short-lived, authenticated)
// download URL via this lookup, there's no direct static URL.
export async function fetchWhatsAppMedia(
  mediaId: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  try {
    const metaRes = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${mediaId}`, {
      headers: authHeaders(),
    });
    if (!metaRes.ok) {
      console.error("WhatsApp media lookup failed", metaRes.status, await metaRes.text());
      return null;
    }
    const { url, mime_type: mimeType } = (await metaRes.json()) as { url: string; mime_type: string };

    // The lookup URL above is itself authenticated (expires quickly, and
    // still needs the same bearer token to actually download from) — not a
    // public CDN link, unlike Pexels URLs elsewhere in this codebase.
    const mediaRes = await fetch(url, { headers: authHeaders() });
    if (!mediaRes.ok) {
      console.error("WhatsApp media download failed", mediaRes.status);
      return null;
    }
    const buffer = Buffer.from(await mediaRes.arrayBuffer());
    return { buffer, mimeType };
  } catch (err) {
    console.error("WhatsApp media fetch failed", err);
    return null;
  }
}
