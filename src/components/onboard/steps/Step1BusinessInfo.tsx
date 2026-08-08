"use client";

import { useActionState, useEffect } from "react";
import { saveStep1, type OnboardState } from "@/app/onboard/actions";

export function Step1BusinessInfo({
  initialBusinessName,
  initialContactEmail,
  initialCallPhone,
  initialWhatsappPhone,
  initialSetupServiceRequested = false,
  showSetupServiceOffer = false,
  onSuccess,
  submitLabel = "Continue",
  showHeading = true,
}: {
  initialBusinessName: string;
  initialContactEmail: string;
  initialCallPhone: string;
  initialWhatsappPhone: string;
  initialSetupServiceRequested?: boolean;
  /**
   * The R450 offer renders only where it is passed true (the signup
   * wizard). The dashboard reuses this form without it, and the save
   * action only touches the request when the form actually offered it,
   * so a dashboard save can never silently clear a request.
   */
  showSetupServiceOffer?: boolean;
  onSuccess: () => void;
  submitLabel?: string;
  /**
   * The wizard needs its own title on each step. Your page already puts the
   * section name and a plain-language description in the header a member
   * taps to open this, so repeating it here would be the same words twice,
   * over an intro written for someone still signing up.
   */
  showHeading?: boolean;
}) {
  const [state, formAction, pending] = useActionState<OnboardState, FormData>(saveStep1, null);

  useEffect(() => {
    if (state?.success) onSuccess();
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {showHeading && (
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink">Your business</h2>
          <p className="mt-1 text-sm text-gray-500">Confirm the basics so we can set up your account.</p>
        </div>
      )}

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

      {/* The R450 done-for-you offer, 4 August 2026. An offer card rather
          than a bare checkbox, because it is a product, not a preference.
          Ticking it only records the request; nothing is charged here, and
          the copy says exactly what happens next. */}
      {showSetupServiceOffer && (
      <>
      <input type="hidden" name="setupServiceOffered" value="1" />
      <label className="mt-2 flex cursor-pointer items-start gap-3 rounded-2xl border border-brand/30 bg-brand/5 p-4 transition hover:border-brand/50">
        <input
          type="checkbox"
          name="setupService"
          defaultChecked={initialSetupServiceRequested}
          className="mt-1 size-4 accent-[#1081b8]"
        />
        <span className="text-sm text-gray-700">
          <span className="font-semibold text-ink">No time, or want an extra creative touch? We build it for you.</span>{" "}
          Once-off R450: finish signing up, send us your information, and we set up the whole
          page for you, with a step-by-step guide so managing it yourself afterwards is easy.
          Tick this and we will be in touch within a day to get going and arrange the once-off
          payment. Nothing is charged now.
        </span>
      </label>
      </>
      )}

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
