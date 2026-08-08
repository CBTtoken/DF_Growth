import { NextResponse } from "next/server";
import crypto from "crypto";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { TOPUP_DOCUMENTS } from "@/lib/bizup/billing";
import { provisionGrowthClient } from "@/lib/growth-client/provision";
import { sendWelcomeEmail } from "@/lib/email/welcome";
import { sendBuildOrderEmail } from "@/lib/email/build-order";
import { sendBookOrderConfirmationEmail } from "@/lib/email/book-order";
import { buildBookShopOrder } from "@/lib/orders/book-order-row";
import { trackBetaEvent } from "@/lib/metrics/track";
import { recordCommissionIfEligible } from "@/lib/agents/commission";
import { sendDigitalFlyerCapiEvent } from "@/lib/meta/digitalflyer-capi";
import { handleMoxieEvent } from "@/lib/moxie/webhook";
import { handleJobsEvent } from "@/lib/jobs/webhook";
import { buildOrderDueAt } from "@/lib/growth-client/build-order";
import { createSubscriptionFromAuthorization, nextPeriodStart } from "@/lib/paystack/subscriptions";
import { planCodeForTier, type Tier } from "@/lib/paystack/plans";

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

  // Moxie Magazine, checked first and before the charge.success filter
  // below.
  //
  // Before the filter, because a membership needs subscription.create,
  // subscription.disable and invoice.payment_failed as well, and all three
  // would otherwise be dropped two lines from here.
  //
  // First, because three products now share this one endpoint and the
  // expensive failure is not a crash. It is a payment attributed to the
  // wrong product, activating the wrong thing for a real customer. The
  // handler returns true only for an event it has positively identified as
  // Moxie's, by metadata on a first payment or by plan code on a renewal,
  // so nothing else changes behaviour.
  if (await handleMoxieEvent(event)) {
    return NextResponse.json({ received: true });
  }

  // KatisoBiz Jobs, same first-refusal contract as Moxie above and before
  // the charge.success filter for the same reason: Jobs needs
  // subscription.disable (it starts the two-week lapse clock) and those
  // events would otherwise be dropped two lines from here. The handler
  // returns true only for events it has positively identified as Jobs',
  // by metadata on a first payment or by plan code on renewals and
  // lifecycle events.
  if (await handleJobsEvent(event)) {
    return NextResponse.json({ received: true });
  }

  if (event.event !== "charge.success") {
    return NextResponse.json({ received: true });
  }

  const { customer, metadata, reference, amount } = event.data;

  const admin = createAdminClient();

  // A KatisoBiz subscription renewing.
  //
  // Paystack sends a renewal as an ordinary charge.success whose metadata
  // is a bare 0, not the custom bag set at checkout, so the branch below
  // that keys on metadata.product never saw one and every renewal was
  // silently dropped. Nothing broke for the member, since their plan was
  // already set and nothing downgrades them; what was lost was the record
  // of the money, which made every paying member look like they churned
  // after a single month. The identical gap was found and fixed on the
  // Growth side on 17 July, for the same reason.
  //
  // Resolved by plan code rather than by the customer's email. A renewal
  // does carry the plan object, and matching on the plan is exact: an
  // email could belong to somebody holding both a Growth subscription and
  // a KatisoBiz one, and guessing between them would put the money in the
  // wrong place.
  const planCode = event.data?.plan?.plan_code as string | undefined;
  const bizupPlanForCode =
    planCode && planCode === process.env.PAYSTACK_PLAN_BIZUP_UNLIMITED
      ? "unlimited"
      : planCode && planCode === process.env.PAYSTACK_PLAN_BIZUP
        ? "paid"
        : null;

  if (metadata?.product !== "bizup" && bizupPlanForCode && reference) {
    const { data: account } = await admin
      .from("bizup_accounts")
      .select("id, plan")
      .eq("email", customer?.email ?? "")
      .maybeSingle();

    if (!account) {
      Sentry.captureMessage("KatisoBiz renewal for an unknown account", {
        extra: { reference, email: customer?.email, planCode },
      });
      return NextResponse.json({ received: true });
    }

    // The insert is the idempotency check, exactly as for the first
    // charge: paystack_reference is unique, so a redelivered renewal loses
    // the race and stops here rather than being counted twice.
    const { error: renewalError } = await admin.from("bizup_billing_events").insert({
      account_id: account.id,
      paystack_reference: reference,
      kind: "renewal",
      plan: bizupPlanForCode,
      amount_cents: amount ?? 0,
    });

    if (renewalError) {
      // 23505 is the unique violation, which is the redelivery case and
      // entirely expected. Anything else is a real failure to record money.
      if (renewalError.code !== "23505") {
        console.error("Failed to record KatisoBiz renewal", renewalError, { reference });
        Sentry.captureMessage("Failed to record KatisoBiz renewal", {
          extra: { error: renewalError, reference, accountId: account.id },
        });
      }
      return NextResponse.json({ received: true });
    }

    // Re-asserted rather than assumed. A member whose plan was reverted by
    // the grant-expiry job, or changed by hand, is paying for a plan they
    // are no longer on, and the payment is the authority on that.
    if (account.plan !== bizupPlanForCode) {
      await admin
        .from("bizup_accounts")
        .update({ plan: bizupPlanForCode, plan_source: "self_paid", updated_at: new Date().toISOString() })
        .eq("id", account.id);
    }

    await admin.from("bizup_audit_log").insert({
      account_id: account.id,
      action: "subscription_renewed",
      reason: `${bizupPlanForCode}, ${reference}`,
    });

    // Deliberately no Meta conversion event. A renewal is not an
    // acquisition, and reporting one would tell the ad platform it had
    // won a customer it did not win.
    return NextResponse.json({ received: true });
  }

  // KatisoBiz upgrades and topups. Handled first and returns immediately:
  // this endpoint is shared by three unrelated flows because a Paystack
  // account only supports one webhook URL, and everything below this is
  // growth_clients billing logic that a KatisoBiz charge has nothing to do
  // with.
  if (metadata?.product === "bizup") {
    const accountId = metadata.bizup_account_id;
    if (!accountId || !reference) {
      Sentry.captureMessage("KatisoBiz charge missing account id or reference", {
        extra: { reference },
      });
      return NextResponse.json({ received: true });
    }

    const isTopup = metadata.kind === "topup";
    const plan: "paid" | "unlimited" | null = isTopup
      ? null
      : metadata.bizup_plan === "unlimited"
        ? "unlimited"
        : "paid";

    // The insert IS the idempotency check. paystack_reference is unique, so
    // a redelivered event loses the race and stops here rather than handing
    // out another 75 documents or re-applying a plan.
    const { error: eventError } = await admin.from("bizup_billing_events").insert({
      account_id: accountId,
      paystack_reference: reference,
      kind: isTopup ? "topup" : "subscription",
      plan,
      amount_cents: amount ?? 0,
    });

    if (eventError) {
      // 23505 is the unique violation, meaning already processed. Anything
      // else is a real failure worth knowing about, and must not fall
      // through to applying the benefit twice.
      if (eventError.code !== "23505") {
        Sentry.captureMessage("Failed to record KatisoBiz billing event", {
          extra: { error: eventError, reference },
        });
      }
      return NextResponse.json({ received: true });
    }

    if (isTopup) {
      // Read then write rather than a raw increment, because the topup
      // balance is a stored number and two topups arriving together must
      // not lose one. Paystack does not deliver a member's own charges
      // concurrently in practice, and the unique reference above already
      // stops the redelivery case, which is the real risk.
      const { data: acct } = await admin
        .from("bizup_accounts")
        .select("topup_balance")
        .eq("id", accountId)
        .maybeSingle();

      await admin
        .from("bizup_accounts")
        .update({ topup_balance: (acct?.topup_balance ?? 0) + TOPUP_DOCUMENTS })
        .eq("id", accountId);
    } else {
      await admin
        .from("bizup_accounts")
        .update({ plan, plan_source: "self_paid" })
        .eq("id", accountId);
    }

    await admin.from("bizup_audit_log").insert({
      account_id: accountId,
      action: isTopup ? "topup_purchased" : "plan_upgraded",
      reason: isTopup ? `${TOPUP_DOCUMENTS} documents, ${reference}` : `${plan}, ${reference}`,
    });

    // Meta conversion tracking for a paid KatisoBiz plan.
    //
    // Only subscriptions, not topups. A topup is bought by a member who is
    // already here, so attributing it to an acquisition campaign would
    // overstate what the ads actually produced.
    //
    // event_id is Paystack's reference, which the browser pixel on the
    // return page uses too, so Meta dedupes the two into one conversion
    // rather than counting the sale twice. The value is sent so the
    // campaign can optimise toward revenue rather than event count.
    if (!isTopup) {
      const { data: acct } = await admin
        .from("bizup_accounts")
        .select("email")
        .eq("id", accountId)
        .maybeSingle();

      await sendDigitalFlyerCapiEvent({
        eventName: "Subscribe",
        email: acct?.email ?? customer?.email ?? null,
        eventId: reference,
        eventSourceUrl: "https://katisobiz.co.za/upgrade",
        value: (amount ?? 0) / 100,
        currency: "ZAR",
        contentName: `bizup_${plan}`,
      });
    }

    return NextResponse.json({ received: true });
  }

  // Found via a real stress test: the old idempotency check was keyed on
  // slug (derived from business_name), which meant any two businesses that
  // ever picked the same name — not just concurrent signups, any two, ever
  // — would collide. Idempotency now keys on Paystack's own transaction
  // reference, which is the actually-correct signal for "have I already
  // processed this specific charge" (Paystack redelivers webhook events;
  // this is the case that check is really for). Moved to run before every
  // other branch below (2026-07-17, alongside the renewal fix) — it used
  // to run only after the metadata-shape guard further down, which meant a
  // redelivered renewal event (metadata-less, see below) could double-
  // process instead of being caught here first.
  if (reference) {
    const { data: existing } = await admin
      .from("growth_clients")
      .select("id")
      .eq("paystack_reference", reference)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ received: true });
    }
  }

  // STANDING365_LANDING_BUILD_SPEC_CLAUDE.md Sec 5/6: handled first and
  // returns immediately — a book order shares this one webhook endpoint
  // (Paystack accounts only support a single registered webhook URL, so
  // there's nowhere else for it to arrive) but is otherwise a fully
  // separate flow from everything below, which is all growth_client
  // signup/billing logic that book orders have nothing to do with.
  if (metadata?.order_type === "book_order") {
    const { data: existingOrder } = await admin
      .from("shop_orders")
      .select("id")
      .eq("paystack_reference", reference)
      .maybeSingle();
    if (existingOrder) {
      return NextResponse.json({ received: true });
    }

    const { row, buyerName, email, edition } = await buildBookShopOrder({
      admin,
      metadata,
      customerEmail: customer?.email,
      amount,
      reference,
    });

    const { data: order, error } = await admin
      .from("shop_orders")
      .insert(row)
      .select("id")
      .single();

    if (error || !order) {
      console.error("Failed to write shop_order from webhook", error);
      Sentry.captureMessage("Failed to write shop_order from webhook", { extra: { error, reference } });
    } else {
      try {
        await sendBookOrderConfirmationEmail({ buyerName, email, edition });
      } catch (err) {
        console.error("Book order confirmation email failed", err);
        Sentry.captureException(err, { extra: { orderId: order.id } });
      }
    }

    // DigitalFlyer-own Purchase to our ad pixel — the reliable server side of
    // the book Purchase (the webhook is guaranteed to fire; the browser pixel
    // isn't). event_id is the Paystack reference, the same id the browser
    // Purchase uses, so Meta dedupes the two into one sale. amount is in cents.
    // No-op until DIGITALFLYER_META_CAPI_ACCESS_TOKEN is set.
    await sendDigitalFlyerCapiEvent({
      eventName: "Purchase",
      email: customer?.email,
      eventId: reference,
      value: typeof amount === "number" ? amount / 100 : undefined,
      currency: "ZAR",
      contentName: `Standing 365 (${metadata.edition})`,
      eventSourceUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/standing365`,
    });

    return NextResponse.json({ received: true });
  }

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

  // Real gap confirmed via Paystack's own docs (2026-07-17): a genuine
  // subscription renewal's charge.success carries data.metadata as a bare
  // 0, not the custom metadata bag set at the original transaction/
  // initialize call — trialClientId, businessName, and tier all come back
  // undefined, which used to fall straight into the "missing expected
  // metadata" guard below and silently drop the event (meaning no renewal,
  // for any Growth annual client, was ever actually recorded — a real gap
  // in the core product, not just referral commissions, which is what
  // surfaced this in the first place). customer.email is the one field a
  // renewal charge does reliably carry, so a renewal is now resolved by
  // matching it against an existing, already-paying annual account
  // instead of relying on metadata at all.
  if (!trialClientId && email && (!businessName || !tier)) {
    const { data: renewalCandidates } = await admin
      .from("growth_clients")
      .select("id, plan, billing_cycle, referred_by_agent_id")
      .eq("contact_email", email)
      .eq("status", "active")
      .in("plan", ["growth_engine", "enterprise"])
      .eq("billing_cycle", "annual")
      .not("paystack_reference", "is", null);

    if (renewalCandidates && renewalCandidates.length === 1) {
      const client = renewalCandidates[0];
      const { error: renewalError } = await admin
        .from("growth_clients")
        .update({ paystack_reference: reference })
        .eq("id", client.id);

      if (renewalError) {
        console.error("Failed to record renewal payment", renewalError, { clientId: client.id, reference });
        Sentry.captureMessage("Failed to record renewal payment", {
          extra: { error: renewalError, clientId: client.id, reference },
        });
      } else {
        await recordCommissionIfEligible({
          clientId: client.id,
          billingCycle: client.billing_cycle,
          referredByAgentId: client.referred_by_agent_id,
          amountKobo: amount,
        });
      }
      return NextResponse.json({ received: true });
    }

    // Ambiguous only if the same email owns more than one active
    // Growth/Enterprise-annual account — flagged via Sentry rather than
    // guessed at, not a real risk at today's scale but worth surfacing
    // for real rather than silently picking one.
    if (renewalCandidates && renewalCandidates.length > 1) {
      console.error("Ambiguous renewal charge — multiple active annual accounts share this email", { email, reference });
      Sentry.captureMessage("Ambiguous renewal charge.success — multiple matches", { extra: { email, reference } });
      return NextResponse.json({ received: true });
    }

    // Zero matches — not a renewal we can identify (e.g. a genuinely new
    // signup whose metadata is legitimately incomplete). Falls through to
    // the "missing expected metadata" guard below, unchanged.
  }

  if (!reference || (!trialClientId && (!email || !businessName || !tier))) {
    console.error("charge.success missing expected metadata", { email, businessName, tier, reference, trialClientId });
    Sentry.captureMessage("charge.success missing expected metadata", {
      extra: { email, businessName, tier, reference, trialClientId },
    });
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
      .select("plan, billing_cycle, status, is_founding_member, business_name, contact_email, slug, referred_by_agent_id")
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

    // Sprint "Onboarding two doors" item 1: read once, up here, because it
    // changes which email this member gets further down as well as what
    // happens in the build-order block at the end.
    const isBuildOrder = metadata?.build_order === "true";

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
      Sentry.captureMessage("Failed to convert trial/upgrade/pending signup to paid", {
        extra: { error, trialClientId, reference },
      });
    } else if (isFirstPaymentForPendingSignup && existingClient) {
      // Mirrors exactly what saveStep7 (Meta Connect) used to do
      // unconditionally at the old finish line, before Sec 10 moved
      // payment to be the real last step.
      //
      // Sprint "Onboarding two doors" item 1: everything except these two
      // lines applies to a build order exactly as it does to an ordinary
      // signup, the conversion tracking below very much included, since a
      // build order is the largest single sale on the platform. What does
      // not apply is publishing and the welcome email: a build-order
      // member has paid but nobody has built their page yet, there is no
      // landing_pages row to publish, and the welcome email's "Your page
      // is live!" would link to a 404. They get sendBuildOrderEmail from
      // the build-order block below instead.
      if (!isBuildOrder) {
        await admin.from("landing_pages").update({ published: true }).eq("growth_client_id", trialClientId);
        await sendWelcomeEmail({
          businessName: existingClient.business_name,
          contactEmail: existingClient.contact_email,
          slug: existingClient.slug,
        });
      }
      // Public Beta Polish Sprint Sec 13.6: Foundation's first real payment
      // is a genuine trial-to-paid conversion (they've been live on a free
      // trial already); Growth/Enterprise never had a trial, so their
      // first payment here is the same "onboarding just completed" moment
      // Foundation gets for free at the end of its own wizard.
      void trackBetaEvent(existingClient.plan === "foundation" ? "trial_converted" : "onboarding_completed");

      // Tracking audit, 5 August 2026: DigitalFlyer's own Meta ad conversion
      // for a paid Growth/Enterprise subscription had no server-side CAPI
      // call at all, unlike every other paid conversion in this file
      // (KatisoBiz's Subscribe above, Standing 365's Purchase) — meaning it
      // relied solely on the browser pixel, exactly what CAPI exists to back
      // up. Foundation never reaches this branch with pending_intake status
      // (see the comment on isFirstPaymentForPendingSignup above), so this
      // only ever fires for a real Growth/Enterprise first payment.
      // event_id is the Paystack reference, which /pricing/success reads
      // back out of its own callback URL and gives the browser pixel too,
      // so Meta dedupes the two into one sale rather than counting it twice.
      //
      // Sprint "Onboarding two doors" item 1: the "Foundation never reaches
      // this branch with pending_intake" reasoning above stopped being true
      // when the build door shipped. A Foundation build order pays R450 plus
      // the first month immediately, with no trial in between, so it lands
      // here as pending_intake on plan "foundation" and the old condition
      // would have silently dropped the largest kind of Foundation sale from
      // Meta's numbers. Build orders are tracked whatever tier they are on.
      if (existingClient.plan !== "foundation" || isBuildOrder) {
        await sendDigitalFlyerCapiEvent({
          eventName: "Subscribe",
          email: existingClient.contact_email,
          eventId: reference,
          eventSourceUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing`,
          value: (amount ?? 0) / 100,
          currency: "ZAR",
          contentName: `growth_${existingClient.plan}`,
        });
      }
    }

    // Sprint "Onboarding two doors" item 1: a done-for-you build order.
    //
    // This charge was a plain transaction carrying R450 plus the first
    // period, with no plan attached (see initializeBuildOrderCheckout for
    // why it cannot have one), so Paystack has created no subscription. Two
    // things happen here and the order matters: the order goes into the
    // queue first, because that is what Dewald has been paid to do, and the
    // subscription is created second, because a failure there is a billing
    // problem to chase rather than a reason to lose the order.
    if (!error && isBuildOrder) {
      const paidAt = new Date();
      const dueAt = buildOrderDueAt(paidAt);

      const { error: buildError } = await admin
        .from("growth_clients")
        .update({
          build_order_status: "paid",
          build_order_paid_at: paidAt.toISOString(),
          build_order_due_at: dueAt.toISOString(),
        })
        .eq("id", trialClientId);

      // The one email these members get. Deliberately not the ordinary
      // welcome email, which would tell somebody who has just paid that a
      // page nobody has built yet is live.
      if (existingClient && isFirstPaymentForPendingSignup) {
        await sendBuildOrderEmail({
          businessName: existingClient.business_name,
          contactEmail: existingClient.contact_email,
          dueAt,
        });
      }

      if (buildError) {
        // Money has been taken for a build that is now not in the queue.
        // Loud on purpose.
        console.error("Failed to record a paid build order", buildError, { trialClientId, reference });
        Sentry.captureMessage("Paid build order not recorded", {
          extra: { error: buildError, trialClientId, reference },
        });
      }

      const authorizationCode = event.data?.authorization?.authorization_code as string | undefined;
      const customerCode = customer?.customer_code as string | undefined;
      const buildInterval = metadata?.build_interval === "annual" ? "annual" : "monthly";
      const buildTier = (metadata?.build_tier ?? existingClient?.plan) as Tier | undefined;

      if (authorizationCode && customerCode && buildTier) {
        // Starts one full period from today, because today's period has
        // already been paid for inside this very charge. Without the
        // start_date the member would be billed twice for the same month.
        const subscription = await createSubscriptionFromAuthorization({
          customerCode,
          planCode: planCodeForTier(buildTier, buildInterval),
          authorizationCode,
          startDate: nextPeriodStart(paidAt, buildInterval),
        });

        if ("error" in subscription) {
          // The member has paid and their build is queued, so this is not
          // failed at their end: what is missing is the recurring billing,
          // which Dewald can create from the Paystack dashboard against
          // this same customer. Never retried automatically here, because a
          // blind retry on a redelivered webhook is how someone ends up
          // with two subscriptions.
          Sentry.captureMessage("Build order paid but subscription not created", {
            extra: { trialClientId, reference, error: subscription.error },
          });
        } else {
          await admin
            .from("growth_clients")
            .update({ paystack_subscription_code: subscription.subscriptionCode })
            .eq("id", trialClientId);
        }
      } else {
        Sentry.captureMessage("Build order paid but no authorization to subscribe with", {
          extra: { trialClientId, reference, hasAuth: Boolean(authorizationCode), hasCustomer: Boolean(customerCode) },
        });
      }
    }

    // Agent Referral Programme Sec 6: no-ops internally unless this client
    // was actually referred and this exact payment is on a qualifying
    // plan (Growth or Enterprise annual) — safe to call unconditionally on
    // every successful update reaching here, whether it's a brand-new
    // signup's first payment or a plan upgrade. upgradeTo reflects the
    // plan this charge just switched them to; existingClient.plan is
    // already correct as-is for a first payment (no upgrade happening).
    if (!error && existingClient) {
      await recordCommissionIfEligible({
        clientId: trialClientId,
        billingCycle: existingClient.billing_cycle,
        referredByAgentId: existingClient.referred_by_agent_id,
        amountKobo: amount,
      });
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
    Sentry.captureMessage("Failed to provision growth_client from webhook", {
      extra: { error: result.error, reference, email, businessName, tier },
    });
  }

  return NextResponse.json({ received: true });
}
