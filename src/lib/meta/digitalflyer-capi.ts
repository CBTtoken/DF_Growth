import crypto from "crypto";

// DigitalFlyer's OWN server-side Conversions API, the platform-level twin of
// the per-member src/lib/meta/capi.ts. That one reads a pixel + encrypted
// token off each growth_clients row (a member tracking their own leads); this
// one uses DigitalFlyer's own pixel + one platform token from the environment,
// so our own ad campaigns capture the conversions the browser pixel misses
// (ad blockers, iOS, cookie declines). See docs/meta-ads-playbook.md Part E/F.
//
// Graph API version kept in lockstep with the per-member file (v25.0, verified
// against Meta's docs 2026-07-08). Re-verify before reusing far in the future.
const GRAPH_API_VERSION = "v25.0";

// Await this fetch can't be allowed to hang the signup it rides on, so it's
// bounded — Meta normally answers in well under a second; if it stalls we give
// up and let the signup proceed regardless.
const REQUEST_TIMEOUT_MS = 3000;

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

type DigitalFlyerCapiResult = { skipped: true } | { status: number };

export async function sendDigitalFlyerCapiEvent({
  eventName,
  email,
  eventId,
  eventSourceUrl,
  clientUserAgent,
  fbc,
  fbp,
  value,
  currency,
  contentName,
}: {
  eventName: "CompleteRegistration" | "Subscribe" | "Lead" | "Purchase" | "InitiateCheckout";
  email?: string | null;
  // The SAME id the browser pixel sends for this conversion. For signups it's
  // passed through the thank-you page URL; for a book Purchase it's the
  // Paystack transaction reference (naturally shared by browser + webhook).
  // Meta dedupes server + browser events that share an event_id + event_name,
  // so one conversion is counted once, not twice.
  eventId: string;
  eventSourceUrl: string;
  clientUserAgent?: string | null;
  // _fbc / _fbp cookies dropped by the pixel — present only for visitors who
  // accepted cookies, but the hashed email alone still gives Meta a match, so
  // conversions for cookie-decliners (the whole point of CAPI) still land.
  fbc?: string | null;
  fbp?: string | null;
  // Purchase / InitiateCheckout only: the order value so Meta can optimise for
  // revenue (value-based optimisation), not just any sale.
  value?: number | null;
  currency?: string | null;
  contentName?: string | null;
}): Promise<DigitalFlyerCapiResult> {
  const pixelId = process.env.NEXT_PUBLIC_DIGITALFLYER_META_PIXEL_ID;
  const accessToken = process.env.DIGITALFLYER_META_CAPI_ACCESS_TOKEN;

  // No-op until the platform token is set in the environment. This is why the
  // code can ship ahead of the token: it stays dormant, breaks nothing, and
  // switches on the moment the env var lands in Vercel.
  if (!pixelId || !accessToken) {
    return { skipped: true };
  }

  const eventPayload = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: "website",
        event_source_url: eventSourceUrl,
        user_data: {
          em: email ? [sha256(email)] : undefined,
          fbc: fbc || undefined,
          fbp: fbp || undefined,
          client_user_agent: clientUserAgent || undefined,
        },
        custom_data:
          value != null
            ? {
                value,
                currency: currency || "ZAR",
                content_name: contentName || undefined,
                content_type: "product",
              }
            : undefined,
      },
    ],
  };

  // Everything is wrapped: a tracking call must never be able to break the
  // signup it's attached to. Worst case we log and return, the user's account
  // is already created either way.
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let status = -1;
    try {
      const res = await fetch(
        `https://graph.facebook.com/${GRAPH_API_VERSION}/${pixelId}/events?access_token=${accessToken}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(eventPayload),
          signal: controller.signal,
        }
      );
      status = res.status;
    } finally {
      clearTimeout(timeout);
    }
    return { status };
  } catch (err) {
    console.error("DigitalFlyer CAPI request failed", err);
    return { status: -1 };
  }
}
