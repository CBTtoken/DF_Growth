"use client";

import { useActionState } from "react";
import { emailMyOrders } from "@/app/[clientSlug]/shop-actions";
import { TurnstileWidget } from "@/components/reviews/TurnstileWidget";
import { readableTextOn } from "@/lib/color";

/**
 * Finding your orders again, with no account and no password.
 *
 * The confirmation page's own link is the primary way back, and this is for
 * the buyer who closed the tab or lost the email. It posts the links to the
 * address that placed the orders, which is the whole security model: an
 * address is not a secret, but the inbox behind it is.
 */
export function OrderLookupForm({
  clientSlug,
  businessName,
  primaryColor,
}: {
  clientSlug: string;
  businessName: string;
  primaryColor: string;
}) {
  const bound = emailMyOrders.bind(null, clientSlug);
  const [state, formAction, pending] = useActionState(bound, null);

  if (state?.sent) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-700">
        {/* Deliberately does not say whether anything was found. Saying so
            would turn this into a way to ask a stranger's shop whether a
            particular person has ever bought from them. */}
        <p className="font-semibold text-gray-900">Check your email</p>
        <p className="mt-1">
          If any orders were placed from {businessName} with that address, we have just sent the
          links to it. They can take a minute to arrive.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">The email address you used</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          className="h-12 w-full rounded-xl border border-gray-300 px-4 text-gray-900"
        />
      </label>

      <TurnstileWidget />

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full px-6 py-3.5 text-base font-semibold disabled:opacity-60"
        style={{ backgroundColor: primaryColor, color: readableTextOn(primaryColor) }}
      >
        {pending ? "Looking..." : "Email me my orders"}
      </button>

      <p className="text-xs text-gray-500">
        No account needed. If you did not give an email when you ordered, use the link{" "}
        {businessName} sent you, or phone them.
      </p>
    </form>
  );
}
