"use client";

import { useState, useTransition, useActionState, useEffect } from "react";
import {
  setBookingEnabled,
  saveBookableUnit,
  deleteBookableUnit,
  toggleBookableUnitActive,
  saveBookingRules,
  confirmReservationManually,
  cancelReservation,
} from "@/app/dashboard/booking-actions";
import { BOOKABLE_UNIT_TYPES } from "@/lib/schemas/booking";
import { Card } from "@/components/ui/Card";

export type BookableUnit = {
  id: string;
  name: string;
  unit_type: (typeof BOOKABLE_UNIT_TYPES)[number];
  description: string | null;
  base_price_cents: number;
  capacity: number | null;
  duration_minutes: number | null;
  is_active: boolean;
};

export type BookingRules = {
  operating_hours: Record<string, { open: string; close: string }[]>;
  buffer_minutes: number;
  min_advance_hours: number;
  cancellation_policy_text: string | null;
  reminder_offsets_hours: number[];
} | null;

export type UpcomingReservation = {
  id: string;
  bookable_unit_id: string;
  status: "held" | "confirmed" | "cancelled" | "expired";
  starts_at: string;
  ends_at: string;
  quantity: number;
  customer_name: string | null;
  customer_phone: string | null;
  price_cents: number;
  payment_status: string;
};

const UNIT_TYPE_LABELS: Record<(typeof BOOKABLE_UNIT_TYPES)[number], string> = {
  time_slot: "Fixed-duration appointment (salon, viewing)",
  day_night: "Overnight check-in/check-out (short-stay rental)",
  capacity: "Open shared limit (desks, event space)",
};

const DAYS = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
] as const;

// docs/GROWTH_BOOKING_SHOP_MODULES_CLAUDE.md Sec 3.4: "Setup uses simple
// radio-button questions... not a settings-menu wall." Sprint 2 stub — real
// payment collection (Sec 2's Subaccount routing) is Sprint 4's job, so
// every booking here confirms immediately as unpaid; the business owner
// arranges payment directly with the customer for now, same as any other
// enquiry. The dashboard is where they'd notice and follow up.
export function BookingSection({
  bookingEnabled,
  units,
  rules,
  reservations,
}: {
  bookingEnabled: boolean;
  units: BookableUnit[];
  rules: BookingRules;
  reservations: UpcomingReservation[];
}) {
  const [enabled, setEnabled] = useState(bookingEnabled);
  const [isPending, startTransition] = useTransition();
  const [showAddForm, setShowAddForm] = useState(false);

  function handleToggle() {
    const next = !enabled;
    setEnabled(next);
    startTransition(async () => {
      const result = await setBookingEnabled(next);
      if (result.error) setEnabled(!next);
    });
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-ink">Booking</h2>
          <p className="mt-1 text-sm text-gray-500">
            Let visitors book an appointment, rental, or slot directly from your page.
          </p>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          disabled={isPending}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
            enabled ? "bg-brand" : "bg-gray-300"
          }`}
          aria-pressed={enabled}
          aria-label="Toggle Booking"
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {enabled && (
        <div className="flex flex-col gap-6 border-t border-gray-100 pt-4">
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-gray-800">Your booking options</h3>
            {units.length === 0 && (
              <p className="text-sm text-gray-400">
                No booking options yet — add one below to start taking bookings.
              </p>
            )}
            <ul className="flex flex-col gap-2">
              {units.map((unit) => (
                <BookableUnitRow key={unit.id} unit={unit} />
              ))}
            </ul>
            {showAddForm ? (
              <BookableUnitForm onDone={() => setShowAddForm(false)} />
            ) : (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="self-start rounded-full border border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-700 hover:border-gray-400"
              >
                + Add a booking option
              </button>
            )}
          </div>

          <BookingRulesForm rules={rules} />

          <div className="flex flex-col gap-3 border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-800">Upcoming bookings</h3>
            {reservations.length === 0 ? (
              <p className="text-sm text-gray-400">No upcoming bookings yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {reservations.map((r) => (
                  <ReservationRow key={r.id} reservation={r} unitName={units.find((u) => u.id === r.bookable_unit_id)?.name ?? "Booking"} />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function BookableUnitRow({ unit }: { unit: BookableUnit }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!confirm(`Remove "${unit.name}"? Existing bookings for it are kept, but no new ones can be made.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteBookableUnit(unit.id);
      if (result.error) setError(result.error);
    });
  }

  function handleToggleActive() {
    setError(null);
    startTransition(async () => {
      const result = await toggleBookableUnitActive(unit.id, !unit.is_active);
      if (result.error) setError(result.error);
    });
  }

  if (editing) {
    return <BookableUnitForm unit={unit} onDone={() => setEditing(false)} />;
  }

  return (
    <li className="flex flex-col gap-1 rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">
            {unit.name}{" "}
            {!unit.is_active && (
              <span className="ml-1 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-600">Hidden</span>
            )}
          </p>
          <p className="text-xs text-gray-500">
            {UNIT_TYPE_LABELS[unit.unit_type]} · R{(unit.base_price_cents / 100).toFixed(2)}
            {unit.unit_type === "time_slot" && unit.duration_minutes ? ` · ${unit.duration_minutes} min` : ""}
            {unit.unit_type === "capacity" && unit.capacity ? ` · up to ${unit.capacity} at once` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <button type="button" onClick={() => setEditing(true)} className="font-semibold text-brand hover:underline">
            Edit
          </button>
          <button
            type="button"
            onClick={handleToggleActive}
            disabled={isPending}
            className="font-semibold text-gray-600 hover:underline disabled:opacity-50"
          >
            {unit.is_active ? "Hide" : "Show"}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="font-semibold text-red-600 hover:underline disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </li>
  );
}

