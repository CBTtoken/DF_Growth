import { NextResponse, after } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { isValidWhatsAppSignature } from "@/lib/whatsapp/signature";
import { parseWhatsAppWebhook } from "@/lib/whatsapp/parse-webhook";
import { handleIncomingWhatsAppMessage } from "@/lib/whatsapp/handle-message";

// Combined spec Sec 32.1: Meta's one-time webhook verification handshake,
// done once when the webhook URL is registered in the Meta App dashboard.
// hub.challenge must be echoed back verbatim as plain text, not JSON.
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

// Combined spec Sec 32.1: "respond 200 within 5 seconds, process
// afterward" — signature validation and parsing happen inline (fast,
// no I/O), but Supabase/Graph API work happens inside after() so Meta's
// 5-second window is never at risk of a slow downstream call, matching
// the reference standalone bot's own async processing pattern. after()
// is Next.js's own Vercel-native background-work primitive, no separate
// queue/worker needed for this scale.
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!isValidWhatsAppSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const messages = parseWhatsAppWebhook(payload);

  after(async () => {
    for (const message of messages) {
      try {
        await handleIncomingWhatsAppMessage(message);
      } catch (err) {
        console.error("WhatsApp message handling failed", message.bsuid, err);
        // Errors thrown inside after() run after the response is already
        // sent, so Next's automatic onRequestError instrumentation never
        // sees them — explicit capture is the only way this reaches
        // Sentry, which is exactly why the sprint spec calls this handler
        // out by name.
        Sentry.captureException(err, { extra: { bsuid: message.bsuid } });
      }
    }
  });

  return NextResponse.json({ received: true });
}
