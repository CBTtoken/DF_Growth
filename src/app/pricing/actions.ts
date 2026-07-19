"use server";

import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { startCheckoutSchema } from "@/lib/schemas/pricing";
import { provisionGrowthClient } from "@/lib/growth-client/provision";
import { isRateLimited, clientIpFromHeaders } from "@/lib/rate-limit";
import { REFERRAL_COOKIE_NAME } from "@/lib/agents/referral-cookie";
import { resolveReferralAttribution } from "@/lib/agents/attribution";

type CheckoutState = {
  error?: {
    businessName?: string[];
    email?: string[];
    confirmEmail?: string[];
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
  // Combined spec Sec 35: this is the one fully public, unauthenticated
  // endpoint that creates a real account — Foundation's trial in
  // particular has no payment gate at all, so a script could otherwise
  // mint accounts indefinitely. 5 attempts per 10 minutes per IP is
  // generous for a real prospect (who submits once, maybe twice after a
  // typo) but stops a tight loop.
  const ip = clientIpFromHeaders(await headers());
  if (isRateLimited(`checkout:${ip}`, 5, 10 * 60 * 1000)) {
    return { error: { _form: ["Too many attempts — please wait a few minutes and try again."] } };
  }

  const parsed = startCheckoutSchema.safeParse({
    businessName: formData.get("businessName"),
    email: formData.get("email"),
    confirmEmail: formData.get("confirmEmail"),
    tier: formData.get("tier"),
    interval: formData.get("interval") || undefined,
    consent: formData.get("consent"),
    marketingConsent: formData.get("marketingConsent") || undefined,
  });

  if (!parsed.success) {
    // Combined spec Sec 12: the email-match check is a top-level .refine,
    // not a per-field check, so zod's flatten() puts its message under
    // formErrors, not fieldErrors.confirmEmail — surface it there
    // explicitly so it still lands right under the confirm-email input
    // instead of only in the generic form-level error line.
    const flattened = parsed.error.flatten();
    return {
      error: {
        ...flattened.fieldErrors,
        confirmEmail: [...(flattened.fieldErrors.confirmEmail ?? []), ...flattened.formErrors],
      },
    };
  }

  const { businessName, email, tier, interval, marketingConsent } = parsed.data;
  const consentedAt = new Date().toISOString();

  // Agent Referral Programme Sec 5: resolved once here, used by both
  // branches below — this Server Action (invoked from a real browser
  // submission) is the only point in the whole signup flow with cookie
  // access; the Paystack webhook that later activates payment has none.
  const referralCookie = (await cookies()).get(REFERRAL_COOKIE_NAME)?.value;
  const referredByAgentId = await resolveReferralAttribution({
    cookieCode: referralCookie,
    signupEmail: email,
  });

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
      marketingConsent: marketingConsent === "on",
      // Foundation gained a real annual option 2026-07-19 (R900/year,
      // PLN_qf1kh46lwn5jxr1) — same interval choice Growth's card already
      // captured. Still never eligible for founding-member status either
      // way: confirmed 2026-07-11 that only Growth's annual plan qualifies.
      billingCycle: interval === "annual" ? "annual" : "monthly",
      foundingSignupNumber: null,
      referredByAgentId,
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
    marketingConsent: marketingConsent === "on",
    billingCycle: interval === "annual" ? "annual" : "monthly",
    // Founding-member number is assigned only once payment actually
    // succeeds (src/app/api/webhooks/paystack), not here — reserving one
    // of the 10 real founding slots before anyone's paid would defeat the
    // point of capping it.
    foundingSignupNumber: null,
    referredByAgentId,
  });

  if ("error" in result) {
    return { error: { _form: ["Could not start your signup, please try again."] } };
  }

  redirect("/pricing/signup-started");
}
