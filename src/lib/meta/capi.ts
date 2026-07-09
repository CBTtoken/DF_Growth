import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/crypto";

// CLAUDE.md Section 9. Graph API version verified against Meta's current
// developer docs on 2026-07-08 (v25.0, released Feb 2026) rather than
// trusting the spec's hardcoded v21.0 — re-verify before reusing this file
// far in the future, per the spec's own Section 0 warning that Meta changes
// this frequently. Core payload shape (hashed PII, event_id dedup,
// action_source) has been stable for years and is unlikely to have moved.
const GRAPH_API_VERSION = "v25.0";

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export async function sendCapiEvent({
  growthClientId,
  eventName,
  email,
  phone,
  fbclid,
  eventId,
  eventSourceUrl,
  clientUserAgent,
}: {
  growthClientId: string;
  eventName: "Lead" | "Purchase" | "CompleteRegistration";
  email?: string;
  phone?: string;
  fbclid?: string | null;
  eventId: string;
  // Both flagged "required parameter for Conversions API" in Meta's own
  // setup wizard for better match quality — events still deliver without
  // them (confirmed: got a real 200 during testing), but Meta's docs are
  // explicit these materially improve attribution.
  eventSourceUrl: string;
  clientUserAgent: string;
}) {
  const admin = createAdminClient();

  const { data: client } = await admin
    .from("growth_clients")
    .select("meta_pixel_id")
    .eq("id", growthClientId)
    .single();

  const { data: secret } = await admin
    .from("growth_client_secrets")
    .select("meta_capi_access_token_encrypted")
    .eq("growth_client_id", growthClientId)
    .maybeSingle();

  if (!client?.meta_pixel_id || !secret?.meta_capi_access_token_encrypted) {
    // Client is on a tier with no Meta connection, or hasn't pasted a token
    // in yet — expected, not an error.
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
          ph: phone ? [sha256(phone)] : undefined,
          fbc: fbclid ? `fb.1.${Date.now()}.${fbclid}` : undefined,
          client_user_agent: clientUserAgent,
        },
      },
    ],
  };

  // decrypt() and the Meta fetch both used to be able to throw in ways that
  // skipped the capi_events insert entirely — confirmed by testing: a
  // delivery attempt vanished with no row and no visible error, because
  // there's no Vercel log access here, only the database. Everything from
  // this point on is wrapped so a failure is always recorded, not silent.
  let responseStatus: number | null = null;
  try {
    const accessToken = decrypt(secret.meta_capi_access_token_encrypted);
    const metaRes = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${client.meta_pixel_id}/events?access_token=${accessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventPayload),
      }
    );
    responseStatus = metaRes.status;
  } catch (err) {
    console.error("CAPI request failed", err);
    responseStatus = -1; // distinguishes "we never got an HTTP response" from any real status code
  }

  try {
    await admin.from("capi_events").insert({
      growth_client_id: growthClientId,
      event_name: eventName,
      event_id: eventId,
      fbclid: fbclid ?? null,
      hashed_email: email ? sha256(email) : null,
      hashed_phone: phone ? sha256(phone) : null,
      payload: eventPayload,
      response_status: responseStatus,
    });
  } catch (err) {
    console.error("Failed to log capi_events row", err);
  }

  return { status: responseStatus };
}
