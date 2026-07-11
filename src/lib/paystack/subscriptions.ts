// growth_clients.paystack_subscription_code has never actually been
// populated (see the comment in the webhook — charge.success's payload
// doesn't reliably carry it, and reconciling it properly was deferred).
// Rather than fix that capture path first, this looks the subscription up
// on demand by the client's own email whenever a cancel/upgrade actually
// happens — one extra API call, but it works today without a backfill and
// isn't reliant on a webhook having fired correctly in the past.
export async function findActiveSubscription(
  email: string
): Promise<{ subscriptionCode: string; emailToken: string; planCode: string } | null> {
  const res = await fetch(`https://api.paystack.co/subscription?customer=${encodeURIComponent(email)}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
  });

  if (!res.ok) return null;

  const data = await res.json();
  const subscriptions: {
    status: string;
    subscription_code: string;
    email_token: string;
    plan?: { plan_code?: string };
  }[] = data.data ?? [];

  // "active" is Paystack's real ongoing-and-billing state. A subscription
  // already marked "non-renewing" (someone cancelled it a different way,
  // e.g. directly in the Paystack dashboard) shouldn't be treated as
  // something still live to disable.
  const active = subscriptions.find((s) => s.status === "active");
  if (!active) return null;

  return {
    subscriptionCode: active.subscription_code,
    emailToken: active.email_token,
    planCode: active.plan?.plan_code ?? "",
  };
}

export async function disableSubscription(
  subscriptionCode: string,
  emailToken: string
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("https://api.paystack.co/subscription/disable", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code: subscriptionCode, token: emailToken }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { ok: false, error: `Paystack ${res.status}: ${body}` };
  }

  return { ok: true };
}
