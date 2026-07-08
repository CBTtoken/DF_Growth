"use client";

import { useActionState, useEffect } from "react";
import { saveStep4, type OnboardState } from "@/app/onboard/actions";

export function Step4MetaConnect({
  initialPixelId,
  initialAdAccountId,
  onSuccess,
}: {
  initialPixelId: string;
  initialAdAccountId: string;
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState<OnboardState, FormData>(saveStep4, null);

  useEffect(() => {
    if (state?.success) onSuccess();
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold">Connect your Meta ad account</h2>
        <p className="text-sm text-gray-500">
          Optional for now — you can add this later from your dashboard if you don&apos;t have it
          to hand.
        </p>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Meta Pixel ID
        <input
          type="text"
          name="metaPixelId"
          defaultValue={initialPixelId}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>
      {state?.error?.metaPixelId && (
        <p className="text-xs text-red-600">{state.error.metaPixelId[0]}</p>
      )}

      <label className="flex flex-col gap-1 text-sm">
        Meta Ad Account ID
        <input
          type="text"
          name="metaAdAccountId"
          defaultValue={initialAdAccountId}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>
      {state?.error?.metaAdAccountId && (
        <p className="text-xs text-red-600">{state.error.metaAdAccountId[0]}</p>
      )}
      {state?.error?._form && <p className="text-xs text-red-600">{state.error._form[0]}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Saving..." : "Finish"}
      </button>
    </form>
  );
}
