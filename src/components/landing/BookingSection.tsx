"use client";

import { useEffect, useMemo, useState, useActionState } from "react";
import { createBookingHold } from "@/app/[clientSlug]/booking-actions";
import { readableTextOn } from "@/lib/color";

export type PublicBookableUnit = {
  id: string;
  name: string;
  unit_type: "time_slot" | "day_night" | "capacity";
  description: string | null;
  base_price_cents: number;
  capacity: number | null;
  duration_minutes: number | null;
};

type OperatingHours = Record<string, { open: string; close: string }[]>;
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

// Every business on this platform is South African (booking_operational_
// rules.timezone is always Africa/Johannesburg, no DST) — operating_hours
// and the picked date/time are always SAST wall-clock values, regardless of
// which timezone the visitor's own browser happens to be in. Building the
// ISO string with an explicit "+02:00" offset (rather than
// `new Date(...)`, which silently interprets the string using the
// browser's own local timezone) is what makes a slot picked by a visitor in
// any timezone land on the same real-world instant a SAST business expects.
function sastToIso(date: string, time: string): string {
  return new Date(`${date}T${time}:00+02:00`).toISOString();
}

// Inverse of sastToIso, for turning a UTC starts_at back into the SAST
// "HH:MM" label it needs to match against timeSlots' own labels — done via
// UTC methods on a shifted timestamp rather than toLocaleString/
// toISOString, so this is correct regardless of the viewing browser's
// timezone too.
function isoToSastHHMM(iso: string): string {
  const shifted = new Date(new Date(iso).getTime() + 2 * 60 * 60 * 1000);
  const h = shifted.getUTCHours().toString().padStart(2, "0");
  const m = shifted.getUTCMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

// docs/GROWTH_BOOKING_SHOP_MODULES_CLAUDE.md Sec 3.5: "mobile-first, large
// tappable date blocks... upfront price breakdown next to the calendar...
// sticky bottom checkout drawer." Sprint 2 keeps this to a single inline
// section rather than a separate sticky drawer component — the checkout
// step (name/phone/email) only appears once a slot is actually picked, so
// the section itself never feels heavier than it needs to at any one time.
export function BookingSection({
  growthClientId,
  ownerEmail,
  businessName,
  primaryColor,
  units,
  operatingHours,
  bufferMinutes,
}: {
  growthClientId: string;
  ownerEmail: string | null;
  businessName: string;
  primaryColor: string;
  units: PublicBookableUnit[];
  operatingHours: OperatingHours;
  bufferMinutes: number;
}) {
  const [selectedUnitId, setSelectedUnitId] = useState(units[0]?.id ?? "");
  const selectedUnit = units.find((u) => u.id === selectedUnitId) ?? units[0];

  const [date, setDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [time, setTime] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [takenTimes, setTakenTimes] = useState<string[]>([]);

  const boundAction = createBookingHold.bind(null, growthClientId, ownerEmail, businessName);
  const [state, formAction, pending] = useActionState(boundAction, null);
  const buttonTextColor = readableTextOn(primaryColor);

  // Sec 3.6: buffer + operating hours generate real slot options — a
  // visitor never has to guess what times are actually valid.
  const timeSlots = useMemo(() => {
    if (!selectedUnit || selectedUnit.unit_type !== "time_slot" || !date) return [];
    const dayKey = DAY_KEYS[new Date(`${date}T00:00:00`).getDay()];
    const hours = operatingHours[dayKey];
    if (!hours || hours.length === 0) return [];

    const duration = selectedUnit.duration_minutes ?? 30;
    const step = duration + bufferMinutes;
    const slots: string[] = [];

    for (const range of hours) {
      const [openH, openM] = range.open.split(":").map(Number);
      const [closeH, closeM] = range.close.split(":").map(Number);
      let cursor = openH * 60 + openM;
      const end = closeH * 60 + closeM;
      while (cursor + duration <= end) {
        const h = Math.floor(cursor / 60)
          .toString()
          .padStart(2, "0");
        const m = (cursor % 60).toString().padStart(2, "0");
        slots.push(`${h}:${m}`);
        cursor += step;
      }
    }
    return slots;
  }, [selectedUnit, date, operatingHours, bufferMinutes]);

  // Real-time availability check (Sec 3.2) — refetched whenever the unit or
  // date changes, so a slot someone else just took shows as taken without a
  // full page reload.
  useEffect(() => {
    // No setState synchronously at the top of this effect (react-hooks'
    // set-state-in-effect rule correctly flags that as an avoidable extra
    // render) — same reasoning as OrderReturnBanner.tsx: the fetch is
    // sub-second in practice, so going straight from the previous result to
    // the new one costs no meaningful UX over a flashed "checking" state.
    // takenTimes is only ever read while rendering time_slot buttons, which
    // don't render at all once selectedUnit/date stop matching this
    // condition, so a stale value sitting unused in state is harmless too.
    if (!selectedUnit || selectedUnit.unit_type !== "time_slot" || !date) return;
    const from = `${date}T00:00:00.000Z`;
    const to = `${date}T23:59:59.999Z`;
    fetch(`/api/booking/availability?unitId=${selectedUnit.id}&from=${from}&to=${to}`)
      .then((res) => res.json())
      .then((data: { reservations?: { starts_at: string }[] }) => {
        const taken = (data.reservations ?? []).map((r) => isoToSastHHMM(r.starts_at));
        setTakenTimes(taken);
      })
      .catch(() => setTakenTimes([]));
  }, [selectedUnit, date]);

  if (units.length === 0) return null;
  if (!selectedUnit) return null;

  const timeSlotStartsAt = selectedUnit.unit_type === "time_slot" && date && time ? sastToIso(date, time) : null;
  const timeSlotEndsAt =
    timeSlotStartsAt != null
      ? new Date(new Date(timeSlotStartsAt).getTime() + (selectedUnit.duration_minutes ?? 30) * 60000).toISOString()
      : null;

  const finalStartsAt =
    selectedUnit.unit_type === "time_slot"
      ? timeSlotStartsAt
      : date
        ? sastToIso(date, "00:00")
        : null;
  const endsAtIso =
    selectedUnit.unit_type === "time_slot"
      ? timeSlotEndsAt
      : selectedUnit.unit_type === "day_night" && endDate
        ? sastToIso(endDate, "00:00")
        : selectedUnit.unit_type === "capacity" && date
          ? sastToIso(date, "23:59")
          : null;

  const canSubmit =
    selectedUnit.unit_type === "time_slot"
      ? Boolean(finalStartsAt && endsAtIso)
      : selectedUnit.unit_type === "day_night"
        ? Boolean(date && endDate)
        : Boolean(date);

  return (
    <section id="booking" className="bg-white px-4 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-xl">
        <h2 className="text-center text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Book Now</h2>

        {state?.success ? (
          <div className="mt-8 flex flex-col items-center gap-2 rounded-3xl bg-gray-50 p-8 text-center shadow-sm">
            <span
              aria-hidden
              className="grid size-12 place-items-center rounded-full text-2xl"
              style={{ backgroundColor: `${primaryColor}1a`, color: primaryColor }}
            >
              ✓
            </span>
            <h3 className="mt-2 text-xl font-bold text-gray-900">Booking received!</h3>
            <p className="max-w-sm text-gray-500">{businessName} will be in touch shortly to confirm.</p>
          </div>
        ) : (
          <div className="mt-8 rounded-3xl bg-gray-50 p-6 shadow-sm sm:p-8">
            {units.length > 1 && (
              <div className="mb-5 flex flex-wrap gap-2">
                {units.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setSelectedUnitId(u.id);
                      setDate("");
                      setEndDate("");
                      setTime("");
                    }}
                    className="rounded-full border px-4 py-2 text-sm font-medium transition"
                    style={
                      u.id === selectedUnitId
                        ? { backgroundColor: primaryColor, color: buttonTextColor, borderColor: primaryColor }
                        : { borderColor: "#d1d5db", color: "#374151" }
                    }
                  >
                    {u.name}
                  </button>
                ))}
              </div>
            )}

            <div className="mb-5 flex items-baseline justify-between">
              <div>
                <p className="text-lg font-semibold text-gray-900">{selectedUnit.name}</p>
                {selectedUnit.description && <p className="mt-0.5 text-sm text-gray-500">{selectedUnit.description}</p>}
              </div>
              <p className="text-lg font-bold" style={{ color: primaryColor }}>
                R{(selectedUnit.base_price_cents / 100).toFixed(2)}
              </p>
            </div>

            <form action={formAction} className="flex flex-col gap-4">
              <input type="hidden" name="bookableUnitId" value={selectedUnit.id} />
              <input type="hidden" name="startsAt" value={finalStartsAt ?? ""} />
              <input type="hidden" name="endsAt" value={endsAtIso ?? ""} />
              <input type="hidden" name="quantity" value={quantity} />

              {selectedUnit.unit_type === "time_slot" && (
                <>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-gray-700">Date</span>
                    <input
                      type="date"
                      value={date}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => {
                        setDate(e.target.value);
                        setTime("");
                      }}
                      required
                      className="h-12 rounded-xl border border-gray-300 bg-white px-4 text-gray-900 outline-none"
                    />
                  </label>
                  {date && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-sm font-medium text-gray-700">Time</span>
                      {timeSlots.length === 0 ? (
                        <p className="text-sm text-gray-400">No times available on this date.</p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {timeSlots.map((slot) => {
                            const isTaken = takenTimes.includes(slot);
                            return (
                              <button
                                key={slot}
                                type="button"
                                disabled={isTaken}
                                onClick={() => setTime(slot)}
                                className="rounded-lg border px-2 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40"
                                style={
                                  time === slot
                                    ? { backgroundColor: primaryColor, color: buttonTextColor, borderColor: primaryColor }
                                    : { borderColor: "#d1d5db", color: "#374151" }
                                }
                              >
                                {slot}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {selectedUnit.unit_type === "day_night" && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-gray-700">Check-in</span>
                    <input
                      type="date"
                      value={date}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className="h-12 rounded-xl border border-gray-300 bg-white px-3 text-gray-900 outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-gray-700">Check-out</span>
                    <input
                      type="date"
                      value={endDate}
                      min={date || new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      className="h-12 rounded-xl border border-gray-300 bg-white px-3 text-gray-900 outline-none"
                    />
                  </label>
                </div>
              )}

              {selectedUnit.unit_type === "capacity" && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-gray-700">Date</span>
                    <input
                      type="date"
                      value={date}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className="h-12 rounded-xl border border-gray-300 bg-white px-3 text-gray-900 outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-gray-700">Quantity</span>
                    <input
                      type="number"
                      min={1}
                      max={selectedUnit.capacity ?? 1000}
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="h-12 rounded-xl border border-gray-300 bg-white px-3 text-gray-900 outline-none"
                    />
                  </label>
                </div>
              )}

              {canSubmit && (
                <>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-gray-700">Name</span>
                    <input
                      name="customerName"
                      type="text"
                      required
                      placeholder="Your name"
                      className="h-12 rounded-xl border border-gray-300 bg-white px-4 text-gray-900 outline-none placeholder:text-gray-400"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-gray-700">Phone</span>
                    <input
                      name="customerPhone"
                      type="tel"
                      required
                      placeholder="Phone number"
                      className="h-12 rounded-xl border border-gray-300 bg-white px-4 text-gray-900 outline-none placeholder:text-gray-400"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-gray-700">Email</span>
                    <input
                      name="customerEmail"
                      type="email"
                      required
                      placeholder="you@example.com"
                      className="h-12 rounded-xl border border-gray-300 bg-white px-4 text-gray-900 outline-none placeholder:text-gray-400"
                    />
                  </label>
                </>
              )}

              {state?.error?._form && <p className="text-sm text-red-600">{state.error._form[0]}</p>}

              <button
                type="submit"
                disabled={pending || !canSubmit}
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-base font-semibold shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ backgroundColor: primaryColor, color: buttonTextColor }}
              >
                {pending ? "Booking..." : "Confirm Booking"}
              </button>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}
