"use client";

import { useActionState, useEffect } from "react";
import { saveStep1, type OnboardState } from "@/app/onboard/actions";

export function Step1BusinessInfo({
  initialBusinessName,
  initialContactEmail,
  onSuccess,
}: {
  initialBusinessName: string;
  initialContactEmail: string;
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState<OnboardState, FormData>(saveStep1, null);

  useEffect(() => {
    if (state?.success) onSuccess();
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold">Your business</h2>
        <p className="text-sm text-gray-500">Confirm the basics so we can set up your account.</p>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Business name
        <input
          type="text"
          name="businessName"
          defaultValue={initialBusinessName}
          required
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>
      {state?.error?.businessName && (
        <p className="text-xs text-red-600">{state.error.businessName[0]}</p>
      )}

      <label className="flex flex-col gap-1 text-sm">
        Day-to-day contact email
        <input
          type="email"
          name="contactEmail"
          defaultValue={initialContactEmail}
          required
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>
      {state?.error?.contactEmail && (
        <p className="text-xs text-red-600">{state.error.contactEmail[0]}</p>
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
