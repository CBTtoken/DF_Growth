import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { provisionGrowthClient } from "@/lib/growth-client/provision";

// CLAUDE.md Section 2.1. Only charge.success is handled: Paystack also fires
// subscription.create for the same payment when a plan is attached to
// transaction/initialize, but that event's data.metadata is not populated
// with the custom metadata set at transaction/initialize time (confirmed by
// testing — it came back empty), so acting on it produced a second, wrong
// growth_clients row with the business name falling back to the email and
// the tier falling back to "foundation". charge.success reliably carries the
// metadata, so it's the only trigger. This means paystack_subscription_code
// stays null for now; backfilling it needs a separate reconciliation once
// something actually reads that column.
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  const expected = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
    .update(rawBody)
    .digest("hex");

  if (signature !== expected) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  if (event.event !== "charge.success") {
    return NextResponse.json({ received: true });
  }

  const { customer, metadata, reference } = event.data;
  const email: string | undefined = customer?.email;
  const businessName: string | undefined = metadata?.business_name;
  const tier: string | undefined = metadata?.tier;
  // Set only by src/app/api/trial/convert — identifies this charge as an
  // existing Foundation trial converting to paid, not a brand-new signup.
  const trialClientId: string | undefined = metadata?.growth_client_id;

  if (!reference || (!trialClientId && (!email || !businessName || !tier))) {
    console.error("charge.success missing expected metadata", { email, businessName, tier, reference, trialClientId });
    return NextResponse.json({ received: true });
  }

  const admin = createAdminClient();

  // Found via a real stress test: the old idempotency check was keyed on
  // slug (derived from business_name), which meant any two businesses that
  // ever picked the same name — not just concurrent signups, any two, ever
  // — would collide. The second one would already have been charged by
  // Paystack, then silently fail to get a growth_clients row at all: no
  // account, no email, no admin visibility, nothing. Idempotency now keys on
  // Paystack's own transaction reference, which is the actually-correct
  // signal for "have I already processed this specific charge" (Paystack
  // redelivers webhook events; this is the case that check is really for).
  // Slug collisions are a separate, expected case — handled by
  // provisionGrowthClient disambiguating the slug, not rejecting the signup.
  const { data: existing } = await admin
    .from("growth_clients")
    .select("id")
    .eq("paystack_reference", reference)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ received: true });
  }

  // Trial conversion: the account, slug, and onboarding are already done —
  // this charge just switches billing on and lifts the pause a lapsed trial
  // may have set (src/app/api/cron/trial-reminders).
  if (trialClientId) {
    // paystack_subscription_code stays untouched here — charge.success's
    // payload doesn't reliably carry it (same limitation noted for
    // brand-new signups above), needs a separate reconciliation pass once
    // something actually reads that column.
    const { error } = await admin
      .from("growth_clients")
      .update({
        status: "active",
        paystack_reference: reference,
      })
      .eq("id", trialClientId);

    if (error) {
      console.error("Failed to convert trial to paid", error);
    }
    return NextResponse.json({ received: true });
  }

  const result = await provisionGrowthClient({
    businessName: businessName!,
    email: email!,
    plan: tier as "foundation" | "growth_engine" | "enterprise",
    status: "pending_intake",
    paystackReference: reference,
  });

  if ("error" in result) {
    console.error("Failed to provision growth_client from webhook", result.error);
  }

  return NextResponse.json({ received: true });
}
