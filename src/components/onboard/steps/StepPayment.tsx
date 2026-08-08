"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TIERS, type Tier, type BillingInterval } from "@/lib/paystack/plans";
import { switchToAnnual } from "@/app/onboard/actions";

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
  // Real feedback from onboarding testing: a monthly Growth signup never
  // got a second look at annual before actually paying, even though it's a
  // genuine ~R960/year saving — worth one clear, dismissible offer right
  // here rather than assuming they already made up their mind on /pricing.
  const [dismissed, setDismissed] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Deliberately not local state any more. This used to hold its own copy
  // of the cycle and flip it optimistically after switchToAnnual returned,
  // which meant the price on screen came from the browser's guess while the
  // price Paystack charged came from the database. When the update silently
  // matched no rows those two disagreed, and the member confirmed
  // R1,199/year then got billed R180. The billingCycle prop comes from the
  // server on every render, so this is now the same value
  // /api/checkout/finish will read when it builds the checkout.
  const cycle: BillingInterval = billingCycle;

  const priceLabel =
    tier === "growth_engine" ? (cycle === "annual" ? "R1,199/year" : "R180/month") : (plan?.priceLabel ?? "");

  function confirmAnnual() {
    setSwitchError(null);
    startTransition(async () => {
      const result = await switchToAnnual();
      if (result.error) {
        setSwitchError(result.error);
        return;
      }
      // Pull the saved value back rather than assuming it. If the write did
      // not happen, the price below stays monthly and says so, instead of
      // showing a yearly price nobody is going to be charged.
      router.refresh();
    });
  }

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

      {tier === "growth_engine" && cycle === "monthly" && !dismissed && (
        <div className="flex flex-col gap-3 rounded-xl border border-brand/30 bg-brand/5 px-4 py-4">
          <p className="text-sm text-gray-800">
            <span className="font-semibold text-ink">Please confirm: monthly or yearly?</span> Switching to
            annual saves you about <span className="font-semibold text-ink">R960 a year</span> (R1,199/year
            instead of R180 × 12).
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={confirmAnnual}
              disabled={isPending}
              className="flex-1 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-brand-dark disabled:opacity-60"
            >
              {isPending ? "Switching…" : "Switch to yearly, save R960"}
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 transition hover:border-gray-400"
            >
              Stay monthly
            </button>
          </div>
          {switchError && <p className="text-xs text-red-600">{switchError}</p>}
        </div>
      )}

      {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- /api/checkout/finish is a
          redirect-out-to-Paystack Route Handler, not a page; Link's client-side routing doesn't apply. */}
      <a
        href="/api/checkout/finish"
        className="mt-2 inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark"
      >
        Pay and go live
      </a>
      {/* Quick Sprint: Payment Channels Sec 1 — no checkout call site in this
          codebase restricts which channels Paystack's hosted page shows, so
          every channel active on the account (card, Instant EFT, Capitec
          Pay, SnapScan) already surfaces automatically. This line is the
          actual work that section needed: telling a visitor without a card
          that before they even click through. */}
      <p className="text-center text-xs text-gray-400">
        Card, Instant EFT, Capitec Pay, or SnapScan. Choose whichever works for you on the next screen.
      </p>
    </div>
  );
}
