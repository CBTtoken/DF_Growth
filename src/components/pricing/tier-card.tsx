"use client";

import { useActionState, useEffect, useState } from "react";
import { startCheckout } from "@/app/pricing/actions";
import type { Tier, BillingInterval } from "@/lib/paystack/plans";

export function TierCard({
  tier,
  name,
  priceLabel,
  description,
  features,
  ctaLabel,
  highlighted,
}: {
  tier: Tier;
  name: string;
  priceLabel: string;
  description: string;
  features: string[];
  ctaLabel: string;
  highlighted?: boolean;
}) {
  const [state, formAction, pending] = useActionState(startCheckout, null);
  const [businessName, setBusinessName] = useState("");
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [availability, setAvailability] = useState<{ checking: boolean; available: boolean | null; slug?: string }>({
    checking: false,
    available: null,
  });

  // Found via a real stress test: two businesses picking the same name used
  // to silently strand the second one after payment. The backend now
  // auto-disambiguates so that can never actually happen — this check is
  // purely so a visitor sees a clean, predictable URL before they pay,
  // rather than discovering a suffix got added afterward.
  useEffect(() => {
    const name = businessName.trim();
    const timeout = setTimeout(async () => {
      if (name.length < 2) {
        setAvailability({ checking: false, available: null });
        return;
      }
      setAvailability({ checking: true, available: null });
      try {
        const res = await fetch(`/api/check-slug?name=${encodeURIComponent(name)}`);
        const data = await res.json();
        setAvailability({ checking: false, available: data.available, slug: data.slug });
      } catch {
        setAvailability({ checking: false, available: null });
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [businessName]);

  const displayPrice =
    tier === "growth_engine" ? (interval === "annual" ? "R1,199/year" : "R180/month") : priceLabel;

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
        <p className="mt-1 text-2xl font-bold text-ink">{displayPrice}</p>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>

      <ul className="flex flex-col gap-1 text-sm text-gray-700">
        {features.map((f) => (
          <li key={f}>&#8226; {f}</li>
        ))}
      </ul>

      {tier === "enterprise" ? (
        <div className="mt-auto flex flex-col gap-2 pt-4">
          <span className="w-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Coming soon
          </span>
          <p className="text-xs text-gray-500">
            Full Meta + Google ad management is on its way — get in touch and we&apos;ll let you know
            the moment it&apos;s ready.
          </p>
          <a
            href="mailto:info@digitalflyer.co.za?subject=Enterprise%20waitlist"
            className="rounded-full border border-gray-300 px-4 py-2.5 text-center text-sm font-semibold text-gray-700 transition hover:border-gray-400"
          >
            {ctaLabel}
          </a>
        </div>
      ) : (
        <form action={formAction} className="flex flex-col gap-2 mt-auto pt-4">
          <input type="hidden" name="tier" value={tier} />
          {tier === "growth_engine" && (
            <>
              <input type="hidden" name="interval" value={interval} />
              <div className="flex gap-1.5 rounded-full bg-gray-100 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setInterval("monthly")}
                  className={`flex-1 rounded-full py-1.5 transition-colors ${
                    interval === "monthly" ? "bg-white text-ink shadow-sm" : "text-gray-500"
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setInterval("annual")}
                  className={`flex-1 rounded-full py-1.5 transition-colors ${
                    interval === "annual" ? "bg-white text-ink shadow-sm" : "text-gray-500"
                  }`}
                >
                  Annual
                </button>
              </div>
            </>
          )}
          <input
            type="text"
            name="businessName"
            placeholder="Business name"
            required
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          />
          {availability.checking && <p className="text-xs text-gray-400">Checking availability...</p>}
          {!availability.checking && availability.available === true && (
            <p className="text-xs text-green-600">✓ {availability.slug} is available</p>
          )}
          {!availability.checking && availability.available === false && (
            <p className="text-xs text-amber-600">
              That name is already taken — you can still continue, we&apos;ll add a short code to your link
            </p>
          )}
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
            {pending ? "Redirecting..." : ctaLabel}
          </button>
          <p className="text-xs text-gray-400 text-center">
            {tier === "foundation" ? "No card required" : "Secure payment via Paystack"}
          </p>
        </form>
      )}
    </div>
  );
}
