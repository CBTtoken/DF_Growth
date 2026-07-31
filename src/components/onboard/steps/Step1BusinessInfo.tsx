"use client";

import { useActionState, useEffect } from "react";
import { saveStep1, type OnboardState } from "@/app/onboard/actions";
import { PhoneNumberFields } from "@/components/onboard/PhoneNumberFields";

export function Step1BusinessInfo({
  initialBusinessName,
  initialContactEmail,
  initialCallPhone,
  initialWhatsappPhone,
  onSuccess,
  submitLabel = "Continue",
}: {
  initialBusinessName: string;
  initialContactEmail: string;
  initialCallPhone: string;
  initialWhatsappPhone: string;
  onSuccess: () => void;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState<OnboardState, FormData>(saveStep1, null);

  useEffect(() => {
    if (state?.success) onSuccess();
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-ink">Your business</h2>
        <p className="mt-1 text-sm text-gray-500">Confirm the basics so we can set up your account.</p>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
        Business name
        <input
          type="text"
          name="businessName"
          defaultValue={initialBusinessName}
          required
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </label>
      {state?.error?.businessName && (
        <p className="text-xs text-red-600">{state.error.businessName[0]}</p>
      )}

      <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
        Day-to-day contact email
        <input
          type="email"
          name="contactEmail"
          defaultValue={initialContactEmail}
          required
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </label>
      {state?.error?.contactEmail && (
        <p className="text-xs text-red-600">{state.error.contactEmail[0]}</p>
      )}

      {/* Handoff 02 B: both numbers are required member data now, and the
          two fields, the auto-populate rule and the landline exception live
          in one shared component so onboarding and the dashboard can never
          disagree about them. */}
      <PhoneNumberFields
        initialCallPhone={initialCallPhone}
        initialWhatsappPhone={initialWhatsappPhone}
        callError={state?.error?.callPhone?.[0]}
        whatsappError={state?.error?.whatsappPhone?.[0]}
      />

      {state?.error?._form && <p className="text-xs text-red-600">{state.error._form[0]}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark disabled:opacity-50 disabled:hover:translate-y-0"
      >
        {pending ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
