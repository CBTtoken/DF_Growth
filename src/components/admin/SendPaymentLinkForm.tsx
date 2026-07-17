"use client";

import { useActionState } from "react";
import { sendPaymentLink } from "@/app/admin/clients/[id]/actions";

const inputClass =
  "h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20";

// Sec 3 of the "register, we build it, they pay when ready" flow — sends a
// real Paystack checkout link by email instead of comping the account, for
// a client who does need to actually pay, just not through a self-serve
// checkout flow on their own end.
export function SendPaymentLinkForm({ clientId }: { clientId: string }) {
  const [state, action, pending] = useActionState(sendPaymentLink, null);

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="clientId" value={clientId} />
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-gray-500">Plan</label>
        <select name="tier" defaultValue="growth_engine" className={inputClass}>
          <option value="foundation">Foundation</option>
          <option value="growth_engine">Growth</option>
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-gray-500">Billing</label>
        <select name="interval" defaultValue="monthly" className={inputClass}>
          <option value="monthly">Monthly</option>
          <option value="annual">Annual</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 items-center justify-center rounded-full bg-brand px-5 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark disabled:opacity-50"
      >
        {pending ? "Sending..." : "Email Payment Link"}
      </button>
      {state?.error && <p className="w-full text-xs text-red-600">{state.error}</p>}
      {state?.success && <p className="w-full text-xs text-green-700">Payment link emailed.</p>}
    </form>
  );
}
