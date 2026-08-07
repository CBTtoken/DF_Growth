"use client";

import { useActionState, useState } from "react";
import { reportCandidate } from "@/app/jobs/find-people/actions";
import { TurnstileWidget } from "@/components/reviews/TurnstileWidget";

export function ReportCandidateForm({ candidateId }: { candidateId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(reportCandidate, null);

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
        Report this listing
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3 rounded-xl border border-neutral-100 bg-neutral-50 p-4">
      <input type="hidden" name="candidateId" value={candidateId} />
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
