// Jobs billing: the two recruiter tiers. Shape follows lib/bizup/billing.ts
// exactly: plan codes live in env vars, prices live in Paystack's own Plan
// configuration and are fetched rather than typed here, and every charge
// carries a metadata bag so the one shared webhook can tell a Jobs payment
// apart from everything else arriving at the same endpoint.

export type JobsPaidPlan = "starter" | "unlimited";

export const JOBS_PRODUCT_TAG = "jobs";

export function jobsPlanCodeFor(plan: JobsPaidPlan): string {
  const envVar = plan === "unlimited" ? "PAYSTACK_PLAN_JOBS_UNLIMITED" : "PAYSTACK_PLAN_JOBS_STARTER";
  const code = process.env[envVar];
  if (!code) throw new Error(`Missing env var ${envVar}`);
  return code;
}

/** Which paid plan a Paystack plan code belongs to, for renewal routing. */
export function jobsPlanForCode(planCode: string | undefined): JobsPaidPlan | null {
  if (!planCode) return null;
  if (planCode === process.env.PAYSTACK_PLAN_JOBS_UNLIMITED) return "unlimited";
  if (planCode === process.env.PAYSTACK_PLAN_JOBS_STARTER) return "starter";
  return null;
}

/**
 * The plan's price in cents, from Paystack. transaction/initialize needs
 * an explicit amount even with a plan code attached.
 */
export async function jobsPlanAmountCents(plan: JobsPaidPlan): Promise<number> {
  const planCode = jobsPlanCodeFor(plan);
  const res = await fetch(`https://api.paystack.co/plan/${planCode}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
  });
  const data = await res.json();
  if (!data.status || typeof data.data?.amount !== "number") {
    throw new Error(`Could not fetch amount for Jobs plan ${planCode}`);
  }
  return data.data.amount;
}

export async function initializeJobsSubscription({
  employerId,
  email,
  plan,
  callbackUrl,
}: {
  employerId: string;
  email: string;
  plan: JobsPaidPlan;
  callbackUrl: string;
}): Promise<{ authorizationUrl: string } | { error: string }> {
  const planCode = jobsPlanCodeFor(plan);
  const amount = await jobsPlanAmountCents(plan);

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
        product: JOBS_PRODUCT_TAG,
        kind: "subscription",
        jobs_employer_id: employerId,
        jobs_plan: plan,
      },
    }),
  });

  const data = await res.json();
  if (!data.status || !data.data?.authorization_url) {
    console.error("Failed to initialize Jobs subscription", data);
    return { error: "We could not open the payment page. Please try again." };
  }
  return { authorizationUrl: data.data.authorization_url };
}
