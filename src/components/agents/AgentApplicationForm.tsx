"use client";

import { useActionState } from "react";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { submitAgentApplication } from "@/app/agents/actions";
import { TurnstileWidget } from "@/components/reviews/TurnstileWidget";

// The application form, restyled to the Bolt design.
//
// Five fields, per docs/agent-recruitment-page-copy.md Sec 9: the Facebook
// page link, the two yes/no Facebook questions and the promotion method
// dropdown are gone, because they pointed applicants at Facebook group
// posting, which converts badly and risks both their Meta account and the
// brand. The last question is the one that does the filtering.
//
// The Bolt file posted straight to Supabase from the browser. This keeps
// the existing Server Action, which is rate limited, Turnstile verified and
// sends the confirmation email, none of which a direct client insert does.

const inputClass =
  "w-full rounded-xl border border-slate-200 px-4 py-3 text-[15px] text-slate-800 outline-none transition-all placeholder:text-slate-300 focus:border-[#1EA7D4] focus:ring-2 focus:ring-[#1EA7D4]/15";
const labelClass = "mb-1.5 block text-[15px] font-semibold text-slate-700";
const errorClass = "mt-1 text-sm text-red-600";

export function AgentApplicationForm() {
  const [state, action, pending] = useActionState(submitAgentApplication, null);

  if (state?.success) {
    return (
      <div className="rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-xl">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 size={38} className="text-green-600" aria-hidden />
        </div>
        <h3 className="mb-2.5 text-2xl font-extrabold text-slate-900">Application received</h3>
        <p className="text-[15px] leading-relaxed text-slate-600">
          We read every application and come back to you either way. If you are accepted, you get your login, we set up
          your page together, and you can start the same week.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xl sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="fullName">
            Full name
          </label>
          <input id="fullName" name="fullName" type="text" placeholder="Jane Mokoena" className={inputClass} required />
          {state?.error?.fullName && <p className={errorClass}>{state.error.fullName[0]}</p>}
        </div>

        <div>
          <label className={labelClass} htmlFor="email">
            Email
          </label>
          <input id="email" name="email" type="email" placeholder="jane@example.com" className={inputClass} required />
          {state?.error?.email && <p className={errorClass}>{state.error.email[0]}</p>}
        </div>

        <div>
          <label className={labelClass} htmlFor="whatsappNumber">
            WhatsApp number
          </label>
          <input
            id="whatsappNumber"
            name="whatsappNumber"
            type="tel"
            placeholder="082 123 4567"
            className={inputClass}
            required
          />
          {state?.error?.whatsappNumber && <p className={errorClass}>{state.error.whatsappNumber[0]}</p>}
        </div>

        <div>
          <label className={labelClass} htmlFor="townOrArea">
            Town or area
          </label>
          <input id="townOrArea" name="townOrArea" type="text" placeholder="Polokwane" className={inputClass} required />
          {state?.error?.townOrArea && <p className={errorClass}>{state.error.townOrArea[0]}</p>}
        </div>
      </div>

      <div className="mt-5">
        <label className={labelClass} htmlFor="firstThreeBusinesses">
          Tell us how you would find your first three businesses.
        </label>
        <p className="mb-2 text-sm text-slate-500">
          This is the part we actually read. There is no right answer, we just want to know how you would go about it.
        </p>
        <textarea
          id="firstThreeBusinesses"
          name="firstThreeBusinesses"
          rows={5}
          placeholder="I would start by..."
          className={`${inputClass} resize-none`}
          required
        />
        {state?.error?.firstThreeBusinesses && <p className={errorClass}>{state.error.firstThreeBusinesses[0]}</p>}
      </div>

      <div className="mt-5">
        <TurnstileWidget />
      </div>

      {state?.error?._form && <p className={errorClass}>{state.error._form[0]}</p>}

      <button
        type="submit"
        disabled={pending}
        className="group mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#E07B40] px-8 py-4 text-base font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#C96930] hover:shadow-2xl hover:shadow-orange-500/40 disabled:translate-y-0 disabled:opacity-60"
      >
        {pending ? "Sending..." : "Apply to become an agent"}
        <ArrowRight size={20} aria-hidden className="transition-transform group-hover:translate-x-1" />
      </button>
    </form>
  );
}
