import { initializeOneTimeCheckout } from "@/lib/paystack/checkout";

// KatisoBiz billing: the paid upgrade and the document topup.
//
// Both are sold on the landing page and neither existed, so a free member
// had no way to pay us at all.
//
// Shape follows lib/paystack/checkout.ts rather than inventing a second
// pattern: amounts come from Paystack's own Plan configuration instead of
// being hardcoded here, so the price is changed in one place and the app
// follows.

export type BizUpPaidPlan = "paid" | "unlimited";

/** Documents added by one topup. Sold as "another 75 documents for R49". */
export const TOPUP_DOCUMENTS = 75;

/**
 * Every KatisoBiz charge carries this, so the shared Paystack webhook can
 * tell a KatisoBiz payment apart from a Growth subscription or a book
 * order. All three arrive at the same endpoint, because a Paystack account
 * only supports one webhook URL.
 */
export const BIZUP_PRODUCT_TAG = "bizup";

/**
 * The cutoff for "this payment, just now", as an ISO timestamp for a query
 * filter.
 *
 * Lives here rather than inline in the page because reading the clock
 * inside a component body is impure, and React's lint rules object to it
 * even in a Server Component that renders exactly once per request. Making
 * it a query filter is also the better shape: the database does the
 * comparison rather than every row being fetched and then discarded.
 */
export function recentBillingCutoff(minutes = 10): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

function planCodeFor(plan: BizUpPaidPlan): string {
  const envVar = plan === "unlimited" ? "PAYSTACK_PLAN_BIZUP_UNLIMITED" : "PAYSTACK_PLAN_BIZUP";
  const code = process.env[envVar];
  if (!code) throw new Error(`Missing env var ${envVar}`);
  return code;
}

/**
 * The plan's price, in cents, from Paystack.
 *
 * Paystack's transaction/initialize needs an explicit amount even when a
 * plan code is attached; it does not derive one from the plan. Fetching it
 * keeps the price genuinely sourced from the Plan config rather than
 * drifting from a number typed into the code.
 */
export async function bizupPlanAmountCents(plan: BizUpPaidPlan): Promise<number> {
  const planCode = planCodeFor(plan);
  const res = await fetch(`https://api.paystack.co/plan/${planCode}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
  });
  const data = await res.json();
  if (!data.status || typeof data.data?.amount !== "number") {
    throw new Error(`Could not fetch amount for KatisoBiz plan ${planCode}`);
  }
  return data.data.amount;
}

/**
 * A recurring subscription to one of the two paid plans.
 */
export async function initializeBizUpSubscription({
  accountId,
  email,
  plan,
  callbackUrl,
}: {
  accountId: string;
  email: string;
  plan: BizUpPaidPlan;
  callbackUrl: string;
}): Promise<{ authorizationUrl: string } | { error: string }> {
  const planCode = planCodeFor(plan);
  const amount = await bizupPlanAmountCents(plan);

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
      metadata: {
        product: BIZUP_PRODUCT_TAG,
        kind: "subscription",
        bizup_account_id: accountId,
        bizup_plan: plan,
      },
    }),
  });

  const data = await res.json();
  if (!data.status || !data.data?.authorization_url) {
    console.error("Failed to initialize KatisoBiz subscription", data);
    return { error: "We could not open the payment page. Please try again." };
  }
  return { authorizationUrl: data.data.authorization_url };
}

/**
 * A one-off topup: 75 more documents, at the same price as a month of the
 * paid plan.
 *
 * Priced from the paid plan rather than a separate Paystack product, so
 * the two cannot drift apart. Sec 2: topups never expire, which is why
 * this adds to a stored balance rather than to a monthly allowance.
 */
export async function initializeBizUpTopup({
  accountId,
  email,
  callbackUrl,
}: {
  accountId: string;
  email: string;
  callbackUrl: string;
}): Promise<{ authorizationUrl: string } | { error: string }> {
  const amount = await bizupPlanAmountCents("paid");

  return initializeOneTimeCheckout({
    email,
    amount,
    callbackUrl,
    metadata: {
      product: BIZUP_PRODUCT_TAG,
      kind: "topup",
      bizup_account_id: accountId,
      documents: String(TOPUP_DOCUMENTS),
    },
  });
}
