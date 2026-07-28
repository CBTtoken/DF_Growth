"use client";

import { useActionState } from "react";
import { setStartingNumber } from "@/app/bizup/actions";

// One series' starting number. Two of these on the page, one for invoices
// and one for quotes, because a member arriving from another system is
// usually mid-sequence on both and the two numbers are rarely the same.
//
// Locked once anything in that series has been issued, and the locked
// state explains why rather than just disabling the field. A member who
// cannot see the reason assumes it is a bug and asks.
export function StartingNumberForm({
  series,
  label,
  locked,
  currentNext,
  year,
}: {
  series: "INV" | "QUO";
  label: string;
  locked: boolean;
  currentNext: number;
  year: number;
}) {
  const [state, action, pending] = useActionState(setStartingNumber, null);

  const preview = `${series}-${year}-${String(currentNext).padStart(4, "0")}`;

  if (locked) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-ink">{label}</h3>
        <p className="mt-1 text-sm text-gray-500">
          Your next {label.toLowerCase()} will be <strong>{preview}</strong>.
        </p>
        <p className="mt-3 rounded-xl bg-gray-50 p-3 text-xs text-gray-500">
          This is locked because you have already issued one. Changing it now would either repeat a
          number a customer already has, or leave a gap in your sequence, and both cause problems at
          audit. If it genuinely needs changing, contact us.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h3 className="text-base font-bold text-ink">{label}</h3>
      <p className="mt-1 text-sm text-gray-500">
        Your next {label.toLowerCase()} will be <strong>{preview}</strong>.
      </p>

      <input type="hidden" name="series" value={series} />

      <label className="mt-4 block text-sm font-medium text-ink">
        Start my numbering at
        <input
          type="number"
          name="startAt"
          min={1}
          step={1}
          defaultValue={currentNext}
          inputMode="numeric"
          className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-base text-ink outline-none focus:border-brand"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="mt-3 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save"}
      </button>

      {state?.error && <p className="mt-3 text-sm font-medium text-red-600">{state.error}</p>}
      {state?.ok && <p className="mt-3 text-sm font-medium text-green-700">{state.ok}</p>}
    </form>
  );
}
