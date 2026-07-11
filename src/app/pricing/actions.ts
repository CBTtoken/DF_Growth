"use server";

import { redirect } from "next/navigation";
import { startCheckoutSchema } from "@/lib/schemas/pricing";
import { planCodeForTier, amountForTier } from "@/lib/paystack/plans";
import { provisionGrowthClient } from "@/lib/growth-client/provision";

type CheckoutState = {
  error?: {
    businessName?: string[];
    email?: string[];
    tier?: string[];
    consent?: string[];
    _form?: string[];
  };
} | null;

// CLAUDE.md Section 2.1, updated 2026-07-11: Foundation is now a 7-day free
// trial with no card at signup, so it can't go through Paystack checkout at
// all — there's no charge.success event to provision the account from.
// growth_engine and enterprise still pay upfront the same way they always
// did; the Paystack webhook (not this action) does their provisioning once
// payment succeeds.
export async function startCheckout(
  _prevState: CheckoutState,
  formData: FormData
): Promise<CheckoutState> {
  const parsed = startCheckoutSchema.safeParse({
    businessName: formData.get("businessName"),
    email: formData.get("email"),
    tier: formData.get("tier"),
    interval: formData.get("interval") || undefined,
    consent: formData.get("consent"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { businessName, email, tier, interval } = parsed.data;
  const consentedAt = new Date().toISOString();

  if (tier === "foundation") {
    const result = await provisionGrowthClient({
      businessName,
      email,
      plan: "foundation",
      status: "pending_intake",
      // No payment ever happens at signup for a trial, so there's no
      // Paystack transaction reference to key idempotency on — a real
      // double-submit of this form just makes two accounts, same as any
      // other unauthenticated form without a payment gate. Acceptable for
      // the pilot; the slug disambiguation at least keeps both usable.
      paystackReference: null,
      consentedAt,
    });

    if ("error" in result) {
      return { error: { _form: ["Could not start your trial, please try again."] } };
    }

    // Not /onboard directly — that just shows whatever session happens to
    // already be active in this browser, which is wrong the moment it
    // isn't a brand new one (see the comment on this page for the real
    // bug this caused). The new user isn't actually logged in until they
    // click the magic link that was just emailed to them.
    redirect("/pricing/trial-started");
  }

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
      email,
      amount,
      plan: planCode,
      currency: "ZAR",
      callback_url: `${siteUrl}/pricing/success`,
      metadata: {
        business_name: businessName,
        tier,
        consent_timestamp: consentedAt,
      },
    }),
  });

  const data = await res.json();

  if (!data.status || !data.data?.authorization_url) {
    return { error: { _form: [data.message ?? "Could not start checkout, please try again."] } };
  }

  redirect(data.data.authorization_url);
}
