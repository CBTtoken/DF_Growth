import { TIERS, type Tier, type BillingInterval } from "@/lib/paystack/plans";

// Combined spec Sec 10: the wizard's actual final step for any paid tier
// (growth_engine today; enterprise shares this generic path but has no
// live checkout button yet on /pricing) — everything before this has
// already been captured and saved, this is the only remaining thing
// standing between a finished profile and a live page. A plain link
// straight to /api/checkout/finish rather than a form + Server Action:
// there's nothing to submit, just a full-page redirect out to Paystack's
// hosted checkout and back, matching how /api/trial/convert and
// /api/plan/upgrade already work.
export function StepPayment({ tier, billingCycle }: { tier: Tier; billingCycle: BillingInterval }) {
  const plan = TIERS.find((t) => t.id === tier);
  const priceLabel =
    tier === "growth_engine"
      ? billingCycle === "annual"
        ? "R1,199/year"
        : "R180/month"
      : (plan?.priceLabel ?? "");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-ink">Confirm your payment</h2>
        <p className="mt-1 text-sm text-gray-500">
          Last step. Everything you&apos;ve entered is saved, this just switches your billing on
          and takes your page live.
        </p>
      </div>

      <div className="flex flex-col gap-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5">
        <span className="text-sm font-semibold text-gray-900">{plan?.name ?? "Growth"}</span>
        <span className="text-sm text-gray-600">{priceLabel}</span>
      </div>

      <a
        href="/api/checkout/finish"
        className="mt-2 inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark"
      >
        Pay and go live
      </a>
    </div>
  );
}
