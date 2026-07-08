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
      className={`flex flex-col gap-4 rounded-lg border p-6 ${
        highlighted ? "border-gray-900 shadow-sm" : "border-gray-200"
      }`}
    >
      <div>
        <h3 className="text-lg font-semibold">{name}</h3>
        <p className="text-2xl font-bold mt-1">{priceLabel}</p>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
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
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Redirecting..." : "Get Started"}
        </button>
        <p className="text-xs text-gray-400 text-center">Secure payment via Paystack</p>
      </form>
    </div>
  );
}
