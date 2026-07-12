"use server";

import { redirect } from "next/navigation";
import { startCheckoutSchema } from "@/lib/schemas/pricing";
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

// Combined spec Sec 10, confirmed as a standing principle (not a one-off
// fix): capture the prospect's information first, take payment last, on
// any flow where payment applies. growth_engine (and enterprise, which
// shares this same generic path today, though it has no live checkout
// button yet) used to pay upfront right here before ever seeing the
// onboarding wizard — if someone dropped off at the Paystack redirect,
// DigitalFlyer had no record of them at all. Now every non-Foundation tier
// provisions immediately, the same no-payment-yet way Foundation's trial
// already did, and pays at the very end of the wizard instead (see
// src/app/api/checkout/finish, the new final wizard step). Foundation
// itself is untouched — still a genuine no-card trial, never a payment
// step at signup at all.
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
      // Foundation has no annual option today — always "monthly" (matches
      // the sprint doc's own note on this). Never eligible for founding
      // status regardless: confirmed 2026-07-11 that only Growth's annual
      // plan qualifies.
      billingCycle: "monthly",
      foundingSignupNumber: null,
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

  const result = await provisionGrowthClient({
    businessName,
    email,
    plan: tier,
    status: "pending_intake",
    // No Paystack transaction has happened yet — payment is now the
    // wizard's final step (src/app/api/checkout/finish), not this one. A
    // real double-submit of this form just makes two pending accounts,
    // same tradeoff Foundation's trial signup already accepts.
    paystackReference: null,
    consentedAt,
    billingCycle: interval === "annual" ? "annual" : "monthly",
    // Founding-member number is assigned only once payment actually
    // succeeds (src/app/api/webhooks/paystack), not here — reserving one
    // of the 10 real founding slots before anyone's paid would defeat the
    // point of capping it.
    foundingSignupNumber: null,
  });

  if ("error" in result) {
    return { error: { _form: ["Could not start your signup, please try again."] } };
  }

  redirect("/pricing/signup-started");
}
