import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { jobsPlanForCode, JOBS_PRODUCT_TAG, type JobsPaidPlan } from "@/lib/jobs/billing";
import { creditPurchase } from "@/lib/jobs/credits";

// Jobs' slice of the one shared Paystack webhook, the same first-refusal
// shape as handleMoxieEvent: returns true only for an event it has
// positively identified as Jobs', by metadata on a first payment or by
// plan code on a renewal or lifecycle event, so nothing else changes
// behaviour. Called before the route's charge.success filter because a
// subscription needs subscription.disable too.
//
// Jobs is the first product here with real lapse handling: KatisoBiz
// deliberately never downgrades (route.ts documents that), but Dewald's
// rule for Jobs is explicit -- a lapsed employer keeps their posts for
// two weeks, then they come down. subscription.disable starts that clock
// by stamping plan_lapsed_at; the daily cron enforces day 14.

export async function handleJobsEvent(event: {
  event: string;
  data?: {
    reference?: string;
    amount?: number;
    metadata?:
      | {
          product?: string;
          kind?: string;
          jobs_employer_id?: string;
          jobs_plan?: string;
          jobs_seeker_user_id?: string;
        }
      | number
      | null;
    plan?: { plan_code?: string };
    subscription?: { subscription_code?: string; plan?: { plan_code?: string } };
    customer?: { email?: string };
  };
}): Promise<boolean> {
  const admin = createAdminClient();
  const data = event.data ?? {};
  const metadata = typeof data.metadata === "object" && data.metadata !== null ? data.metadata : null;
  const isJobsMetadata = metadata?.product === JOBS_PRODUCT_TAG;

  if (event.event === "charge.success") {
    // A job seeker buying rebuild credits. One-off, no subscription, and
    // checked before the employer branch because both carry the same
    // product tag and only the kind tells them apart.
    if (isJobsMetadata && metadata?.kind === "seeker_credits") {
      const userId = metadata?.jobs_seeker_user_id;
      const reference = data.reference;
      if (!userId || !reference) {
        Sentry.captureMessage("Jobs credit purchase missing user id or reference", {
          extra: { reference },
        });
        return true;
      }
      // Idempotent on the reference inside creditPurchase: a redelivered
      // event loses the unique insert and credits nothing.
      await creditPurchase(userId, reference);
      return true;
    }

    // First payment or upgrade: identified by the metadata bag set at
    // transaction/initialize.
    if (isJobsMetadata) {
      const employerId = metadata?.jobs_employer_id;
      const reference = data.reference;
      if (!employerId || !reference) {
        Sentry.captureMessage("Jobs charge missing employer id or reference", { extra: { reference } });
        return true;
      }

      const plan: JobsPaidPlan = metadata?.jobs_plan === "unlimited" ? "unlimited" : "starter";

      // The insert IS the idempotency check: paystack_reference is unique,
      // a redelivered event loses the race and stops here.
      const { error: eventError } = await admin.from("jobs_billing_events").insert({
        employer_id: employerId,
        paystack_reference: reference,
        kind: "subscription",
        plan,
        amount_cents: data.amount ?? 0,
      });

      if (eventError) {
        if (eventError.code !== "23505") {
          Sentry.captureMessage("Failed to record Jobs billing event", { extra: { error: eventError, reference } });
        }
        return true;
      }

      await admin
        .from("jobs_employers")
        .update({ plan, plan_lapsed_at: null, updated_at: new Date().toISOString() })
        .eq("id", employerId);

      return true;
    }

    // A renewal: metadata arrives as a bare 0 (confirmed by testing on
    // KatisoBiz and Growth alike), so renewals are resolved by plan code,
    // never by guessing from an email shared across products.
    const renewalPlan = jobsPlanForCode(data.plan?.plan_code);
    if (renewalPlan && data.reference) {
      const email = data.customer?.email ?? "";
      const { data: employer } = await admin
        .from("jobs_employers")
        .select("id, plan")
        .eq("email", email)
        .maybeSingle();

      if (!employer) {
        Sentry.captureMessage("Jobs renewal for an unknown employer", {
          extra: { reference: data.reference, email },
        });
        return true;
      }

      const { error: renewalError } = await admin.from("jobs_billing_events").insert({
        employer_id: employer.id,
        paystack_reference: data.reference,
        kind: "renewal",
        plan: renewalPlan,
        amount_cents: data.amount ?? 0,
      });

      if (renewalError) {
        if (renewalError.code !== "23505") {
          Sentry.captureMessage("Failed to record Jobs renewal", {
            extra: { error: renewalError, reference: data.reference },
          });
        }
        return true;
      }

      // Re-asserted rather than assumed: the payment is the authority.
      await admin
        .from("jobs_employers")
        .update({ plan: renewalPlan, plan_lapsed_at: null, updated_at: new Date().toISOString() })
        .eq("id", employer.id);

      return true;
    }

    return false;
  }

  if (event.event === "subscription.disable" || event.event === "subscription.not_renew") {
    // Claimed by plan code only: this event carries no custom metadata.
    const planCode = data.plan?.plan_code ?? data.subscription?.plan?.plan_code;
    const plan = jobsPlanForCode(planCode);
    if (!plan) return false;

    const email = data.customer?.email ?? "";
    if (!email) {
      Sentry.captureMessage("Jobs subscription.disable with no customer email", { extra: { planCode } });
      return true;
    }

    // not_renew means "will not renew at period end" -- the entitlement
    // keeps running until Paystack actually disables it, so only disable
    // starts the two-week clock.
    if (event.event === "subscription.disable") {
      await admin
        .from("jobs_employers")
        .update({ plan_lapsed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("email", email)
        .in("plan", ["starter", "unlimited"])
        .is("plan_lapsed_at", null);
    }

    return true;
  }

  if (event.event === "invoice.payment_failed") {
    // Paystack retries failed cards itself; the entitlement read rule
    // tolerates the in-between state, so this is observability only.
    const planCode = data.subscription?.plan?.plan_code;
    if (!jobsPlanForCode(planCode)) return false;
    console.error("Jobs subscription payment failed", { email: data.customer?.email });
    return true;
  }

  return false;
}
