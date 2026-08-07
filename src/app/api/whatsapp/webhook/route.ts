import { NextResponse, after } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { isValidWebhookSignature } from "@/lib/wa-inbox/signature";
import { parseWebhook } from "@/lib/wa-inbox/parse";
import { handleInbound } from "@/lib/wa-inbox/flow";
import { applyStatusUpdate } from "@/lib/wa-inbox/statuses";

// The WhatsApp inbox webhook (scripts/handoff-whatsapp-inbox.md). This
// route previously fed the July onboarding bot (lib/whatsapp/*); the inbox
// build supersedes that flow entirely — every inbound message now lands in
// wa_conversations and is answered through the three doors or by Dewald in
// /admin/whatsapp. The old bot's code and table are left in place, not
// deleted, pending Dewald's say-so.
//
// On a preview deployment Meta cannot pass Vercel's deployment protection,
// so the webhook URL registered with Meta must carry the protection bypass
// query (?x-vercel-protection-bypass=...&x-vercel-set-bypass-cookie=true).
// This has caught us before (handoff section 1).

// Meta's one-time verification handshake when the webhook URL is registered
// in the App dashboard. hub.challenge is echoed back verbatim as plain
// text, not JSON.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN && challenge) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

// Meta wants a 200 within 5 seconds. Signature validation and parsing are
// fast and happen inline; all Supabase and Graph API work runs inside
// after(), Next's Vercel-native background primitive, so a slow downstream
// call can never make Meta retry (and duplicate) the delivery.
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!isValidWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { messages, statuses } = parseWebhook(payload);

  after(async () => {
    // Statuses first: a "failed" receipt for an earlier send should be on
    // the conversation before a new inbound message re-renders it.
    for (const status of statuses) {
      try {
        await applyStatusUpdate(status);
      } catch (err) {
        console.error("WhatsApp status handling failed", status.wamid, err);
        // after() runs once the response is gone, so Next's automatic
        // error instrumentation never sees this — explicit capture only.
        Sentry.captureException(err, { extra: { wamid: status.wamid } });
      }
    }
    for (const message of messages) {
      try {
        await handleInbound(message);
      } catch (err) {
        console.error("WhatsApp message handling failed", message.wamid, err);
        Sentry.captureException(err, { extra: { wamid: message.wamid } });
      }
    }
  });

  return NextResponse.json({ received: true });
}
