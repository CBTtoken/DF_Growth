"use client";

import { useActionState } from "react";
import { createPartnerBusiness } from "@/app/dashboard/add-business-actions";

export function AddBusinessForm() {
  const [state, formAction, pending] = useActionState(createPartnerBusiness, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="businessName" className="text-sm font-semibold text-gray-700">
          Business name
        </label>
        <input
          id="businessName"
          type="text"
          name="businessName"
          required
          className="rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="contactEmail" className="text-sm font-semibold text-gray-700">
          Business contact email
        </label>
        <input
          id="contactEmail"
          type="email"
          name="contactEmail"
          required
          className="rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        <p className="text-xs text-gray-400">Shown to visitors as this business's contact, not used for login.</p>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark disabled:opacity-50 disabled:hover:translate-y-0"
      >
        {pending ? "Creating..." : "Create and continue"}
      </button>
    </form>
  );
}
