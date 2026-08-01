import "server-only";

export type MoxieInterval = "monthly" | "annual";

export const MOXIE_PLANS: {
  interval: MoxieInterval;
  name: string;
  priceLabel: string;
  note: string;
}[] = [
  {
    interval: "monthly",
    name: "Monthly",
    priceLabel: "R49 a month",
    note: "Every new edition, from the month you join. Cancel whenever you like.",
  },
  {
    interval: "annual",
    name: "Annual",
    priceLabel: "R490 a year",
    note: "Two months free. Every new edition for a year.",
  },
];

function planCodeEnvVar(interval: MoxieInterval): string {
  return interval === "annual"
    ? "PAYSTACK_PLAN_MOXIE_ANNUAL"
    : "PAYSTACK_PLAN_MOXIE_MONTHLY";
}

export function planCodeForInterval(interval: MoxieInterval): string {
  const envVar = planCodeEnvVar(interval);
  const code = process.env[envVar];
  if (!code) throw new Error(`Missing env var ${envVar}`);
  return code;
}

/**
 * Paystack's transaction/initialize wants an explicit amount even when a
 * plan is attached; it does not derive the amount from the plan. Fetched
 * from the plan rather than hardcoded, so the price genuinely lives in
 * Paystack's own configuration, which is what CLAUDE.md section 2.2 asks
 * for and what makes a price change a dashboard edit rather than a deploy.
 */
export async function amountForInterval(interval: MoxieInterval): Promise<number> {
  const planCode = planCodeForInterval(interval);
  const res = await fetch(`https://api.paystack.co/plan/${planCode}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    cache: "no-store",
  });
  const data = await res.json();
  if (!data.status || typeof data.data?.amount !== "number") {
    throw new Error(`Could not fetch amount for Moxie plan ${planCode}`);
  }
  return data.data.amount;
}

/**
 * Starts a membership checkout.
 *
 * metadata.kind is what the webhook branches on. It has to be specific
 * enough that a Moxie payment is never mistaken for a Growth tier
 * subscription arriving on the same webhook endpoint, which is the failure
 * that would activate the wrong product for a paying customer.
 */
export async function initializeMembershipCheckout({
  email,
  userId,
  interval,
  callbackUrl,
}: {
  email: string;
  userId: string;
  interval: MoxieInterval;
  callbackUrl: string;
}): Promise<{ authorizationUrl: string } | { error: string }> {
  const planCode = planCodeForInterval(interval);
  const amount = await amountForInterval(interval);

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
      metadata: { kind: "moxie_membership", moxie_user_id: userId, moxie_interval: interval },
    }),
  });

  const data = await res.json();
  if (!data.status || !data.data?.authorization_url) {
    console.error("Failed to initialize Moxie membership checkout", data);
    return { error: "initialize_failed" };
  }
  return { authorizationUrl: data.data.authorization_url };
}
