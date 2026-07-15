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
