"use client";

import { useActionState } from "react";
import { setMarketplaceUrl } from "@/app/admin/clients/[id]/actions";

// Public Beta Polish Sprint Sec 11: the one place this admin-only field is
// ever set — deliberately absent from onboarding and the client's own
// dashboard, see the action's own comment for why.
export function MarketplaceUrlForm({ clientId, initialUrl }: { clientId: string; initialUrl: string | null }) {
  const [state, formAction, pending] = useActionState(setMarketplaceUrl, null);

  return (
    <form action={formAction} className="flex flex-col gap-1.5">
      <input type="hidden" name="clientId" value={clientId} />
      <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">Marketplace URL</label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="url"
          name="marketplaceUrl"
          defaultValue={initialUrl ?? ""}
          placeholder="https://digitalflyer.co.za/listing/..."
          className="h-10 min-w-[280px] flex-1 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center justify-center rounded-full bg-brand px-4 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save"}
        </button>
      </div>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state?.success && <p className="text-xs text-green-700">Saved.</p>}
    </form>
  );
}
