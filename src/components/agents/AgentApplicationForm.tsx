"use client";

import { useActionState } from "react";
import { submitAgentApplication } from "@/app/agents/apply/actions";
import { TurnstileWidget } from "@/components/reviews/TurnstileWidget";

const inputClass =
  "rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
const labelClass = "flex flex-col gap-1.5 text-sm font-medium text-gray-700";
const errorClass = "text-xs text-red-600";

export function AgentApplicationForm() {
  const [state, action, pending] = useActionState(submitAgentApplication, null);

  if (state?.success) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
        <h2 className="text-lg font-bold tracking-tight text-ink">Application received</h2>
        <p className="text-sm text-gray-600">
          Thanks for applying. We&apos;ve emailed you a confirmation and will be in touch once your application has
          been reviewed.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
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
        Facebook page link
        <input type="url" name="facebookPageUrl" placeholder="https://facebook.com/yourpage" className={inputClass} required />
        {state?.error?.facebookPageUrl && <span className={errorClass}>{state.error.facebookPageUrl[0]}</span>}
      </label>

      <label className={labelClass}>
        Do you understand how Facebook group rules and posting work?
        <textarea name="understandsFacebookRules" rows={3} className={inputClass} required />
        {state?.error?.understandsFacebookRules && (
          <span className={errorClass}>{state.error.understandsFacebookRules[0]}</span>
        )}
      </label>

      <label className={labelClass}>
        Can you generate your own creatives and content?
        <textarea name="canGenerateContent" rows={3} className={inputClass} required />
        {state?.error?.canGenerateContent && <span className={errorClass}>{state.error.canGenerateContent[0]}</span>}
      </label>

      <label className={labelClass}>
        How will you be promoting?
        <select name="promotionMethod" className={inputClass} required defaultValue="">
          <option value="" disabled>
            Select an option
          </option>
          <option value="facebook_only">Mainly Facebook posts</option>
          <option value="beyond_facebook">Actively reaching my direct network beyond Facebook</option>
          <option value="both">Both</option>
        </select>
        {state?.error?.promotionMethod && <span className={errorClass}>{state.error.promotionMethod[0]}</span>}
      </label>

      <TurnstileWidget />

      {state?.error?._form && <p className={errorClass}>{state.error._form[0]}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit application"}
      </button>
    </form>
  );
}
