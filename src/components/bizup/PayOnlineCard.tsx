"use client";

import { useActionState } from "react";
import { formatZar } from "@/lib/bizup/money";
import { payInvoiceOnline, type PayOnlineState } from "@/app/bizup/d/[token]/pay-actions";

/**
 * The Pay now card on a public invoice. One field, one button: Paystack
 * will not open a transaction without an email for the receipt, so that
 * is the only thing asked. Everything else — amount, reference, where the
 * money goes — is already decided by the invoice itself.
 */
export function PayOnlineCard({
  token,
  outstandingCents,
  businessName,
}: {
  token: string;
  outstandingCents: number;
  businessName: string;
}) {
  const bound = payInvoiceOnline.bind(null, token);
  const [state, formAction, pending] = useActionState<PayOnlineState, FormData>(bound, null);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm text-sm">
      <p className="font-semibold text-ink">Pay online</p>
      <p className="mt-1 text-gray-600">
        Pay {businessName} by card, instant EFT, PayShap or Capitec Pay. Payment goes directly to
        them through their own Paystack account.
      </p>
      <form action={formAction} className="mt-3 flex flex-col gap-2.5">
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          Email for your payment receipt
          <input
            name="payerEmail"
            type="email"
            required
            inputMode="email"
            autoComplete="email"
            className="h-11 w-full rounded-xl border border-gray-300 px-3 text-base text-gray-900"
          />
        </label>
        {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? "Taking you to the payment page..." : `Pay ${formatZar(outstandingCents)} now`}
        </button>
        <p className="text-[11px] text-gray-400">
          You will be taken to a secure Paystack page. Your card details never touch this site.
        </p>
      </form>
    </div>
  );
}
