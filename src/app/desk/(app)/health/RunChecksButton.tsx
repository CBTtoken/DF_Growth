"use client";

import { useState, useTransition } from "react";
import { runChecksNow } from "./actions";

/**
 * The one button on the screen.
 *
 * A dozen providers answer at their own pace, so the run takes a few seconds
 * and the button says so rather than appearing to have done nothing.
 */
export function RunChecksButton() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            try {
              await runChecksNow();
            } catch (err) {
              setError(err instanceof Error ? err.message : "The run did not finish.");
            }
          })
        }
        className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Checking..." : "Run checks"}
      </button>
      {pending && <span className="text-xs text-gray-500">Asking each provider, a few seconds.</span>}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
