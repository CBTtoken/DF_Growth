"use client";

import { useActionState, useEffect } from "react";
import { saveStep3, type OnboardState } from "@/app/onboard/actions";

export function Step3LandingCopy({
  initialHeadline,
  initialSubheadline,
  initialCtaLabel,
  onSuccess,
}: {
  initialHeadline: string;
  initialSubheadline: string;
  initialCtaLabel: string;
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState<OnboardState, FormData>(saveStep3, null);

  useEffect(() => {
    if (state?.success) onSuccess();
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold">Your landing page</h2>
        <p className="text-sm text-gray-500">
          One clear line on what you do, one line on why it matters, one call to action.
        </p>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Headline
        <input
          type="text"
          name="headline"
          defaultValue={initialHeadline}
          required
          maxLength={80}
          placeholder="What do you do?"
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>
      {state?.error?.headline && <p className="text-xs text-red-600">{state.error.headline[0]}</p>}

      <label className="flex flex-col gap-1 text-sm">
        Subheadline
        <textarea
          name="subheadline"
          defaultValue={initialSubheadline}
          required
          maxLength={160}
          placeholder="How does it make your customer's life better?"
          className="rounded border border-gray-300 px-3 py-2"
          rows={2}
        />
      </label>
      {state?.error?.subheadline && (
        <p className="text-xs text-red-600">{state.error.subheadline[0]}</p>
      )}

      <label className="flex flex-col gap-1 text-sm">
        Call-to-action button text
        <input
          type="text"
          name="ctaLabel"
          defaultValue={initialCtaLabel || "Get Started"}
          required
          maxLength={30}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>
      {state?.error?.ctaLabel && <p className="text-xs text-red-600">{state.error.ctaLabel[0]}</p>}
      {state?.error?._form && <p className="text-xs text-red-600">{state.error._form[0]}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Saving..." : "Continue"}
      </button>
    </form>
  );
}
