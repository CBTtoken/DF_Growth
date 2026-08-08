import { planCodeForTier, amountForTier, type Tier, type BillingInterval } from "@/lib/paystack/plans";

// Combined spec Sec 32.3 step 7: factored out of src/app/api/checkout/finish
// so the WhatsApp payment step (lib/whatsapp/conversation.ts) can generate
// the same real Paystack Initialize Transaction link and just send it as
// text, instead of redirecting a browser to it — same metadata shape
// either way, so the existing webhook's charge.success handling activates
// a WhatsApp-originated account exactly the same way it does a web one, no
// webhook changes needed.
export async function initializePaystackCheckout({
  growthClientId,
  email,
  tier,
  interval,
  callbackUrl,
}: {
  growthClientId: string;
  email: string;
  tier: Tier;
  interval: BillingInterval;
  callbackUrl: string;
}): Promise<{ authorizationUrl: string } | { error: string }> {
  const planCode = planCodeForTier(tier, interval);
  const amount = await amountForTier(tier, interval);

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
      callback_url: callbackUrl,
      metadata: { growth_client_id: growthClientId },
    }),
  });

  const data = await res.json();

  if (!data.status || !data.data?.authorization_url) {
    console.error("Failed to initialize Paystack checkout", data);
    return { error: "initialize_failed" };
  }

  return { authorizationUrl: data.data.authorization_url };
}

// Sprint "Onboarding two doors" item 1: the done-for-you door's single
// checkout, R450 plus the member's first subscription period, as one
// amount on one Paystack page.
//
// It cannot be done with a plan code. Verified against Paystack's live
// documentation on 7 August 2026: attaching `plan` to transaction/initialize
// makes Paystack charge the plan's own amount and ignore the value passed
// in `amount` (the existing note on amountForTier says an explicit amount is
// still *required* in the request, which is a separate thing — it is
// required but not honoured). So a plan-based transaction can only ever
// charge R180, never R630.
//
// The shape that does work, and the one used here: charge the combined
// total once as an ordinary transaction, then create the subscription from
// the authorization that charge leaves behind, dated to start one period
// later so the member is not billed twice for the same month. That second
// half happens in the webhook, once the money is actually in
// (lib/paystack/subscriptions.ts, createSubscriptionFromAuthorization).
export async function initializeBuildOrderCheckout({
  growthClientId,
  email,
  tier,
  interval,
  buildAmount,
  callbackUrl,
}: {
  growthClientId: string;
  email: string;
  tier: Tier;
  interval: BillingInterval;
  buildAmount: number;
  callbackUrl: string;
}): Promise<{ authorizationUrl: string; total: number } | { error: string }> {
  // Sourced from the Paystack Plan rather than hardcoded, same as every
  // other checkout in this file, so the subscription the webhook creates
  // later charges exactly what the member was quoted here.
  const firstPeriod = await amountForTier(tier, interval);
  const total = buildAmount + firstPeriod;

  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount: total,
      currency: "ZAR",
      callback_url: callbackUrl,
      // No `plan` here on purpose. See the comment above: adding one would
      // silently drop the R450 and charge the plan amount alone.
      metadata: {
        growth_client_id: growthClientId,
        build_order: "true",
        build_tier: tier,
        build_interval: interval,
        build_amount_cents: String(buildAmount),
      },
    }),
  });

  const data = await res.json();

  if (!data.status || !data.data?.authorization_url) {
    console.error("Failed to initialize build order checkout", data);
    return { error: "initialize_failed" };
  }

  return { authorizationUrl: data.data.authorization_url, total };
}

// STANDING365_LANDING_BUILD_SPEC_CLAUDE.md Sec 5: a book order is a single
// one-time charge, not a subscription — no plan code, amount passed
// directly (Paystack's smallest-currency-unit convention, so cents for
// ZAR, matching amountForTier's own unmodified pass-through above).
export async function initializeOneTimeCheckout({
  email,
  amount,
  callbackUrl,
  metadata,
}: {
  email: string;
  amount: number;
  callbackUrl: string;
  metadata: Record<string, string>;
}): Promise<{ authorizationUrl: string } | { error: string }> {
  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount,
      currency: "ZAR",
      callback_url: callbackUrl,
      metadata,
    }),
  });

  const data = await res.json();

  if (!data.status || !data.data?.authorization_url) {
    console.error("Failed to initialize one-time Paystack checkout", data);
    return { error: "initialize_failed" };
  }

  return { authorizationUrl: data.data.authorization_url };
}
