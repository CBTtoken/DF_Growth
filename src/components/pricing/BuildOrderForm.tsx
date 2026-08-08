"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { startBuildOrder, type BuildOrderState } from "@/app/pricing/build/actions";
import { TurnstileWidget } from "@/components/reviews/TurnstileWidget";
import { INDUSTRY_TAXONOMY, OTHER_INDUSTRY } from "@/lib/industries";
import { BUILD_ORDER_AMOUNT_LABEL } from "@/lib/growth-client/build-order";

// Any of these can be null: a plan Paystack will not quote is an option we
// do not offer, rather than one we guess a price for. See the page's own
// comment on priceOrNull.
type TierPrice = {
  monthly: string | null;
  annual: string | null;
  totalMonthly: string | null;
  totalAnnual: string | null;
};

// Sprint "Onboarding two doors" item 1.
//
// Structure, stated before it was built, per the interface standard: three
// labelled groups (what you do, how to reach you, your plan), then the
// price, then one primary action. Nothing is behind a tap because every
// field here is required to do the build. Six inputs in the first two
// groups, which is inside the seven-item rule.
//
// The price line above the button is a hard requirement from the handoff:
// the exact Rand amount charged today, stated before any card entry.
export function BuildOrderForm({
  prices,
}: {
  prices: { foundation: TierPrice; growth_engine: TierPrice };
}) {
  const [state, formAction, pending] = useActionState<BuildOrderState, FormData>(startBuildOrder, null);

  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [otherText, setOtherText] = useState("");
  // Defaults to whichever tier can actually be sold, so the form is never
  // born showing an option it cannot price.
  const sellableTiers = (["foundation", "growth_engine"] as const).filter(
    (t) => prices[t].totalMonthly || prices[t].totalAnnual
  );
  const [tier, setTier] = useState<"foundation" | "growth_engine">(
    sellableTiers.includes("growth_engine") ? "growth_engine" : (sellableTiers[0] ?? "growth_engine")
  );
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");

  const isOther = category === OTHER_INDUSTRY;
  const subcategories = INDUSTRY_TAXONOMY.find((c) => c.name === category)?.subcategories ?? [];
  const price = prices[tier];

  // If the chosen tier cannot be sold on the chosen interval, fall back to
  // the one it can, rather than rendering a button that quotes nothing.
  const effectiveInterval: "monthly" | "annual" =
    interval === "annual" ? (price.totalAnnual ? "annual" : "monthly") : price.totalMonthly ? "monthly" : "annual";

  const total = effectiveInterval === "annual" ? price.totalAnnual : price.totalMonthly;
  const periodLabel = effectiveInterval === "annual" ? price.annual : price.monthly;
  const sellableIntervals = (["monthly", "annual"] as const).filter((i) =>
    i === "annual" ? price.totalAnnual : price.totalMonthly
  );

  return (
    <form action={formAction} className="flex flex-col gap-7">
      <fieldset className="flex flex-col gap-4">
        <legend className="text-sm font-bold uppercase tracking-wide text-gray-500">
          What you do
        </legend>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-ink">Business name</span>
          <input
            name="businessName"
            required
            className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand"
          />
          {state?.error?.businessName && (
            <span className="text-xs text-red-600">{state.error.businessName[0]}</span>
          )}
        </label>

        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-sm font-semibold text-ink">Your trade</span>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setSubcategory("");
              }}
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand"
            >
              <option value="">Choose one</option>
              {INDUSTRY_TAXONOMY.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
              <option value={OTHER_INDUSTRY}>{OTHER_INDUSTRY}</option>
            </select>
          </label>

          {category && !isOther && (
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-sm font-semibold text-ink">More specifically</span>
              <select
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand"
              >
                <option value="">Choose one</option>
                {subcategories.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          )}

          {isOther && (
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-sm font-semibold text-ink">Tell us your trade</span>
              <input
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand"
              />
            </label>
          )}
        </div>
        <input type="hidden" name="industry" value={isOther ? otherText : subcategory} />
        {state?.error?.industry && <span className="text-xs text-red-600">{state.error.industry[0]}</span>}

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-ink">
            In your own words, what does your business do?
          </span>
          <span className="text-xs leading-relaxed text-gray-500">
            This is the most useful thing on this form. Write it the way you would say it to a
            customer standing in front of you. We build your page copy from this, so your own
            words end up on your page rather than ours.
          </span>
          <textarea
            name="ownWords"
            rows={6}
            required
            className="rounded-xl border border-gray-200 px-4 py-3 text-sm leading-relaxed outline-none focus:border-brand"
          />
          {state?.error?.ownWords && <span className="text-xs text-red-600">{state.error.ownWords[0]}</span>}
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="text-sm font-bold uppercase tracking-wide text-gray-500">
          How customers reach you
        </legend>

        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-sm font-semibold text-ink">Phone number to call</span>
            <input
              name="callPhone"
              type="tel"
              required
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand"
            />
            {state?.error?.callPhone && <span className="text-xs text-red-600">{state.error.callPhone[0]}</span>}
          </label>

          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-sm font-semibold text-ink">WhatsApp number</span>
            <input
              name="whatsappPhone"
              type="tel"
              required
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand"
            />
            {state?.error?.whatsappPhone && (
              <span className="text-xs text-red-600">{state.error.whatsappPhone[0]}</span>
            )}
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-ink">Where you work</span>
          <span className="text-xs text-gray-500">
            Your address, or the towns and areas you cover. Plain words are perfect.
          </span>
          <input
            name="businessAddress"
            required
            className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand"
          />
          {state?.error?.businessAddress && (
            <span className="text-xs text-red-600">{state.error.businessAddress[0]}</span>
          )}
        </label>

        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-sm font-semibold text-ink">Email address</span>
            <input
              name="email"
              type="email"
              required
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand"
            />
            {state?.error?.email && <span className="text-xs text-red-600">{state.error.email[0]}</span>}
          </label>

          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-sm font-semibold text-ink">Same email again</span>
            <input
              name="confirmEmail"
              type="email"
              required
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand"
            />
            {state?.error?.confirmEmail && (
              <span className="text-xs text-red-600">{state.error.confirmEmail[0]}</span>
            )}
          </label>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="text-sm font-bold uppercase tracking-wide text-gray-500">Your plan</legend>

        <div className="grid gap-3 sm:grid-cols-2">
          {sellableTiers.map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setTier(t)}
              className={`rounded-xl border-2 px-4 py-3 text-left transition ${
                tier === t ? "border-brand bg-brand/5" : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <span className="block text-sm font-bold text-ink">
                {t === "foundation" ? "Foundation" : "Growth"}
              </span>
              <span className="mt-0.5 block text-xs text-gray-500">
                {(effectiveInterval === "annual" ? prices[t].annual : prices[t].monthly) ??
                  prices[t].monthly ??
                  prices[t].annual}
              </span>
            </button>
          ))}
        </div>

        {/* Only rendered when there is a genuine choice. A single button
            that cannot be unpicked is a decision the member did not ask to
            make. */}
        {sellableIntervals.length > 1 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {sellableIntervals.map((i) => (
              <button
                type="button"
                key={i}
                onClick={() => setInterval(i)}
                className={`rounded-xl border-2 px-4 py-3 text-sm font-semibold transition ${
                  effectiveInterval === i
                    ? "border-brand bg-brand/5 text-ink"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {i === "monthly" ? "Month to month" : "Pay for a year"}
              </button>
            ))}
          </div>
        )}

        <input type="hidden" name="tier" value={tier} />
        <input type="hidden" name="interval" value={effectiveInterval} />
      </fieldset>

      {/* The handoff's hard requirement: exactly what is charged today, in
          Rand, before any card entry. */}
      <div className="rounded-2xl border-2 border-brand bg-brand/5 p-5">
        <p className="text-sm font-bold text-ink">You pay {total} today</p>
        <ul className="mt-2 flex flex-col gap-1 text-sm text-gray-600">
          <li>
            {BUILD_ORDER_AMOUNT_LABEL} once-off, for us to build your page
          </li>
          <li>
            {periodLabel}, your first {effectiveInterval === "annual" ? "year" : "month"} of membership
          </li>
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-gray-500">
          After that you pay {periodLabel}, starting{" "}
          {effectiveInterval === "annual" ? "a year" : "a month"} from today. The{" "}
          {BUILD_ORDER_AMOUNT_LABEL} is charged once and never again. You can cancel from your
          dashboard whenever you like.
        </p>
      </div>

      <label className="flex items-start gap-2.5">
        <input type="checkbox" name="consent" required className="mt-0.5 size-4 rounded border-gray-300" />
        <span className="text-xs leading-relaxed text-gray-600">
          I accept the{" "}
          <Link href="/terms" className="font-semibold text-brand underline-offset-2 hover:underline">
            terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="font-semibold text-brand underline-offset-2 hover:underline">
            privacy policy
          </Link>
          .
        </span>
      </label>
      {state?.error?.consent && <span className="text-xs text-red-600">{state.error.consent[0]}</span>}

      <label className="flex items-start gap-2.5">
        <input type="checkbox" name="marketingConsent" className="mt-0.5 size-4 rounded border-gray-300" />
        <span className="text-xs leading-relaxed text-gray-600">
          Send me occasional tips and updates. You can unsubscribe at any time.
        </span>
      </label>

      <TurnstileWidget />

      {state?.error?._form && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{state.error._form[0]}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center rounded-full bg-brand px-8 py-4 text-base font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark disabled:opacity-50 disabled:hover:translate-y-0"
      >
        {pending ? "Taking you to payment..." : `Pay ${total} and start my build`}
      </button>
      <p className="text-center text-xs text-gray-400">
        Secure payment via Paystack. We never see your card details.
      </p>
    </form>
  );
}
