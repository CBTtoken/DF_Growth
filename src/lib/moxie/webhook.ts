import "server-only";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MoxieInterval } from "@/lib/moxie/membership";

/**
 * Moxie's slice of the shared Paystack webhook.
 *
 * Kept in its own file and called first, so a Moxie payment returns before
 * it can reach any Growth or KatisoBiz branch. Three products now share one
 * webhook endpoint, and the expensive failure is not a crash, it is a
 * payment being attributed to the wrong product and activating the wrong
 * thing for a real customer.
 *
 * Returns true when the event was Moxie's and has been dealt with. The
 * caller returns 200 immediately on true and carries on otherwise.
 */

function moxiePlanCodes(): Record<string, MoxieInterval> {
  const out: Record<string, MoxieInterval> = {};
  const monthly = process.env.PAYSTACK_PLAN_MOXIE_MONTHLY;
  const annual = process.env.PAYSTACK_PLAN_MOXIE_ANNUAL;
  if (monthly) out[monthly] = "monthly";
  if (annual) out[annual] = "annual";
  return out;
}

function periodEnd(interval: MoxieInterval, from = new Date()): string {
  const d = new Date(from);
  if (interval === "annual") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

export async function handleMoxieEvent(event: {
  event: string;
  data: Record<string, unknown>;
}): Promise<boolean> {
  const plans = moxiePlanCodes();
  const data = event.data ?? {};
  const customer = data.customer as { email?: string; customer_code?: string } | undefined;

  // Paystack sends metadata as a bare 0 on a renewal rather than the bag set
  // at checkout, so this is never the only way an event is recognised.
  const metadata = (typeof data.metadata === "object" && data.metadata !== null
    ? data.metadata
    : {}) as Record<string, unknown>;

  const planCode =
    ((data.plan as { plan_code?: string } | undefined)?.plan_code ??
      (typeof data.plan === "string" ? data.plan : undefined)) ?? undefined;

  const isMoxieByMetadata = metadata.kind === "moxie_membership";
  const isMoxieByPlan = Boolean(planCode && plans[planCode]);
  if (!isMoxieByMetadata && !isMoxieByPlan) return false;

  const admin = createAdminClient();
  const email = customer?.email ?? (metadata.moxie_email as string | undefined) ?? null;
  // Plan code first, metadata second, and the metadata value is checked
  // rather than cast. It arrives from a webhook body, so it is not ours to
  // trust, and an unexpected value silently typed as MoxieInterval would
  // set a member's billing interval to nonsense.
  const interval: MoxieInterval =
    (planCode ? plans[planCode] : undefined) ??
    (metadata.moxie_interval === "annual" ? "annual" : "monthly");

  // -------------------------------------------------------------------
  // Lifecycle events
  // -------------------------------------------------------------------

  if (event.event === "subscription.create") {
    const subscriptionCode = data.subscription_code as string | undefined;
    if (!subscriptionCode || !email) return true;

    await admin
      .from("moxie_subscriptions")
      .update({
        paystack_subscription_code: subscriptionCode,
        paystack_customer_code: customer?.customer_code ?? null,
        paystack_plan_code: planCode ?? null,
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("email", email)
      .in("status", ["active", "past_due"]);
    return true;
  }

  // A cancellation, whether the member did it or the card finally gave up.
  // started_at is deliberately not touched: it is the date the entitlement
  // rule turns on, and moving it would silently rewrite which back issues
  // that person was ever entitled to.
  if (event.event === "subscription.disable" || event.event === "subscription.not_renew") {
    const subscriptionCode = data.subscription_code as string | undefined;
    if (!subscriptionCode) return true;
    await admin
      .from("moxie_subscriptions")
      .update({
        status: event.event === "subscription.disable" ? "cancelled" : "active",
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("paystack_subscription_code", subscriptionCode);
    return true;
  }

  if (event.event === "invoice.payment_failed") {
    const subscriptionCode = (data.subscription as { subscription_code?: string } | undefined)
      ?.subscription_code;
    if (!subscriptionCode) return true;
    // Past due still reads. A failed card should not lock somebody out of a
    // magazine on the same day, and Paystack retries.
    await admin
      .from("moxie_subscriptions")
      .update({ status: "past_due", updated_at: new Date().toISOString() })
      .eq("paystack_subscription_code", subscriptionCode);
    return true;
  }

  if (event.event !== "charge.success") return true;

  // -------------------------------------------------------------------
  // Money
  // -------------------------------------------------------------------

  const reference = data.reference as string | undefined;
  const amount = (data.amount as number | undefined) ?? 0;
  if (!reference || !email) {
    Sentry.captureMessage("Moxie charge.success with no reference or email", {
      extra: { reference, email, planCode },
    });
    return true;
  }

  const userId = (metadata.moxie_user_id as string | undefined) ?? null;

  const { data: existing } = await admin
    .from("moxie_subscriptions")
    .select("id, user_id, started_at, status")
    .eq("email", email)
    .order("started_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const isRenewal = Boolean(existing);

  // The insert is the idempotency check. Written before the subscription is
  // touched, so a redelivered event cannot extend a period twice: the unique
  // violation stops the handler here.
  const { error: eventError } = await admin.from("moxie_billing_events").insert({
    subscription_id: existing?.id ?? null,
    user_id: userId ?? existing?.user_id ?? null,
    email,
    paystack_reference: reference,
    paystack_plan_code: planCode ?? null,
    kind: isRenewal ? "renewal" : "signup",
    interval,
    amount_cents: amount,
  });

  if (eventError) {
    // 23505 is the unique violation, which is the redelivery case and
    // entirely expected. Anything else is a real failure to record money.
    if (eventError.code !== "23505") {
      console.error("Failed to record Moxie payment", eventError, { reference });
      Sentry.captureMessage("Failed to record Moxie payment", {
        extra: { error: eventError, reference, email },
      });
    }
    return true;
  }

  if (existing) {
    await admin
      .from("moxie_subscriptions")
      .update({
        status: "active",
        interval,
        paystack_plan_code: planCode ?? null,
        current_period_end: periodEnd(interval),
        cancelled_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    return true;
  }

  if (!userId) {
    // A first payment with no reader attached to it. Recorded above, so the
    // money is not lost, but it cannot grant access to an account that was
    // never identified. Worth an alert rather than a silent drop, because
    // the person has paid and will expect to be able to read.
    Sentry.captureMessage("Moxie first payment with no user id in metadata", {
      extra: { reference, email },
    });
    return true;
  }

  const now = new Date();
  await admin.from("moxie_subscriptions").insert({
    user_id: userId,
    email,
    paystack_customer_code: customer?.customer_code ?? null,
    paystack_plan_code: planCode ?? null,
    interval,
    status: "active",
    started_at: now.toISOString(),
    current_period_end: periodEnd(interval, now),
  });

  return true;
}
