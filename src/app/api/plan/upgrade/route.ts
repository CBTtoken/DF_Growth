import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { planCodeForTier, amountForTier, type BillingInterval } from "@/lib/paystack/plans";
import { findActiveSubscription, disableSubscription } from "@/lib/paystack/subscriptions";

// Linked from the dashboard's "Upgrade to Growth" buttons. Disables any
// existing subscription first — a client already paying for Foundation
// who starts a new Growth checkout without this would end up on BOTH
// subscriptions, billed twice, since Paystack has no "replace my plan"
// endpoint, only separate create/disable calls. A Foundation client still
// on their free trial has nothing to disable yet; that's a normal case,
// not an error.
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
    .eq("status", "active")
    .single();

  if (!client || !client.contact_email) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (client.plan !== "foundation") {
    return NextResponse.json({ error: "Already on this plan or higher" }, { status: 400 });
  }

  const existing = await findActiveSubscription(client.contact_email);
  if (existing) {
    const result = await disableSubscription(existing.subscriptionCode, existing.emailToken);
    if (!result.ok) {
      console.error("Failed to disable existing subscription before upgrade", result.error);
      return NextResponse.json({ error: "Could not switch your plan, please try again or contact us." }, { status: 502 });
    }
  }

  const planCode = planCodeForTier("growth_engine", interval);
  const amount = await amountForTier("growth_engine", interval);
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
      metadata: { growth_client_id: client.id, upgrade_to: "growth_engine" },
    }),
  });

  const data = await res.json();

  if (!data.status || !data.data?.authorization_url) {
    return NextResponse.json({ error: data.message ?? "Could not start checkout" }, { status: 502 });
  }

  return NextResponse.redirect(data.data.authorization_url);
}
