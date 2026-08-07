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

// Sprint "Onboarding two doors" item 1: the second half of the build
// door's single checkout. The R450-plus-first-period charge is an ordinary
// transaction with no plan attached, so Paystack creates no subscription on
// its own — this makes one from the authorization that charge left behind,
// dated to start one period later so the member is not billed twice for the
// period they have already paid for.
//
// Parameters verified against Paystack's live documentation on 7 August
// 2026: `customer` and `plan` are required, `authorization` selects which
// saved card to charge (without it Paystack picks the customer's most
// recent, which is usually right but not guaranteed), and `start_date` is
// an ISO 8601 timestamp setting the first debit.
export async function createSubscriptionFromAuthorization({
  customerCode,
  planCode,
  authorizationCode,
  startDate,
}: {
  customerCode: string;
  planCode: string;
  authorizationCode: string;
  startDate: Date;
}): Promise<{ subscriptionCode: string } | { error: string }> {
  const res = await fetch("https://api.paystack.co/subscription", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      customer: customerCode,
      plan: planCode,
      authorization: authorizationCode,
      start_date: startDate.toISOString(),
    }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.status || !data?.data?.subscription_code) {
    console.error("Failed to create subscription from authorization", {
      status: res.status,
      body: data,
    });
    return { error: `Paystack ${res.status}` };
  }

  return { subscriptionCode: data.data.subscription_code };
}

// When the member's next billing period starts, given what they already
// paid for at checkout. Monthly adds a calendar month and annual a calendar
// year, which is what a member expects ("you paid for August, you are
// billed again on 1 September"), rather than a fixed 30 or 365 days that
// would drift.
//
// Clamped to the end of the target month, because JavaScript's setMonth
// rolls over instead: 31 August plus one month is 1 October, not 30
// September, which would quietly bill a month-end signup a day late every
// time. 29 February is the same case a year out.
export function nextPeriodStart(from: Date, interval: "monthly" | "annual"): Date {
  const next = new Date(from.getTime());
  const day = next.getDate();

  // Move to the first of the target month before changing the month, so the
  // rollover cannot happen, then put the day back within that month's real
  // length.
  next.setDate(1);
  if (interval === "annual") next.setFullYear(next.getFullYear() + 1);
  else next.setMonth(next.getMonth() + 1);

  const daysInTargetMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, daysInTargetMonth));

  return next;
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
