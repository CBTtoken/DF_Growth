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
    <form id="meta-token-form" action={formAction} className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4">
      <div>
        <h3 className="text-sm font-semibold">Meta access token</h3>
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
        className="rounded border border-gray-300 px-3 py-2 text-sm"
      />
      {state?.error?.accessToken && <p className="text-xs text-red-600">{state.error.accessToken[0]}</p>}
      {state?.error?._form && <p className="text-xs text-red-600">{state.error._form[0]}</p>}
      {state?.success && <p className="text-xs text-green-600">Token saved and encrypted.</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save token"}
      </button>
    </form>
  );
}
