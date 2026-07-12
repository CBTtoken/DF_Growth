import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireGrowthClientId } from "@/lib/auth/require-growth-client";
import type { BillingInterval } from "@/lib/paystack/plans";
import { initializePaystackCheckout } from "@/lib/paystack/checkout";

// Combined spec Sec 10: the final step of the onboarding wizard for any
// paid tier (growth_engine today; enterprise shares this same generic path
// but has no live checkout button yet) — Foundation never reaches this, it
// has no payment step at signup at all. Unlike /api/trial/convert and
// /api/plan/upgrade (both reached from unauthenticated email links, so they
// trust a ?client= query param), this route is only ever linked to from
// inside the wizard, where the visitor is already signed in — so it reads
// the plan/billing_cycle to charge from their own already-provisioned row
// via the session, not from anything the request could tamper with.
export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;
  const client = await requireGrowthClientId();

  if (client.error) {
    return NextResponse.redirect(`${siteUrl}/login`);
  }

  const admin = createAdminClient();
  const { data: growthClient } = await admin
    .from("growth_clients")
    .select("id, contact_email, plan, billing_cycle")
    .eq("id", client.id)
    // Guards against a client re-hitting this link after they've already
    // paid (e.g. the back button after a successful checkout) starting a
    // second, redundant Paystack transaction.
    .eq("status", "pending_intake")
    .single();

  if (!growthClient || !growthClient.contact_email || growthClient.plan === "foundation") {
    return NextResponse.redirect(`${siteUrl}/dashboard`);
  }

  const interval = (growthClient.billing_cycle ?? "monthly") as BillingInterval;
  const tier = growthClient.plan as "growth_engine" | "enterprise";

  const result = await initializePaystackCheckout({
    growthClientId: growthClient.id,
    email: growthClient.contact_email,
    tier,
    interval,
    callbackUrl: `${siteUrl}/pricing/success`,
  });

  if ("error" in result) {
    // Back to the wizard rather than a bare error page — status is still
    // pending_intake, so onboard/page.tsx's resume-logic lands them right
    // back on this same payment step to retry.
    return NextResponse.redirect(`${siteUrl}/onboard`);
  }

  return NextResponse.redirect(result.authorizationUrl);
}
