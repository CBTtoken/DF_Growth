"use client";

import { useActionState } from "react";
import { adminCreateClient } from "@/app/admin/clients/new/actions";

const inputClass =
  "h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20";
const labelClass = "flex flex-col gap-1.5 text-sm font-medium text-gray-700";

export function NewClientForm() {
  const [state, action, pending] = useActionState(adminCreateClient, null);

  return (
    <form action={action} className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <label className={labelClass}>
        Business name
        <input type="text" name="businessName" required className={inputClass} />
      </label>
      <label className={labelClass}>
        Email
        <input type="email" name="email" required className={inputClass} />
      </label>
      <label className={labelClass}>
        Plan
        <select name="plan" defaultValue="foundation" className={inputClass}>
          <option value="foundation">Foundation</option>
          <option value="growth_engine">Growth</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </label>

      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-brand-dark disabled:opacity-50"
      >
        {pending ? "Creating..." : "Create Client"}
      </button>
    </form>
  );
}
