"use client";

import { useActionState, useEffect } from "react";
import { saveStep4, type OnboardState } from "@/app/onboard/actions";

const inputClass =
  "rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20";
const labelClass = "flex flex-col gap-1.5 text-sm font-medium text-gray-700";

export function Step4LandingCopy({
  initialHeadline,
  initialSubheadline,
  initialCtaLabel,
  initialAboutText,
  initialServicesText,
  hasAiDraft,
  onSuccess,
}: {
  initialHeadline: string;
  initialSubheadline: string;
  initialCtaLabel: string;
  initialAboutText: string;
  initialServicesText: string;
  hasAiDraft: boolean;
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState<OnboardState, FormData>(saveStep4, null);

  useEffect(() => {
    if (state?.success) onSuccess();
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-ink">Your landing page</h2>
        {hasAiDraft ? (
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
            ✨ Drafted for you — edit anything before continuing
          </span>
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
          maxLength={600}
          placeholder="A couple of sentences visitors can trust — who you are and what makes you worth choosing."
          className={inputClass}
          rows={3}
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
        {pending ? "Saving..." : "Continue"}
      </button>
    </form>
  );
}
