import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { planCodeForTier, amountForTier, type BillingInterval, type Tier } from "@/lib/paystack/plans";

// Linked from the day-5 and day-7 trial emails (src/app/api/cron/trial-reminders),
// and reusable for any admin-provisioned trial regardless of tier (e.g. a
// custom-built page given a comped Growth trial with no self-serve wizard
// involved). Initializes a normal Paystack checkout for the client's own
// current plan, but tags the transaction with the client's existing
// growth_client_id so the webhook (src/app/api/webhooks/paystack) updates
// that row instead of creating a new one — this is the only difference from
// a brand-new signup's checkout. Originally hardcoded to "foundation" only
// (the sole real case at the time); the webhook's own trialClientId branch
// was already tier-agnostic, so this just stopped being the one place still
// assuming Foundation.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("client");
  const interval = (searchParams.get("interval") ?? "monthly") as BillingInterval;

  if (!clientId) {
    return NextResponse.json({ error: "Missing client" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: client } = await admin
    .from("growth_clients")
    .select("id, contact_email, plan, status")
    .eq("id", clientId)
    .in("status", ["pending_intake", "active"])
    .single();

  if (!client || !client.contact_email) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const tier = client.plan as Tier;
  const planCode = planCodeForTier(tier, interval);
  const amount = await amountForTier(tier, interval);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;

  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: client.contact_email,
      amount,
      plan: planCode,
      currency: "ZAR",
      callback_url: `${siteUrl}/dashboard`,
      metadata: { growth_client_id: client.id, interval },
    }),
  });

  const data = await res.json();

  if (!data.status || !data.data?.authorization_url) {
    return NextResponse.json({ error: data.message ?? "Could not start checkout" }, { status: 502 });
  }

  return NextResponse.redirect(data.data.authorization_url);
}
