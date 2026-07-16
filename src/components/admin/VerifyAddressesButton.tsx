"use client";

import { useState, useTransition } from "react";
import { verifyReactivationAddresses } from "@/app/admin/reactivation/actions";

// No form fields needed, so a plain onClick calling the Server Action
// directly (Next.js allows this outside a <form>) rather than
// useActionState, which is built around form submission.
export function VerifyAddressesButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setResult(null);
            const res = await verifyReactivationAddresses();
            setResult(
              res.ok
                ? `Checked ${res.checked} — ${res.valid} valid, ${res.invalid} invalid`
                : `Failed: ${res.error}`
            );
          })
        }
        className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 transition hover:-translate-y-0.5 hover:border-gray-300 disabled:opacity-50"
      >
        {pending ? "Checking…" : "Verify addresses"}
      </button>
      {result && <span className="text-xs text-gray-500">{result}</span>}
    </div>
  );
}
