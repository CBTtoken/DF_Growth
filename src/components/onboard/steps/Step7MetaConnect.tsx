"use client";

import { useActionState, useEffect, useState } from "react";
import { saveStep7, type OnboardState } from "@/app/onboard/actions";

const inputClass =
  "rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20";
const labelClass = "flex flex-col gap-1.5 text-sm font-medium text-gray-700";

export function Step7MetaConnect({
  initialPixelId,
  initialAdAccountId,
  onSuccess,
}: {
  initialPixelId: string;
  initialAdAccountId: string;
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState<OnboardState, FormData>(saveStep7, null);
  const [hasMetaSetup, setHasMetaSetup] = useState<"yes" | "no" | null>(
    initialPixelId ? "yes" : null
  );

  useEffect(() => {
    if (state?.success) onSuccess();
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-ink">Connect your Meta ad account</h2>
        <p className="mt-1 text-sm text-gray-500">
          This lets us track which ads actually turn into customers, so your ad spend isn&apos;t
          wasted. It&apos;s fine if you don&apos;t know what this means yet.
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          onClick={() => setHasMetaSetup("yes")}
          className={`rounded-xl border px-4 py-3.5 text-left text-sm transition-colors ${
            hasMetaSetup === "yes" ? "border-brand bg-brand/5" : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <span className="font-semibold text-gray-900">I already have this set up</span>
          <span className="block text-gray-500">I know my Meta Pixel ID and Ad Account ID</span>
        </button>
        <button
          type="button"
          onClick={() => setHasMetaSetup("no")}
          className={`rounded-xl border px-4 py-3.5 text-left text-sm transition-colors ${
            hasMetaSetup === "no" ? "border-brand bg-brand/5" : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <span className="font-semibold text-gray-900">I don&apos;t know / need help with this</span>
          <span className="block text-gray-500">
            No problem — our team will reach out and set it up with you
          </span>
        </button>
      </div>

      <input type="hidden" name="hasMetaSetup" value={hasMetaSetup ?? ""} />

      {hasMetaSetup === "yes" && (
        <>
          <label className={labelClass}>
            Meta Pixel ID
            <input
              type="text"
              name="metaPixelId"
              defaultValue={initialPixelId}
              placeholder="e.g. 1234567890123456"
              className={inputClass}
            />
            <span className="text-xs font-normal text-gray-400">
              Meta Business Manager → Events Manager → your Pixel → Settings
            </span>
          </label>
          {"metaPixelId" in (state?.error ?? {}) && (
            <p className="text-xs text-red-600">{state?.error?.metaPixelId?.[0]}</p>
          )}

          <label className={labelClass}>
            Meta Ad Account ID
            <input
              type="text"
              name="metaAdAccountId"
              defaultValue={initialAdAccountId}
              placeholder="e.g. act_1234567890"
              className={inputClass}
            />
            <span className="text-xs font-normal text-gray-400">
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
        className="mt-2 inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark disabled:opacity-50 disabled:hover:translate-y-0"
      >
        {pending ? "Saving..." : "Continue"}
      </button>
    </form>
  );
}
