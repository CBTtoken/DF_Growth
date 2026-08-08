"use client";

import { useState } from "react";
import { readableTextOn } from "@/lib/color";
import { STAY_COPY } from "@/lib/stays/copy";
import { addDays, todayInSA } from "@/lib/stays/money";

/**
 * Four fields and a button, and nothing else on the screen until they are
 * filled in.
 *
 * Handoff Job 10: room types appear only after dates are chosen. This is
 * what makes that true, and it is a plain GET form rather than a Server
 * Action on purpose: the answer belongs in the URL so a guest can share it,
 * bookmark it, come back to it, and press the browser's back button without
 * losing what they typed.
 *
 * The only state held here is the check-in date, so that choosing it can
 * push the check-out date forward with it. A picker that lets somebody
 * choose to leave before they arrive and then tells them off afterwards is
 * the interface standard's "validate as the user goes" failing.
 */
export function DatePicker({
  action,
  accentColor,
  checkIn: initialCheckIn,
  checkOut: initialCheckOut,
  adults: initialAdults,
  children: initialChildren,
  compact = false,
}: {
  /** Where the form goes, usually /[clientSlug]/stay. */
  action: string;
  accentColor: string;
  checkIn?: string;
  checkOut?: string;
  adults?: number;
  children?: number;
  compact?: boolean;
}) {
  const today = todayInSA();
  const [checkIn, setCheckIn] = useState(initialCheckIn ?? "");
  const [checkOut, setCheckOut] = useState(initialCheckOut ?? "");

  const minCheckOut = checkIn ? addDays(checkIn, 1) : addDays(today, 1);

  return (
    <form
      action={action}
      method="get"
      className={`grid gap-3 ${compact ? "sm:grid-cols-5" : "sm:grid-cols-2 lg:grid-cols-5"}`}
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{STAY_COPY.checkIn}</span>
        <input
          type="date"
          name="checkIn"
          required
          min={today}
          value={checkIn}
          onChange={(event) => {
            const value = event.target.value;
            setCheckIn(value);
            if (value && checkOut && checkOut <= value) setCheckOut(addDays(value, 1));
          }}
          className="h-12 rounded-xl border border-gray-200 bg-white px-3 text-base text-gray-900 focus:border-gray-400 focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{STAY_COPY.checkOut}</span>
        <input
          type="date"
          name="checkOut"
          required
          min={minCheckOut}
          value={checkOut}
          onChange={(event) => setCheckOut(event.target.value)}
          className="h-12 rounded-xl border border-gray-200 bg-white px-3 text-base text-gray-900 focus:border-gray-400 focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{STAY_COPY.adults}</span>
        <input
          type="number"
          name="adults"
          required
          min={1}
          max={20}
          defaultValue={initialAdults ?? 2}
          inputMode="numeric"
          className="h-12 rounded-xl border border-gray-200 bg-white px-3 text-base text-gray-900 focus:border-gray-400 focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{STAY_COPY.children}</span>
        <input
          type="number"
          name="children"
          min={0}
          max={20}
          defaultValue={initialChildren ?? 0}
          inputMode="numeric"
          className="h-12 rounded-xl border border-gray-200 bg-white px-3 text-base text-gray-900 focus:border-gray-400 focus:outline-none"
        />
      </label>

      {/* The one primary action, full width on a phone where a thumb
          reaches it, per the interface standard. */}
      <button
        type="submit"
        className="mt-1 h-12 rounded-xl px-5 text-base font-semibold shadow-sm transition hover:-translate-y-0.5 sm:mt-6"
        style={{ backgroundColor: accentColor, color: readableTextOn(accentColor) }}
      >
        {STAY_COPY.search}
      </button>
    </form>
  );
}
