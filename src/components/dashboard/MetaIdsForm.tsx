"use client";

import { useActionState } from "react";
import { saveMetaIds } from "@/app/dashboard/actions";

export function MetaIdsForm() {
  const [state, formAction, pending] = useActionState(saveMetaIds, null);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-700">Meta Pixel &amp; Ad Account ID</h3>
        <p className="text-xs text-gray-500">Already have these? Add them yourself, no need to wait.</p>
      </div>

      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        Meta Pixel ID
        <input
          type="text"
          name="metaPixelId"
          placeholder="e.g. 1234567890123456"
          className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        <span className="font-normal text-gray-400">
          Meta Business Manager → Events Manager → your Pixel → Settings
        </span>
      </label>
      {state?.error?.metaPixelId && <p className="text-xs text-red-600">{state.error.metaPixelId[0]}</p>}

      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
        Meta Ad Account ID
        <input
          type="text"
          name="metaAdAccountId"
          placeholder="e.g. act_1234567890"
          className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        <span className="font-normal text-gray-400">Meta Ads Manager → Account overview, under your account name</span>
      </label>
      {state?.error?.metaAdAccountId && <p className="text-xs text-red-600">{state.error.metaAdAccountId[0]}</p>}
      {state?.error?._form && <p className="text-xs text-red-600">{state.error._form[0]}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark disabled:opacity-50 disabled:hover:translate-y-0"
      >
        {pending ? "Saving..." : "Connect"}
      </button>
    </form>
  );
}
