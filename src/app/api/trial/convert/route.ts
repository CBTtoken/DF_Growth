import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { planCodeForTier, amountForTier } from "@/lib/paystack/plans";

// Linked from the day-5 and day-7 trial emails (src/app/api/cron/trial-reminders).
// Initializes a normal Paystack checkout for the Foundation plan, but tags
// the transaction with the client's existing growth_client_id so the
// webhook (src/app/api/webhooks/paystack) updates that row instead of
// creating a new one — this is the only difference from a brand-new
// signup's checkout.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("client");

  if (!clientId) {
    return NextResponse.json({ error: "Missing client" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: client } = await admin
    .from("growth_clients")
    .select("id, contact_email, plan")
    .eq("id", clientId)
    .eq("plan", "foundation")
    .single();

  if (!client || !client.contact_email) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const planCode = planCodeForTier("foundation");
  const amount = await amountForTier("foundation");
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
      metadata: { growth_client_id: client.id },
    }),
  });

  const data = await res.json();

  if (!data.status || !data.data?.authorization_url) {
    return NextResponse.json({ error: data.message ?? "Could not start checkout" }, { status: 502 });
  }

  return NextResponse.redirect(data.data.authorization_url);
}
