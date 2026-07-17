"use client";

import { useActionState, useState } from "react";
import { reportEvent } from "@/lib/events/actions";

// List Your Event Sec 6: "visible on every public event page" — no login
// required. Collapsed by default (a details/summary toggle, matching the
// same low-key treatment reviews' business-flag action uses) since this
// is a report action, not something that should compete visually with
// the event's own content for attention.
export function ReportEventButton({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const action = reportEvent.bind(null, eventId);
  const [state, formAction, pending] = useActionState(action, null);

  if (state?.success) {
    return <p className="text-xs text-gray-400">Thanks — our team will take a look.</p>;
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-gray-400 hover:text-gray-600">
        Report this event
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <textarea
        name="reason"
        rows={2}
        placeholder="Why are you reporting this event?"
        className="rounded-lg border border-gray-200 p-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-full border border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-700 hover:border-gray-400 disabled:opacity-50"
        >
          {pending ? "Submitting…" : "Submit report"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-gray-400 hover:text-gray-600">
          Cancel
        </button>
      </div>
    </form>
  );
}
