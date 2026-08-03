import { NextResponse } from "next/server";
import crypto from "crypto";
import { createSvcClient } from "@/lib/svc/db";
import { sendEmail } from "@/lib/email/resend";
import { SVC_ORIGIN } from "@/lib/svc/host";

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

  const db = createSvcClient();

  // The dedup insert. A second delivery of the same reference violates the
  // unique constraint and the event is done.
  const { error: dedupError } = await db.from("payment_event").insert({
    provider: "paystack",
    provider_reference: reference,
    event_type: event.event,
    member_id: metadata.svc_member_id ?? null,
    subscription_id: metadata.svc_subscription_id ?? null,
    amount_cents: typeof data.amount === "number" ? data.amount : null,
    payload: event,
  });
  if (dedupError) {
    if (dedupError.code === "23505") return NextResponse.json({ received: true });
    console.error("SVC payment event insert failed", dedupError);
    return NextResponse.json({ error: "store_failed" }, { status: 500 });
  }

  const subscriptionId = metadata.svc_subscription_id;
  const memberId = metadata.svc_member_id;
  if (!subscriptionId || !memberId) {
    console.error("SVC charge.success missing metadata ids", metadata);
    return NextResponse.json({ received: true });
  }

  const now = new Date();
  const periodEnd = new Date(now);
  if (metadata.svc_interval === "annual") periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  else periodEnd.setMonth(periodEnd.getMonth() + 1);

  const { error: subError } = await db
    .from("subscription")
    .update({
      status: "active",
      started_at: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      provider_customer_code: data.customer?.customer_code ?? null,
      provider_plan_code: data.plan?.plan_code ?? data.plan ?? null,
      updated_at: now.toISOString(),
    })
    .eq("id", subscriptionId);
  if (subError) console.error("SVC subscription activation failed", subError);

  const { error: memberError } = await db
    .from("member")
    .update({ status: "active", updated_at: now.toISOString() })
    .eq("id", memberId);
  if (memberError) console.error("SVC member activation failed", memberError);

  // The confirmation email, best effort and never blocking the 200 that
  // stops Paystack retrying.
  const { data: member } = await db
    .from("member")
    .select("email, first_name")
    .eq("id", memberId)
    .maybeSingle();

  if (member?.email) {
    const { ok, error: mailError } = await sendEmail({
      to: member.email,
      subject: "Welcome to Smart Value Club",
      fromName: "Smart Value Club",
      html: `
        <p style="font-size:15px;line-height:1.65;color:#1a1a1a;margin:0 0 16px;">Good day ${member.first_name},</p>
        <p style="font-size:15px;line-height:1.65;color:#1a1a1a;margin:0 0 16px;">
          Your Smart Value Club membership is active. Your benefits are issued on the
          1st of every month, and we will email you the moment they are ready.
        </p>
        <p style="font-size:15px;line-height:1.65;color:#1a1a1a;margin:0 0 16px;">
          Your dashboard shows your coupons, your draw entries and the Rand value you
          have actually saved.
        </p>
        <p style="margin:24px 0;">
          <a href="${SVC_ORIGIN}/account" style="display:inline-block;background:#1a6b3c;color:#ffffff;font-size:15px;font-weight:700;padding:13px 26px;text-decoration:none;">Open my dashboard</a>
        </p>
        <p style="font-size:15px;line-height:1.65;color:#1a1a1a;margin:0;">Welcome to the club.<br />Smart Value Club</p>
      `,
    });
    if (!ok) console.error("SVC welcome email failed", mailError);
  }

  return NextResponse.json({ received: true });
}
