"use client";

import { useActionState, useState, useTransition } from "react";
import { connectBizupPaystack, disconnectBizupPaystack, type PaystackSummary } from "@/app/bizup/bank-actions";

/**
 * Pay Now on invoices: connect the member's own Paystack account. Sits on
 * the banking settings page because it is the same money conversation —
 * bank details are how customers pay manually, this is how they pay with
 * one tap. The key is tested before saving, stored encrypted, shown only
 * as its last four characters, and removable here.
 */
export function BizupPaystackSection({ summary }: { summary: PaystackSummary }) {
  const [state, formAction, pending] = useActionState<{ error?: string; success?: boolean } | null, FormData>(
    connectBizupPaystack,
    null
  );
  const [busy, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  if (summary.connected) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-semibold text-green-900">Paystack connected</p>
            <p className="text-xs text-green-800">
              Key ending {summary.last4}. Your invoices&apos; links now carry a Pay now button, and
              payments land in your own Paystack account.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (!window.confirm("Remove the Paystack connection? Invoices go back to banking details only.")) return;
              startTransition(async () => {
                await disconnectBizupPaystack();
              });
            }}
            className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50"
          >
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-sm">
      <p className="text-gray-600">
        Connect your own Paystack account and every invoice link grows a <strong>Pay now</strong>{" "}
        button: your customer pays by card, instant EFT, PayShap or Capitec Pay, the money goes
        straight to you, and the invoice marks itself paid.
      </p>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white"
        >
          Connect Paystack
        </button>
      ) : (
        <form action={formAction} className="mt-3 flex flex-col gap-2.5">
          <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
            Paystack secret key
            <input
              name="secretKey"
              required
              autoComplete="off"
              placeholder="sk_live_..."
              className="h-11 rounded-xl border border-gray-300 px-3 font-mono text-base text-gray-900"
            />
          </label>
          <p className="text-[11px] text-gray-400">
            In your Paystack dashboard under Settings, API Keys &amp; Webhooks. Tested with
            Paystack before it is saved, and saved encrypted.
          </p>
          {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="self-start rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Checking with Paystack..." : "Save and connect"}
          </button>
        </form>
      )}
    </div>
  );
}
