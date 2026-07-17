"use client";

import { useActionState } from "react";
import { startAgentCompedSignup } from "@/app/agents/setup-page/actions";

const inputClass =
  "rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
const labelClass = "flex flex-col gap-1.5 text-sm font-medium text-gray-700";
const errorClass = "text-xs text-red-600";

export function AgentCompedSignupForm() {
  const [state, action, pending] = useActionState(startAgentCompedSignup, null);

  return (
    <form action={action} className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
      <label className={labelClass}>
        Your email
        <input type="email" name="email" className={inputClass} required />
        <span className="text-xs text-gray-400">The same email your agent application was approved under.</span>
        {state?.error?.email && <span className={errorClass}>{state.error.email[0]}</span>}
      </label>

      <label className={labelClass}>
        Business or agency name
        <input type="text" name="businessName" className={inputClass} required />
        {state?.error?.businessName && <span className={errorClass}>{state.error.businessName[0]}</span>}
      </label>

      <label className="flex items-start gap-2 text-xs leading-relaxed text-gray-500">
        <input type="checkbox" name="consent" required className="mt-0.5" />
        <span>
          I have read and agree to the{" "}
          <a href="/privacy" target="_blank" rel="noreferrer" className="text-brand underline-offset-2 hover:underline">
            Privacy Policy
          </a>{" "}
          and{" "}
          <a href="/terms" target="_blank" rel="noreferrer" className="text-brand underline-offset-2 hover:underline">
            Terms &amp; Conditions
          </a>
          .
        </span>
      </label>
      {state?.error?.consent && <p className={errorClass}>{state.error.consent[0]}</p>}

      {state?.error?._form && <p className={errorClass}>{state.error._form[0]}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Setting up…" : "Set up my free page"}
      </button>
    </form>
  );
}
