"use client";

import { useActionState } from "react";
import { startCheckout } from "@/app/pricing/actions";
import type { Tier } from "@/lib/paystack/plans";

export function TierCard({
  tier,
  name,
  priceLabel,
  description,
  features,
  highlighted,
}: {
  tier: Tier;
  name: string;
  priceLabel: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}) {
  const [state, formAction, pending] = useActionState(startCheckout, null);

  return (
    <div
      className={`flex flex-col gap-4 rounded-2xl bg-white p-6 ${
        highlighted ? "border-2 border-brand shadow-lg" : "border border-gray-200"
      }`}
    >
      {highlighted && (
        <span className="w-fit rounded-full bg-spark px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ink">
          Most popular
        </span>
      )}
      <div>
        <h3 className="font-display text-xl uppercase tracking-wide text-ink">{name}</h3>
        <p className="mt-1 text-2xl font-bold text-ink">{priceLabel}</p>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>

      <ul className="flex flex-col gap-1 text-sm text-gray-700">
        {features.map((f) => (
          <li key={f}>&#8226; {f}</li>
        ))}
      </ul>

      <form action={formAction} className="flex flex-col gap-2 mt-auto pt-4">
        <input type="hidden" name="tier" value={tier} />
        <input
          type="text"
          name="businessName"
          placeholder="Business name"
          required
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        />
        {state?.error?.businessName && (
          <p className="text-xs text-red-600">{state.error.businessName[0]}</p>
        )}
        <input
          type="email"
          name="email"
          placeholder="you@business.co.za"
          required
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        />
        {state?.error?.email && <p className="text-xs text-red-600">{state.error.email[0]}</p>}
        {state?.error?._form && <p className="text-xs text-red-600">{state.error._form[0]}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          {pending ? "Redirecting..." : "Get Started"}
        </button>
        <p className="text-xs text-gray-400 text-center">Secure payment via Paystack</p>
      </form>
    </div>
  );
}
