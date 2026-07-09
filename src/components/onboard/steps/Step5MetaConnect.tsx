"use client";

import { useActionState, useEffect, useState } from "react";
import { saveStep5, type OnboardState } from "@/app/onboard/actions";

export function Step5MetaConnect({
  initialPixelId,
  initialAdAccountId,
  onSuccess,
}: {
  initialPixelId: string;
  initialAdAccountId: string;
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState<OnboardState, FormData>(saveStep5, null);
  const [hasMetaSetup, setHasMetaSetup] = useState<"yes" | "no" | null>(
    initialPixelId ? "yes" : null
  );

  useEffect(() => {
    if (state?.success) onSuccess();
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold">Connect your Meta ad account</h2>
        <p className="text-sm text-gray-500">
          This lets us track which ads actually turn into customers, so your ad spend isn&apos;t
          wasted. It&apos;s fine if you don&apos;t know what this means yet.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setHasMetaSetup("yes")}
          className={`rounded border px-4 py-3 text-left text-sm ${
            hasMetaSetup === "yes" ? "border-gray-900 bg-gray-50" : "border-gray-300"
          }`}
        >
          <span className="font-medium">I already have this set up</span>
          <span className="block text-gray-500">
            I know my Meta Pixel ID and Ad Account ID
          </span>
        </button>
        <button
          type="button"
          onClick={() => setHasMetaSetup("no")}
          className={`rounded border px-4 py-3 text-left text-sm ${
            hasMetaSetup === "no" ? "border-gray-900 bg-gray-50" : "border-gray-300"
          }`}
        >
          <span className="font-medium">I don&apos;t know / need help with this</span>
          <span className="block text-gray-500">
            No problem — our team will reach out and set it up with you
          </span>
        </button>
      </div>

      <input type="hidden" name="hasMetaSetup" value={hasMetaSetup ?? ""} />

      {hasMetaSetup === "yes" && (
        <>
          <label className="flex flex-col gap-1 text-sm">
            Meta Pixel ID
            <input
              type="text"
              name="metaPixelId"
              defaultValue={initialPixelId}
              placeholder="e.g. 1234567890123456"
              className="rounded border border-gray-300 px-3 py-2"
            />
            <span className="text-xs text-gray-400">
              Meta Business Manager → Events Manager → your Pixel → Settings
            </span>
          </label>
          {"metaPixelId" in (state?.error ?? {}) && (
            <p className="text-xs text-red-600">{state?.error?.metaPixelId?.[0]}</p>
          )}

          <label className="flex flex-col gap-1 text-sm">
            Meta Ad Account ID
            <input
              type="text"
              name="metaAdAccountId"
              defaultValue={initialAdAccountId}
              placeholder="e.g. act_1234567890"
              className="rounded border border-gray-300 px-3 py-2"
            />
            <span className="text-xs text-gray-400">
              Meta Ads Manager → Account overview, under your account name
            </span>
          </label>
          {"metaAdAccountId" in (state?.error ?? {}) && (
            <p className="text-xs text-red-600">{state?.error?.metaAdAccountId?.[0]}</p>
          )}
        </>
      )}

      {state?.error?._form && <p className="text-xs text-red-600">{state.error._form[0]}</p>}

      <button
        type="submit"
        disabled={pending || !hasMetaSetup}
        className="mt-2 rounded bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Saving..." : "Finish"}
      </button>
    </form>
  );
}
