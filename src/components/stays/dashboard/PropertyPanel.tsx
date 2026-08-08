"use client";

import { useActionState } from "react";
import { saveProperty, type ActionState } from "@/app/dashboard/stays/actions";
import { AmenityTicks } from "@/components/stays/dashboard/AmenityTicks";
import type { StaysProperty } from "@/lib/stays/types";

// The things that are true about the whole place, set once and rarely
// touched, which is why this section is last and closed.

const inputClass =
  "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-base text-ink outline-none transition placeholder:text-gray-300 focus:border-gray-400";
const labelClass = "text-xs font-semibold uppercase tracking-wide text-gray-500";

export function PropertyPanel({ property }: { property: StaysProperty }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveProperty, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>A few lines about staying here</span>
        <textarea
          name="intro"
          rows={4}
          defaultValue={property.intro ?? ""}
          placeholder="Quiet rooms a few minutes from the wine farms, with breakfast and off street parking."
          className={inputClass}
        />
        <span className="text-xs text-gray-500">
          This sits above the date picker on your page. Keep it short. The longer story belongs in your About
          section.
        </span>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Check in from</span>
          <input
            name="checkInFrom"
            type="text"
            defaultValue={property.checkInFrom ?? ""}
            placeholder="14:00"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Check out by</span>
          <input
            name="checkOutBy"
            type="text"
            defaultValue={property.checkOutBy ?? ""}
            placeholder="10:00"
            className={inputClass}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>The rest is due this many days before they arrive</span>
        <input
          name="balanceDueDays"
          type="number"
          min={0}
          max={90}
          inputMode="numeric"
          defaultValue={property.balanceDueDays}
          className={inputClass}
        />
        <span className="text-xs text-gray-500">
          Zero means on arrival. This is what the guest is told, and what the invoice in KatisoBiz uses as its due
          date. Nothing is sent automatically: you send the reminder yourself when you are ready.
        </span>
      </label>

      <AmenityTicks level="property" selected={property.amenities} />

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Your cancellation terms</span>
        <textarea
          name="cancellationTerms"
          rows={4}
          defaultValue={property.cancellationTerms ?? ""}
          placeholder="Cancel more than 14 days before you arrive and the deposit is refunded in full. Inside 14 days the deposit is not refunded."
          className={inputClass}
        />
        <span className="text-xs text-gray-500">
          Your own words, in your own terms. Guests see this before they pay and again on their confirmation.
        </span>
      </label>

      {state?.error?._form && <p className="text-sm text-red-600">{state.error._form[0]}</p>}
      {state?.saved && <p className="text-sm font-semibold text-green-700">Saved.</p>}

      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-full bg-brand text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Saving" : "Save your details"}
      </button>
    </form>
  );
}
