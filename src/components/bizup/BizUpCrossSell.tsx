import Link from "next/link";
import type { Tier } from "@/lib/paystack/plans";
import { bizUpEntitlementForTier } from "@/lib/bizup/entitlements";

// Cross-sell in both directions, kept in one file so the two claims can
// never drift apart and start contradicting each other.
//
// The landing copy's rule is "cross-sell happens inside the product once
// they have a habit, not on the landing page where it dilutes a single
// clear action". A dashboard is exactly that place: the member is already
// signed in, already using something, and not mid-decision.

/**
 * Shown on the GROWTH dashboard. Until this existed, a Growth member had no
 * way to discover KatisoBiz at all: the only connection anywhere in the app was
 * a redirect for members who had KatisoBiz and nothing else.
 *
 * What it says depends on the tier, because the entitlement genuinely
 * differs and promising "included" to a Foundation member who gets the free
 * plan would be a misleading representation.
 */
export function BizUpFromGrowth({
  tier,
  hasBizUpAccount,
}: {
  tier: Tier | null;
  hasBizUpAccount: boolean;
}) {
  const entitlement = tier ? bizUpEntitlementForTier(tier) : null;
  const includedPaid = entitlement?.plan === "paid";

  return (
    <section className="rounded-2xl border border-brand/20 bg-brand/5 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-bold text-ink">KatisoBiz, quoting and invoicing</h2>
        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-brand">
          {includedPaid ? "Included in your plan" : "Free with your plan"}
        </span>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        Send a professional quote from your phone in under a minute, WhatsApp it to your customer
        from your own number, and turn it into an invoice when the job is done.
      </p>

      <p className="mt-2 text-sm text-gray-500">
        {includedPaid
          ? "Your plan includes the full R49 tier: 75 documents a month, all five templates, your own logo, reports and statements."
          : "Your plan includes KatisoBiz Free: 10 documents a month. You can add the full tier for R49 whenever you want it, without changing your Growth plan."}
      </p>

      <Link
        href="/bizup"
        className="mt-4 inline-flex items-center justify-center rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
      >
        {hasBizUpAccount ? "Go to KatisoBiz" : "Set up KatisoBiz"}
      </Link>
    </section>
  );
}

/**
 * Shown on the BIZUP dashboard, and only to a member who does NOT already
 * hold a Growth account. Advertising Growth to someone who already pays for
 * it would be noise, so it renders nothing in that case.
 */
export function GrowthFromBizUp() {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold text-ink">Getting found by new customers</h2>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        KatisoBiz helps you win the jobs you are already quoting for. DigitalFlyer Growth is the other
        half: a professional page for your business, a marketplace listing so local customers can
        find you, and reviews from the work you have done.
      </p>
      <p className="mt-2 text-sm text-gray-500">
        KatisoBiz is included when you join, so you keep everything you have set up here.
      </p>
      <a
        href="https://growth.digitalflyersa.co.za/pricing"
        className="mt-4 inline-block text-sm font-semibold text-brand underline-offset-2 hover:underline"
      >
        See what is in Growth
      </a>
    </section>
  );
}
