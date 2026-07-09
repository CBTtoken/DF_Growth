"use client";

import { useActionState, useEffect } from "react";
import { saveStep3, type OnboardState } from "@/app/onboard/actions";

export function Step3BrandKit({
  initialPrimaryColor,
  initialSecondaryColor,
  onSuccess,
}: {
  initialPrimaryColor: string;
  initialSecondaryColor: string;
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState<OnboardState, FormData>(saveStep3, null);

  useEffect(() => {
    if (state?.success) onSuccess();
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-ink">Brand kit</h2>
        <p className="mt-1 text-sm text-gray-500">
          Two colors are enough to make your landing page and social assets feel like you.
        </p>
      </div>

      <label className="flex items-center gap-4 text-sm font-medium text-gray-700">
        Primary color
        <input
          type="color"
          name="brandPrimaryColor"
          defaultValue={initialPrimaryColor}
          required
          className="h-10 w-20 cursor-pointer rounded-lg border border-gray-200"
        />
      </label>
      {state?.error?.brandPrimaryColor && (
        <p className="text-xs text-red-600">{state.error.brandPrimaryColor[0]}</p>
      )}

      <label className="flex items-center gap-4 text-sm font-medium text-gray-700">
        Secondary color
        <input
          type="color"
          name="brandSecondaryColor"
          defaultValue={initialSecondaryColor}
          required
          className="h-10 w-20 cursor-pointer rounded-lg border border-gray-200"
        />
      </label>
      {state?.error?.brandSecondaryColor && (
        <p className="text-xs text-red-600">{state.error.brandSecondaryColor[0]}</p>
      )}
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
