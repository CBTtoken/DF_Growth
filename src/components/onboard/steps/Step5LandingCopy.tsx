"use client";

import { useActionState, useEffect } from "react";
import { saveStep5, type OnboardState } from "@/app/onboard/actions";

const inputClass =
  "rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20";
const labelClass = "flex flex-col gap-1.5 text-sm font-medium text-gray-700";

export function Step5LandingCopy({
  initialHeadline,
  initialSubheadline,
  initialCtaLabel,
  initialAboutText,
  initialServicesText,
  hasAiDraft,
  onSuccess,
  submitLabel = "Continue",
  // Combined spec Sec 22: the dashboard's "Edit your page" reuses this
  // exact step component post-launch, where "Your landing page" reads
  // ambiguously — is this describing the page, or editing it? Overridden
  // there to make clear this shows what's live today, not something new
  // being set up. Onboarding keeps the original heading.
  heading = "Your landing page",
}: {
  initialHeadline: string;
  initialSubheadline: string;
  initialCtaLabel: string;
  initialAboutText: string;
  initialServicesText: string;
  hasAiDraft: boolean;
  onSuccess: () => void;
  submitLabel?: string;
  heading?: string;
}) {
  const [state, formAction, pending] = useActionState<OnboardState, FormData>(saveStep5, null);

  useEffect(() => {
    if (state?.success) onSuccess();
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-ink">{heading}</h2>
        {hasAiDraft ? (
          <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-brand/20 bg-brand/5 px-4 py-3">
            <span aria-hidden className="text-lg">✨</span>
            <p className="text-sm font-medium text-gray-700">
              <span className="font-semibold text-brand">We&apos;ve drafted this for you</span>
              {" "}based on what you told us in the last step. Nothing&apos;s final — read through each field
              below and edit anything before continuing.
            </p>
          </div>
        ) : (
          <p className="mt-1 text-sm text-gray-500">
            One clear line on what you do, one line on why it matters, one call to action.
          </p>
        )}
      </div>

      <label className={labelClass}>
        Headline
        <input
          type="text"
          name="headline"
          defaultValue={initialHeadline}
          required
          maxLength={80}
          placeholder="What do you do?"
          className={inputClass}
        />
      </label>
      {state?.error?.headline && <p className="text-xs text-red-600">{state.error.headline[0]}</p>}

      <label className={labelClass}>
        Subheadline
        <textarea
          name="subheadline"
          defaultValue={initialSubheadline}
          required
          maxLength={160}
          placeholder="How does it make your customer's life better?"
          className={inputClass}
          rows={2}
        />
      </label>
      {state?.error?.subheadline && (
        <p className="text-xs text-red-600">{state.error.subheadline[0]}</p>
      )}

      <label className={labelClass}>
        About your business
        <textarea
          name="aboutText"
          defaultValue={initialAboutText}
          required
          maxLength={800}
          placeholder="A few sentences visitors can trust — who you are, what you actually do, and what makes you worth choosing."
          className={inputClass}
          rows={5}
        />
      </label>
      {state?.error?.aboutText && <p className="text-xs text-red-600">{state.error.aboutText[0]}</p>}

      <label className={labelClass}>
        Products / services <span className="font-normal text-gray-400">(optional)</span>
        <textarea
          name="servicesText"
          defaultValue={initialServicesText}
          maxLength={600}
          placeholder={
            "One per line, e.g.\nBridal hair styling\nColor correction\nKeratin treatments\n\nLeave blank if you'd rather people just get in touch"
          }
          className={inputClass}
          rows={4}
        />
      </label>
      {state?.error?.servicesText && (
        <p className="text-xs text-red-600">{state.error.servicesText[0]}</p>
      )}

      <label className={labelClass}>
        Call-to-action button text
        <input
          type="text"
          name="ctaLabel"
          defaultValue={initialCtaLabel || "Get Started"}
          required
          maxLength={30}
          className={inputClass}
        />
      </label>
      {state?.error?.ctaLabel && <p className="text-xs text-red-600">{state.error.ctaLabel[0]}</p>}
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
