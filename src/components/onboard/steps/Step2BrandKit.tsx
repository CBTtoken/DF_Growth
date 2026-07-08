"use client";

import { useActionState, useEffect } from "react";
import { saveStep2, type OnboardState } from "@/app/onboard/actions";

export function Step2BrandKit({
  initialPrimaryColor,
  initialSecondaryColor,
  onSuccess,
}: {
  initialPrimaryColor: string;
  initialSecondaryColor: string;
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState<OnboardState, FormData>(saveStep2, null);

  useEffect(() => {
    if (state?.success) onSuccess();
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold">Brand kit</h2>
        <p className="text-sm text-gray-500">
          Two colors are enough to make your landing page and social assets feel like you.
        </p>
      </div>

      <label className="flex items-center gap-3 text-sm">
        Primary color
        <input
          type="color"
          name="brandPrimaryColor"
          defaultValue={initialPrimaryColor}
          required
          className="h-9 w-16 rounded border border-gray-300"
        />
      </label>
      {state?.error?.brandPrimaryColor && (
        <p className="text-xs text-red-600">{state.error.brandPrimaryColor[0]}</p>
      )}

      <label className="flex items-center gap-3 text-sm">
        Secondary color
        <input
          type="color"
          name="brandSecondaryColor"
          defaultValue={initialSecondaryColor}
          required
          className="h-9 w-16 rounded border border-gray-300"
        />
      </label>
      {state?.error?.brandSecondaryColor && (
        <p className="text-xs text-red-600">{state.error.brandSecondaryColor[0]}</p>
      )}
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
