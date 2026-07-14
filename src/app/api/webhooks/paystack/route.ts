import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { provisionGrowthClient } from "@/lib/growth-client/provision";
import { sendWelcomeEmail } from "@/lib/email/welcome";
import { trackBetaEvent } from "@/lib/metrics/track";

// CLAUDE.md Section 2.1. Only charge.success is handled: Paystack also fires
// subscription.create for the same payment when a plan is attached to
// transaction/initialize, but that event's data.metadata is not populated
// with the custom metadata set at transaction/initialize time (confirmed by
// testing — it came back empty), so acting on it produced a second, wrong
// growth_clients row with the business name falling back to the email and
// the tier falling back to "foundation". charge.success reliably carries the
// metadata, so it's the only trigger. This means paystack_subscription_code
// stays null for now; backfilling it needs a separate reconciliation once
// something actually reads that column.
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  const expected = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
    .update(rawBody)
    .digest("hex");

  if (signature !== expected) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  if (event.event !== "charge.success") {
    return NextResponse.json({ received: true });
  }

  const { customer, metadata, reference } = event.data;
  const email: string | undefined = customer?.email;
  const businessName: string | undefined = metadata?.business_name;
  const tier: string | undefined = metadata?.tier;
  // Set by src/app/api/trial/convert (trial converting to paid) or
  // src/app/api/plan/upgrade (existing client switching tiers) —
  // identifies this charge as an update to an existing account, not a
  // brand-new signup.
  const trialClientId: string | undefined = metadata?.growth_client_id;
  const upgradeTo: string | undefined = metadata?.upgrade_to;
  const consentTimestamp: string | undefined = metadata?.consent_timestamp;
  const interval: string | undefined = metadata?.interval;

  if (!reference || (!trialClientId && (!email || !businessName || !tier))) {
    console.error("charge.success missing expected metadata", { email, businessName, tier, reference, trialClientId });
    return NextResponse.json({ received: true });
  }

  const admin = createAdminClient();

  // Found via a real stress test: the old idempotency check was keyed on
  // slug (derived from business_name), which meant any two businesses that
  // ever picked the same name — not just concurrent signups, any two, ever
  // — would collide. The second one would already have been charged by
  // Paystack, then silently fail to get a growth_clients row at all: no
  // account, no email, no admin visibility, nothing. Idempotency now keys on
  // Paystack's own transaction reference, which is the actually-correct
  // signal for "have I already processed this specific charge" (Paystack
  // redelivers webhook events; this is the case that check is really for).
  // Slug collisions are a separate, expected case — handled by
  // provisionGrowthClient disambiguating the slug, not rejecting the signup.
  const { data: existing } = await admin
    .from("growth_clients")
    .select("id")
    .eq("paystack_reference", reference)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ received: true });
  }

  // Trial conversion, plan upgrade, or (Combined spec Sec 10) a brand-new
  // growth_engine/enterprise signup's first-ever payment — all three now
  // reach here the same way, since Sec 10 moved that signup's payment from
  // pricing/actions.ts (upfront) to the wizard's final step
  // (src/app/api/checkout/finish), which tags its charge with
  // growth_client_id exactly like the other two already did. The account,
  // slug, and (for the first two) onboarding are already done — this
  // charge just switches billing on (and, for an upgrade, changes which
  // tier they're actually on) and lifts the pause a lapsed trial may have
  // set (src/app/api/cron/trial-reminders).
  if (trialClientId) {
    const { data: existingClient } = await admin
      .from("growth_clients")
      .select("plan, billing_cycle, status, is_founding_member, business_name, contact_email, slug")
      .eq("id", trialClientId)
      .single();

    // Combined spec Sec 10: this is the "did they just finish onboarding
    // and pay for the first time" case — the same signal used for founding
    // eligibility below. A trial conversion or plan upgrade is already
    // "active" by the time it reaches here, so neither one re-triggers
    // this. Foundation itself never reaches this branch with status
    // pending_intake at all (it goes live at step 6, long before any
    // payment exists to convert).
    const isFirstPaymentForPendingSignup = existingClient?.status === "pending_intake";

    // Founding-member eligibility used to only be computed for a brand-new
    // signup's very first charge.success (below) — Sec 10 means that same
    // moment can now arrive here instead, for a Growth-annual client whose
    // account was provisioned (pending_intake) before they ever paid. A
    // trial conversion is always plan "foundation" (never matches), and a
    // plan upgrade's status is already "active" by the time it gets here
    // (src/app/api/plan/upgrade requires it) — both naturally excluded
    // without needing a separate flag to distinguish this case.
    const eligibleForFoundingHere =
      !upgradeTo &&
      existingClient?.plan === "growth_engine" &&
      existingClient?.billing_cycle === "annual" &&
      existingClient?.status === "pending_intake" &&
      !existingClient?.is_founding_member;

    let founding: { is_founding_member: true; founding_signup_number: number } | Record<string, never> = {};

    for (let attempt = 0; eligibleForFoundingHere && attempt < 5; attempt++) {
      const { count } = await admin
        .from("growth_clients")
        .select("id", { count: "exact", head: true })
        .eq("is_founding_member", true);

      if ((count ?? 0) >= 10) break;

      const { error: foundingError } = await admin
        .from("growth_clients")
        .update({ is_founding_member: true, founding_signup_number: (count ?? 0) + 1 })
        .eq("id", trialClientId);

      if (!foundingError) {
        founding = { is_founding_member: true, founding_signup_number: (count ?? 0) + 1 };
        break;
      }
      // 23505 on founding_signup_number = a different concurrent signup
      // won this same slot number first — re-count and retry. Any other
      // error, stop trying for a founding slot but still activate the
      // account below; a failed founding-status grant shouldn't block a
      // real payment from activating someone's account.
      if (foundingError.code !== "23505") break;
    }

    // paystack_subscription_code stays untouched here — charge.success's
    // payload doesn't reliably carry it (same limitation noted for
    // brand-new signups above), needs a separate reconciliation pass once
    // something actually reads that column.
    const { error } = await admin
      .from("growth_clients")
      .update({
        status: "active",
        paystack_reference: reference,
        ...(upgradeTo ? { plan: upgradeTo } : {}),
        ...founding,
      })
      .eq("id", trialClientId);

    if (error) {
      console.error("Failed to convert trial/upgrade/pending signup to paid", error);
    } else if (isFirstPaymentForPendingSignup && existingClient) {
      // Mirrors exactly what saveStep7 (Meta Connect) used to do
      // unconditionally at the old finish line, before Sec 10 moved
      // payment to be the real last step.
      await admin.from("landing_pages").update({ published: true }).eq("growth_client_id", trialClientId);
      await sendWelcomeEmail({
        businessName: existingClient.business_name,
        contactEmail: existingClient.contact_email,
        slug: existingClient.slug,
      });
      // Public Beta Polish Sprint Sec 13.6: Foundation's first real payment
      // is a genuine trial-to-paid conversion (they've been live on a free
      // trial already); Growth/Enterprise never had a trial, so their
      // first payment here is the same "onboarding just completed" moment
      // Foundation gets for free at the end of its own wizard.
      void trackBetaEvent(existingClient.plan === "foundation" ? "trial_converted" : "onboarding_completed");
    }
    return NextResponse.json({ received: true });
  }

  // Combined spec Sec 10: growth_engine no longer reaches this branch —
  // its signups now always carry growth_client_id (provisioned up front,
  // pays last), landing in the trialClientId branch above instead. Left
  // in place as-is for enterprise, which explicitly stays out of this
  // sprint's scope and would need this exact upfront-pay-then-provision
  // pattern the moment it gets a real checkout button.
  const billingCycle: "monthly" | "annual" = interval === "annual" ? "annual" : "monthly";
  // Sprint 1, Build Item 1: founding-member status is scoped to Growth
  // annual only (confirmed 2026-07-11) — Foundation and Growth monthly are
  // never eligible, regardless of how many founding slots remain.
  const eligibleForFounding = tier === "growth_engine" && billingCycle === "annual";

  let result: Awaited<ReturnType<typeof provisionGrowthClient>> | null = null;

  // Retries up to 5 times only on a genuine founding-slot race (two
  // different Growth-annual signups both computing the same "next" number
  // at the same time) — the founding_signup_number unique constraint is
  // what makes this detectable at all; provisionGrowthClient surfaces it as
  // "duplicate_founding_number" specifically so this loop knows to
  // re-count and retry, rather than treating it as a hard failure. Not
  // needed for the ordinary case (no collision), which returns on the
  // first pass.
  for (let attempt = 0; attempt < 5; attempt++) {
    let foundingSignupNumber: number | null = null;

    if (eligibleForFounding) {
      const { count } = await admin
        .from("growth_clients")
        .select("id", { count: "exact", head: true })
        .eq("is_founding_member", true);

      if ((count ?? 0) < 10) {
        foundingSignupNumber = (count ?? 0) + 1;
      }
    }

    result = await provisionGrowthClient({
      businessName: businessName!,
      email: email!,
      plan: tier as "foundation" | "growth_engine" | "enterprise",
      status: "pending_intake",
      paystackReference: reference,
      consentedAt: consentTimestamp ?? null,
      // This upfront-payment path's metadata bag (set at the old
      // transaction/initialize call) never carried a marketing-consent
      // flag — dormant for growth_engine since Sec 10 (see the comment a
      // few lines up), false is the correct conservative default if
      // enterprise ever starts using it for real.
      marketingConsent: false,
      billingCycle,
      foundingSignupNumber,
    });

    if (!("error" in result) || result.error !== "duplicate_founding_number") break;
  }

  if (result && "error" in result) {
    console.error("Failed to provision growth_client from webhook", result.error);
  }

  return NextResponse.json({ received: true });
}
