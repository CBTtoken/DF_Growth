import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidResendWebhookSignature } from "@/lib/email/resend-webhook-signature";

// Legacy Reactivation Sprint 2, Section 9: "handle bounce and complaint
// webhooks from the sending provider... never resend to an address that
// hard-bounced or complained." Deliberately does NOT use next/server's
// after() for the DB update — this project's own prior finding (see
// project memory / the WhatsApp webhook's original design) is that
// fire-and-forget work is unreliable on this specific Vercel deployment;
// a plain awaited update is fast enough to stay well inside Resend's
// response-time expectations without that risk.
type ResendWebhookEvent = {
  type: string;
  data: { to?: string[] };
};

export async function POST(request: Request) {
  const rawBody = await request.text();

  const valid = isValidResendWebhookSignature(rawBody, {
    svixId: request.headers.get("svix-id"),
    svixTimestamp: request.headers.get("svix-timestamp"),
    svixSignature: request.headers.get("svix-signature"),
  });

  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: ResendWebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const recipients = event.data?.to ?? [];
  if (recipients.length === 0) {
    return NextResponse.json({ ok: true });
  }

  let field: "email_bounced_at" | "email_complained_at" | null = null;
  if (event.type === "email.bounced") field = "email_bounced_at";
  else if (event.type === "email.complained") field = "email_complained_at";

  if (field) {
    const admin = createAdminClient();
    const { error } = await admin
      .from("growth_clients")
      .update({ [field]: new Date().toISOString() })
      .in("contact_email", recipients);

    if (error) {
      console.error("Failed to record Resend webhook event", event.type, error);
      Sentry.captureException(error, { extra: { eventType: event.type, recipients } });
    }
  }

  return NextResponse.json({ ok: true });
}
