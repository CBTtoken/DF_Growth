import "server-only";

/**
 * SVC's payment provider interface, and the boundary the handoff (3.1)
 * draws in ink:
 *
 * - SVC's own Paystack account is in application. Until it is live, only
 *   TEST MODE keys go in these env vars, and no Digital Flyer live key is
 *   ever read here. The env names are SVC's own (SVC_PAYSTACK_SECRET_KEY),
 *   so pointing this code at the Growth account would take a deliberate
 *   act, not a typo.
 * - Every payment path (subscriptions now; draw tickets and payouts later)
 *   goes through this file, so the live SVC account drops in through
 *   configuration, not code.
 * - The existing live webhook at /api/webhooks/paystack is not touched in
 *   any way. SVC has its own route at /api/svc/webhooks/paystack.
 */

export type SvcBillingInterval = "monthly" | "annual";

export function svcPaystackSecretKey(): string | null {
  return process.env.SVC_PAYSTACK_SECRET_KEY ?? null;
}

/** True when the configured key is a Paystack test key. */
export function svcPaymentsConfigured(): boolean {
  const key = svcPaystackSecretKey();
  return !!key;
}

/**
 * Starts a membership checkout for a member on a package.
 *
 * If a Paystack plan code is set on the subscription's package the charge
 * attaches to it; otherwise it is a plain first-month charge, which is
 * enough for the test-mode acceptance flow until plans exist in the SVC
 * test account. metadata.kind is what the SVC webhook branches on, and it
 * is deliberately distinct from every kind the Growth webhook knows.
 */
export async function initializeSvcCheckout({
  email,
  amountCents,
  planCode,
  callbackUrl,
  memberId,
  subscriptionId,
  packageId,
  interval,
}: {
  email: string;
  amountCents: number;
  planCode?: string | null;
  callbackUrl: string;
  memberId: string;
  subscriptionId: string;
  packageId: string;
  interval: SvcBillingInterval;
}): Promise<{ authorizationUrl: string } | { error: string }> {
  const key = svcPaystackSecretKey();
  if (!key) return { error: "not_configured" };

  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount: amountCents,
      currency: "ZAR",
      callback_url: callbackUrl,
      ...(planCode ? { plan: planCode } : {}),
      metadata: {
        kind: "svc_membership",
        svc_member_id: memberId,
        svc_subscription_id: subscriptionId,
        svc_package_id: packageId,
        svc_interval: interval,
      },
    }),
  });

  const data = await res.json();
  if (!data.status || !data.data?.authorization_url) {
    console.error("SVC Paystack initialize failed", data);
    return { error: "initialize_failed" };
  }
  return { authorizationUrl: data.data.authorization_url };
}

export type VerifiedTransaction = {
  reference: string;
  amountCents: number;
  customerCode: string | null;
  planCode: string | null;
  metadata: {
    kind?: string;
    svc_member_id?: string;
    svc_subscription_id?: string;
    svc_package_id?: string;
    svc_interval?: string;
  };
};

/**
 * Server-side verification of a transaction by reference, against
 * Paystack's own API with SVC's key. This is what makes activation work
 * with NO webhook at all: the callback page verifies the reference it was
 * handed rather than trusting it. Required while SVC borrows the shared
 * DF test account, whose webhook must never be repointed (handoff 3.1:
 * repointing it has broken WhatsApp delivery before).
 */
export async function verifySvcTransaction(
  reference: string
): Promise<VerifiedTransaction | null> {
  const key = svcPaystackSecretKey();
  if (!key || !reference) return null;

  const res = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" }
  );
  const data = await res.json();
  if (!data.status || data.data?.status !== "success") return null;

  return {
    reference: String(data.data.reference ?? reference),
    amountCents: typeof data.data.amount === "number" ? data.data.amount : 0,
    customerCode: data.data.customer?.customer_code ?? null,
    planCode: data.data.plan?.plan_code ?? data.data.plan ?? null,
    metadata: data.data.metadata ?? {},
  };
}
