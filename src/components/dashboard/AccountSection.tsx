"use client";

import { useActionState, useState } from "react";
import { cancelSubscription } from "@/app/dashboard/actions";
import { TIERS } from "@/lib/paystack/plans";

const PLAN_LABELS: Record<string, string> = {
  foundation: "Foundation",
  growth_engine: "Growth",
  enterprise: "Enterprise",
};

// Makes the pricing page's "cancel any time, upgrade whenever you're
// ready" copy actually true instead of a claim someone has to email in
// to act on. Cancel is a real destructive action from the client's own
// point of view (their page stops being live), so it's a two-step
// confirm, not a single button that fires immediately.
export function AccountSection({
  growthClientId,
  plan,
  status,
}: {
  growthClientId: string;
  plan?: string;
  status?: string;
}) {
  const [state, formAction, pending] = useActionState(cancelSubscription, null);
  const [confirming, setConfirming] = useState(false);
  // Combined spec Sec 23: was just the plan name, no sense of what's
  // actually included — reuses the same feature list already shown on
  // /pricing rather than maintaining a second copy of it.
  const currentTier = plan ? TIERS.find((t) => t.id === plan) : undefined;

  if (status === "cancelled" || state?.success) {
    return (
      <section className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold tracking-tight text-ink">Your plan</h2>
        <p className="text-sm text-gray-500">
          Your account is cancelled and your page is no longer live. Want it back?{" "}
          <a href="mailto:info@digitalflyer.co.za" className="font-semibold text-brand hover:underline">
            Get in touch
          </a>{" "}
          any time.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-ink">Your plan</h2>
        <p className="mt-1 text-sm text-gray-500">
          You&apos;re on{" "}
          <span className="font-semibold text-ink">{(plan && PLAN_LABELS[plan]) ?? plan ?? "no plan"}</span>.
        </p>
      </div>

      {currentTier && (
        <ul className="grid grid-cols-1 gap-x-4 gap-y-1.5 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700 sm:grid-cols-2">
          {currentTier.features.map((feature) => (
            <li key={feature} className="flex items-start gap-1.5">
              <span aria-hidden className="text-brand">✓</span>
              {feature}
            </li>
          ))}
        </ul>
      )}

      {plan === "foundation" && (
        <div className="flex flex-col gap-2 rounded-xl border border-brand/20 bg-brand/5 p-4">
          <p className="text-sm font-semibold text-ink">Ready to reach more customers?</p>
          <p className="text-xs text-gray-600">Everything in Foundation, plus managed Meta ad tracking.</p>
          <div className="mt-1 flex flex-wrap gap-2">
            <a
              href={`/api/plan/upgrade?client=${growthClientId}&interval=monthly`}
              className="inline-flex items-center rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-dark"
            >
              Upgrade — R180/month
            </a>
            <a
              href={`/api/plan/upgrade?client=${growthClientId}&interval=annual`}
              className="inline-flex items-center rounded-full border border-brand px-4 py-2 text-xs font-semibold text-brand transition hover:bg-brand/5"
            >
              Upgrade — R1,199/year
            </a>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 border-t border-gray-100 pt-4">
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="w-fit text-xs font-medium text-gray-400 underline-offset-2 hover:text-red-600 hover:underline"
          >
            Cancel my plan
          </button>
        ) : (
          <form action={formAction} className="flex flex-col gap-2">
            <p className="text-sm text-gray-700">
              Cancelling stops billing and takes your page offline right away. This can&apos;t be
              undone from here — are you sure?
            </p>
            {state?.error?._form && <p className="text-xs text-red-600">{state.error._form[0]}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={pending}
                className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {pending ? "Cancelling..." : "Yes, cancel my plan"}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 transition hover:border-gray-300"
              >
                Never mind
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
