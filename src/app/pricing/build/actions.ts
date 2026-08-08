"use server";

import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { buildOrderSchema } from "@/lib/schemas/build-order";
import { provisionGrowthClient } from "@/lib/growth-client/provision";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited, clientIpFromHeaders } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { initializeBuildOrderCheckout } from "@/lib/paystack/checkout";
import { BUILD_ORDER_AMOUNT_CENTS } from "@/lib/growth-client/build-order";
import { REFERRAL_COOKIE_NAME } from "@/lib/agents/referral-cookie";
import { resolveReferralAttribution } from "@/lib/agents/attribution";

export type BuildOrderState = {
  error?: Record<string, string[]> & { _form?: string[] };
} | null;

// Sprint "Onboarding two doors" item 1: the "let us build it for you" door.
//
// Order of operations matters and is the same standing principle
// pricing/actions.ts records: capture the prospect first, take payment
// last. The handoff's own wording was "on payment: provision the account",
// but doing it that way makes a drop-off at the Paystack redirect
// completely invisible, which is the exact bug that principle was written
// to prevent. So the account is created here, before the redirect, flagged
// awaiting_payment, and the webhook promotes it to a real paid build order.
// A member who abandons at the card screen is a row Dewald can see and
// follow up, not a silence.
export async function startBuildOrder(
  _prevState: BuildOrderState,
  formData: FormData
): Promise<BuildOrderState> {
  const hdrs = await headers();
  const cookieStore = await cookies();
  const ip = clientIpFromHeaders(hdrs);

  // Same budget as the ordinary signup form next door. Generous for a real
  // prospect, tight enough to stop a loop.
  if (isRateLimited(`build-order:${ip}`, 5, 10 * 60 * 1000)) {
    return { error: { _form: ["Too many attempts, please wait a few minutes and try again."] } };
  }

  // CLAUDE.md, absolute rule: every anonymous form verifies a Turnstile
  // token server-side before it does anything. Checked before the schema so
  // a bot cannot use validation errors to probe the form's shape.
  const human = await verifyTurnstileToken(String(formData.get("turnstileToken") ?? ""), ip);
  if (!human) {
    return { error: { _form: ["We could not confirm you are a person. Please try again."] } };
  }

  const parsed = buildOrderSchema.safeParse({
    businessName: formData.get("businessName"),
    industry: formData.get("industry"),
    ownWords: formData.get("ownWords"),
    callPhone: formData.get("callPhone"),
    whatsappPhone: formData.get("whatsappPhone"),
    businessAddress: formData.get("businessAddress"),
    email: formData.get("email"),
    confirmEmail: formData.get("confirmEmail"),
    tier: formData.get("tier"),
    interval: formData.get("interval"),
    consent: formData.get("consent"),
    marketingConsent: formData.get("marketingConsent") || undefined,
  });

  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    return {
      error: {
        ...flattened.fieldErrors,
        confirmEmail: [...(flattened.fieldErrors.confirmEmail ?? []), ...flattened.formErrors],
      },
    };
  }

  const data = parsed.data;
  const consentedAt = new Date().toISOString();

  // Agent Referral Programme Sec 5: this Server Action is the only point in
  // the flow with cookie access, so attribution is resolved here, exactly
  // as the ordinary signup does it.
  const referralCookie = cookieStore.get(REFERRAL_COOKIE_NAME)?.value;
  const referralParam = formData.get("ref");
  const referralCode =
    referralCookie ?? (typeof referralParam === "string" && referralParam.trim() ? referralParam.trim() : undefined);
  const referredByAgentId = await resolveReferralAttribution({
    cookieCode: referralCode,
    signupEmail: data.email,
  });

  const result = await provisionGrowthClient({
    businessName: data.businessName,
    email: data.email,
    plan: data.tier,
    status: "pending_intake",
    // No transaction exists yet, same as the ordinary signup. The webhook
    // keys idempotency on Paystack's own reference when it arrives.
    paystackReference: null,
    consentedAt,
    marketingConsent: data.marketingConsent === "on",
    billingCycle: data.interval,
    // Founding status is granted on real payment in the webhook, never
    // reserved before the money lands.
    foundingSignupNumber: null,
    referredByAgentId,
  });

  if ("error" in result) {
    return { error: { _form: ["Could not start your order, please try again."] } };
  }

  // Everything the build itself needs, written now while we have it. These
  // are ordinary member fields, not build-order-only ones, so the member
  // can edit every one of them from their own dashboard afterwards, which
  // is the Build Kit's B1 test.
  const admin = createAdminClient();
  await admin
    .from("growth_clients")
    .update({
      industry: data.industry,
      call_phone: data.callPhone,
      whatsapp_phone: data.whatsappPhone,
      business_address: data.businessAddress,
      business_description: data.ownWords,
      build_order_status: "awaiting_payment",
      build_order_brief: data.ownWords,
      build_order_amount_cents: BUILD_ORDER_AMOUNT_CENTS,
      setup_service_requested_at: consentedAt,
    })
    .eq("id", result.id);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;
  const checkout = await initializeBuildOrderCheckout({
    growthClientId: result.id,
    email: data.email,
    tier: data.tier,
    interval: data.interval,
    buildAmount: BUILD_ORDER_AMOUNT_CENTS,
    callbackUrl: `${siteUrl}/pricing/build/thank-you`,
  });

  if ("error" in checkout) {
    // The account exists and is flagged awaiting_payment, so this is a
    // recoverable state rather than a lost prospect: Dewald sees the row
    // and can send a payment link by hand.
    return {
      error: {
        _form: ["We could not open the payment page. Your details are saved, please try again or contact us."],
      },
    };
  }

  redirect(checkout.authorizationUrl);
}
