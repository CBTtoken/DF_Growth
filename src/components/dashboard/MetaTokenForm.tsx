"use client";

import { useActionState, useEffect } from "react";
import { saveMetaToken } from "@/app/dashboard/actions";

export function MetaTokenForm({ hasToken }: { hasToken: boolean }) {
  const [state, formAction, pending] = useActionState(saveMetaToken, null);

  useEffect(() => {
    if (state?.success) {
      const form = document.getElementById("meta-token-form") as HTMLFormElement | null;
      form?.reset();
    }
  }, [state]);

  return (
    <form
      id="meta-token-form"
      action={formAction}
      className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4"
    >
      <div>
        <h3 className="text-sm font-semibold text-gray-700">Meta access token</h3>
        <p className="text-xs text-gray-500">
          {hasToken
            ? "A token is connected. Paste a new one below to replace it."
            : "Generate a token in Meta Business Settings → System Users → Generate Token, with ads_management permission, and paste it here."}
        </p>
      </div>

      <input
        type="password"
        name="accessToken"
        placeholder={hasToken ? "•••••••••••••••••••• (connected)" : "Paste token here"}
        className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
      {state?.error?.accessToken && <p className="text-xs text-red-600">{state.error.accessToken[0]}</p>}
      {state?.error?._form && <p className="text-xs text-red-600">{state.error._form[0]}</p>}
      {state?.success && <p className="text-xs text-green-600">Token saved and encrypted.</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark disabled:opacity-50 disabled:hover:translate-y-0"
      >
        {pending ? "Saving..." : "Save token"}
      </button>
    </form>
  );
}
