"use client";

import { useActionState, useEffect } from "react";
import { saveStep1, type OnboardState } from "@/app/onboard/actions";

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

      {/* Combined spec Sec 20: split from one shared number into two — a
          business may want calls to ring a different line than WhatsApp.
          Neither is ever shown on the page itself before a visitor
          submits the lead form (Sec 20 item 2 / Sec 21). */}
      <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
        Call number <span className="font-normal text-gray-400">(optional)</span>
        <input
          type="tel"
          name="callPhone"
          defaultValue={initialCallPhone}
          placeholder="e.g. 082 123 4567"
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        <span className="text-xs font-normal text-gray-400">
          Shown to a visitor after they contact you, as a faster way to reach you than email
        </span>
      </label>
      {state?.error?.callPhone && <p className="text-xs text-red-600">{state.error.callPhone[0]}</p>}

      <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
        WhatsApp number <span className="font-normal text-gray-400">(optional)</span>
        <input
          type="tel"
          name="whatsappPhone"
          defaultValue={initialWhatsappPhone}
          placeholder="e.g. 082 123 4567"
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        <span className="text-xs font-normal text-gray-400">Leave blank if it&apos;s the same as your call number</span>
      </label>
      {state?.error?.whatsappPhone && (
        <p className="text-xs text-red-600">{state.error.whatsappPhone[0]}</p>
      )}
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