function BookableUnitForm({ unit, onDone }: { unit?: BookableUnit; onDone: () => void }) {
  const boundSave = saveBookableUnit.bind(null, unit?.id ?? null);
  const [state, formAction, pending] = useActionState(boundSave, null);
  const [unitType, setUnitType] = useState<(typeof BOOKABLE_UNIT_TYPES)[number]>(unit?.unit_type ?? "time_slot");

  // A freshly-created unit's form should close itself; an edit form stays
  // open (onDone is called explicitly by the parent's "Edit" toggle) so
  // there's no flash of a closing form the user didn't ask to close.
  useEffect(() => {
    if (state?.success && !unit) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onDone/unit intentionally excluded, only state transitions should trigger this
  }, [state]);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 text-sm"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Name</span>
          <input
            name="name"
            defaultValue={unit?.name}
            required
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Price (R)</span>
          <input
            name="basePrice"
            type="number"
            min="0"
            step="0.01"
            defaultValue={unit ? (unit.base_price_cents / 100).toFixed(2) : undefined}
            required
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />
        </label>
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-xs font-medium text-gray-600">
          Are you renting space by the day, booking appointments by the hour, or taking a shared number of spots?
        </legend>
        {BOOKABLE_UNIT_TYPES.map((t) => (
          <label key={t} className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="radio"
              name="unitType"
              value={t}
              checked={unitType === t}
              onChange={() => setUnitType(t)}
            />
            {UNIT_TYPE_LABELS[t]}
          </label>
        ))}
      </fieldset>

      {unitType === "time_slot" && (
        <label className="flex flex-col gap-1 sm:w-1/2">
          <span className="text-xs font-medium text-gray-600">Duration (minutes)</span>
          <input
            name="durationMinutes"
            type="number"
            min="5"
            defaultValue={unit?.duration_minutes ?? 30}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />
        </label>
      )}
      {unitType === "capacity" && (
        <label className="flex flex-col gap-1 sm:w-1/2">
          <span className="text-xs font-medium text-gray-600">How many at once?</span>
          <input
            name="capacity"
            type="number"
            min="1"
            defaultValue={unit?.capacity ?? 1}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />
        </label>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-600">Description (optional)</span>
        <textarea
          name="description"
          defaultValue={unit?.description ?? ""}
          rows={2}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
        />
      </label>

      {state?.error?._form && <p className="text-xs text-red-600">{state.error._form[0]}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-full border border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function BookingRulesForm({ rules }: { rules: BookingRules }) {
  const [openDays, setOpenDays] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const d of DAYS) initial[d.key] = Boolean(rules?.operating_hours?.[d.key]?.length);
    return initial;
  });
  const [times, setTimes] = useState<Record<string, { open: string; close: string }>>(() => {
    const initial: Record<string, { open: string; close: string }> = {};
    for (const d of DAYS) {
      const existing = rules?.operating_hours?.[d.key]?.[0];
      initial[d.key] = { open: existing?.open ?? "09:00", close: existing?.close ?? "17:00" };
    }
    return initial;
  });
  const [reminderHours, setReminderHours] = useState(rules?.reminder_offsets_hours?.[0]?.toString() ?? "24");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleSubmit(formData: FormData) {
    setError(null);
    setSaved(false);
    const operatingHours: Record<string, { open: string; close: string }[]> = {};
    for (const d of DAYS) {
      if (openDays[d.key]) operatingHours[d.key] = [times[d.key]];
    }
    const reminderNum = Number(reminderHours);
    startTransition(async () => {
      const result = await saveBookingRules(
        operatingHours,
        Number.isFinite(reminderNum) && reminderNum > 0 ? [reminderNum] : [24],
        null,
        formData
      );
      if (result?.error) setError(result.error._form?.[0] ?? "Could not save.");
      else setSaved(true);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4 border-t border-gray-100 pt-4">
      <h3 className="text-sm font-semibold text-gray-800">Operating hours &amp; rules</h3>

      <div className="flex flex-col gap-2">
        {DAYS.map((d) => (
          <div key={d.key} className="flex flex-wrap items-center gap-3 text-sm">
            <label className="flex w-14 items-center gap-2 font-medium text-gray-700">
              <input
                type="checkbox"
                checked={openDays[d.key]}
                onChange={(e) => setOpenDays((prev) => ({ ...prev, [d.key]: e.target.checked }))}
              />
              {d.label}
            </label>
            {openDays[d.key] ? (
              <>
                <input
                  type="time"
                  value={times[d.key].open}
                  onChange={(e) => setTimes((prev) => ({ ...prev, [d.key]: { ...prev[d.key], open: e.target.value } }))}
                  className="rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-900"
                />
                <span className="text-gray-400">to</span>
                <input
                  type="time"
                  value={times[d.key].close}
                  onChange={(e) => setTimes((prev) => ({ ...prev, [d.key]: { ...prev[d.key], close: e.target.value } }))}
                  className="rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-900"
                />
              </>
            ) : (
              <span className="text-xs text-gray-400">Closed</span>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Buffer between bookings (min)</span>
          <input
            name="bufferMinutes"
            type="number"
            min="0"
            defaultValue={rules?.buffer_minutes ?? 0}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Minimum notice (hours)</span>
          <input
            name="minAdvanceHours"
            type="number"
            min="0"
            defaultValue={rules?.min_advance_hours ?? 0}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Remind customer (hours before)</span>
          <input
            type="number"
            min="1"
            value={reminderHours}
            onChange={(e) => setReminderHours(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-600">Cancellation policy shown to customers (optional)</span>
        <textarea
          name="cancellationPolicyText"
          defaultValue={rules?.cancellation_policy_text ?? ""}
          rows={2}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
        />
      </label>

      {error && <p className="text-xs text-red-600">{error}</p>}
      {saved && !isPending && <p className="text-xs text-green-700">Saved.</p>}

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
      >
        {isPending ? "Saving..." : "Save hours & rules"}
      </button>
    </form>
  );
}

function ReservationRow({ reservation, unitName }: { reservation: UpcomingReservation; unitName: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await confirmReservationManually(reservation.id);
      if (result.error) setError(result.error);
    });
  }

  function handleCancel() {
    const reason = prompt("Reason for cancelling (optional):") ?? "";
    setError(null);
    startTransition(async () => {
      const result = await cancelReservation(reservation.id, reason);
      if (result.error) setError(result.error);
    });
  }

  return (
    <li className="flex flex-col gap-1 rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">
            {unitName} — {reservation.customer_name ?? "Unknown"}
          </p>
          <p className="text-xs text-gray-500">
            {new Date(reservation.starts_at).toLocaleString()} · R{(reservation.price_cents / 100).toFixed(2)} ·{" "}
            <span className={reservation.payment_status === "paid" ? "text-green-700" : "text-amber-700"}>
              {reservation.payment_status}
            </span>
          </p>
          {reservation.customer_phone && (
            <a href={`tel:${reservation.customer_phone.replace(/\s+/g, "")}`} className="text-xs text-brand underline-offset-2 hover:underline">
              {reservation.customer_phone}
            </a>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span
            className={`rounded-full px-2 py-0.5 font-medium ${
              reservation.status === "confirmed" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
            }`}
          >
            {reservation.status}
          </span>
          {reservation.status === "held" && (
            <button type="button" onClick={handleConfirm} disabled={isPending} className="font-semibold text-brand hover:underline disabled:opacity-50">
              Confirm
            </button>
          )}
          <button type="button" onClick={handleCancel} disabled={isPending} className="font-semibold text-red-600 hover:underline disabled:opacity-50">
            Cancel
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </li>
  );
}
