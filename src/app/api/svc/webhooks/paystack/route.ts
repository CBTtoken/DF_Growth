import { NextResponse } from "next/server";
import crypto from "crypto";
import { activateSvcMembership } from "@/lib/svc/activation";

/**
 * SVC's own Paystack webhook.
 *
 * This is a separate route from /api/webhooks/paystack on purpose and the
 * separation is load-bearing (handoff 3.1): that route serves Growth,
 * KatisoBiz and Moxie on Digital Flyer's LIVE account and is not touched.
 * This one is registered on SVC's own TEST account in the Paystack
 * dashboard and verifies against SVC_PAYSTACK_SECRET_KEY only. When SVC's
 * live account exists, the key changes in Vercel and nothing changes here.
 *
 * Dedup is keyed on Paystack's transaction reference: Paystack retries a
 * webhook until it gets a 200, so the same event arriving twice is routine,
 * and the provider's reference is the only value that identifies one
 * payment.
 */
export async function POST(request: Request) {
  const secret = process.env.SVC_PAYSTACK_SECRET_KEY;
  if (!secret) {
    // Not configured in this environment; acknowledge nothing.
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");
  const expected = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  if (!signature || signature !== expected) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const data = event?.data ?? {};
  const metadata = data.metadata ?? {};

  // Draw ticket purchases: same dedup as the callback path, so whichever
  // of the two sees the payment first records it and the other finds a
  // duplicate.
  if (metadata.kind === "svc_draw_tickets" && event.event === "charge.success") {
    const reference = String(data.reference ?? "");
    if (reference && metadata.svc_member_id && metadata.svc_draw_id) {
      const { recordTicketPurchase } = await import("@/lib/svc/draw-purchase");
      await recordTicketPurchase({
        drawId: metadata.svc_draw_id,
        memberId: metadata.svc_member_id,
        count: Number(metadata.svc_ticket_count ?? 1) || 1,
        amountCents: typeof data.amount === "number" ? data.amount : 0,
        reference,
      });
    }
    return NextResponse.json({ received: true });
  }

  // Only SVC's own checkouts are acted on. Anything else that lands here
  // is acknowledged so Paystack stops retrying, and logged so a
  // misconfigured webhook is visible.
  if (metadata.kind !== "svc_membership") {
    console.warn("SVC webhook received non-SVC event", event?.event, metadata?.kind);
    return NextResponse.json({ received: true });
  }

  if (event.event !== "charge.success") {
    return NextResponse.json({ received: true });
  }

  const reference = String(data.reference ?? "");
  if (!reference) return NextResponse.json({ received: true });

  const subscriptionId = metadata.svc_subscription_id;
  const memberId = metadata.svc_member_id;
  if (!subscriptionId || !memberId) {
    console.error("SVC charge.success missing metadata ids", metadata);
    return NextResponse.json({ received: true });
  }

  // Shared with the callback-verify path on /svc/welcome; the dedup on
  // the provider reference inside makes the two paths idempotent, so a
  // payment seen by both activates exactly once.
  const result = await activateSvcMembership({
    reference,
    eventType: event.event,
    memberId,
    subscriptionId,
    amountCents: typeof data.amount === "number" ? data.amount : null,
    interval: metadata.svc_interval,
    customerCode: data.customer?.customer_code ?? null,
    planCode: data.plan?.plan_code ?? data.plan ?? null,
    payload: event,
  });
  if (!result.activated && !result.duplicate) {
    return NextResponse.json({ error: "store_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
