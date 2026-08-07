"use client";

import { useActionState, useState } from "react";
import { TurnstileWidget } from "@/components/reviews/TurnstileWidget";
import type { ReportState } from "@/app/jobs/find-people/actions";

// One report form for both public browse layers. The Server Action comes
// in as a prop (candidate or vacancy variant), so the Turnstile rule and
// the UI live once.
export function ReportListingForm({
  targetId,
  action,
  label = "Report this listing",
}: {
  targetId: string;
  action: (prev: ReportState, formData: FormData) => Promise<ReportState>;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, null);

  if (state?.success) {
    return <p className="text-sm text-neutral-500">Thanks, we&apos;ve received your report.</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-neutral-400 underline-offset-2 hover:text-neutral-700 hover:underline"
      >
        {label}
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-xl border border-neutral-100 bg-neutral-50 p-4">
      <input type="hidden" name="targetId" value={targetId} />
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        What&apos;s wrong with this listing?
        <textarea
          name="reason"
          rows={3}
          maxLength={500}
          placeholder="Optional, but it helps us look into it faster"
          className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900"
        />
      </label>
      <TurnstileWidget siteKey={process.env.NEXT_PUBLIC_JOBS_TURNSTILE_SITE_KEY} />
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Sending..." : "Send report"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-neutral-200 px-4 py-2 text-xs font-medium text-neutral-500"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
