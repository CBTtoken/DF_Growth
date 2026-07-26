"use client";

import { useActionState } from "react";
import { submitAgentApplication } from "@/app/agents/actions";
import { TurnstileWidget } from "@/components/reviews/TurnstileWidget";

// Agent Programme Phase 3, per docs/agent-recruitment-page-copy.md Sec 9.
// Five fields. The Facebook page link, the two yes/no Facebook questions
// and the promotion method dropdown are gone, because they pointed
// applicants at Facebook group posting, which converts badly and risks
// both their Meta account and the brand.
//
// The last question is the one that does the work. Everything above it is
// contact detail; that one is what actually separates someone who has
// thought about this from someone planning to paste a link into groups.

const inputClass =
  "rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
const labelClass = "flex flex-col gap-1.5 text-sm font-semibold text-neutral-ink";
const errorClass = "text-xs text-red-600";

export function AgentApplicationForm() {
  const [state, action, pending] = useActionState(submitAgentApplication, null);

  if (state?.success) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
        <h2 className="text-lg font-bold tracking-tight text-ink">Application received</h2>
        <p className="text-sm text-neutral-mid">
          Thanks for applying. We have emailed you a confirmation, and we will come back to you either way.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
      <label className={labelClass}>
        Full name
        <input type="text" name="fullName" className={inputClass} required />
        {state?.error?.fullName && <span className={errorClass}>{state.error.fullName[0]}</span>}
      </label>

      <label className={labelClass}>
        Email
        <input type="email" name="email" className={inputClass} required />
        {state?.error?.email && <span className={errorClass}>{state.error.email[0]}</span>}
      </label>

      <label className={labelClass}>
        WhatsApp number
        <input type="tel" name="whatsappNumber" className={inputClass} required />
        {state?.error?.whatsappNumber && <span className={errorClass}>{state.error.whatsappNumber[0]}</span>}
      </label>

      <label className={labelClass}>
        Town or area
        <input type="text" name="townOrArea" className={inputClass} required />
        {state?.error?.townOrArea && <span className={errorClass}>{state.error.townOrArea[0]}</span>}
      </label>

      <label className={labelClass}>
        Tell us how you would find your first three businesses.
        <span className="text-xs font-normal text-neutral-muted">
          This is the part we actually read. There is no right answer, we just want to know how you would go about it.
        </span>
        <textarea name="firstThreeBusinesses" rows={5} className={inputClass} required />
        {state?.error?.firstThreeBusinesses && (
          <span className={errorClass}>{state.error.firstThreeBusinesses[0]}</span>
        )}
      </label>

      <TurnstileWidget />

      {state?.error?._form && <p className={errorClass}>{state.error._form[0]}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-full bg-brand px-6 py-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Sending..." : "Apply to become an agent"}
      </button>
    </form>
  );
}
