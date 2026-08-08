"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { saveTour, unpublishTour, type ActionState } from "@/app/dashboard/stays/actions";
import { PhotoTicks } from "@/components/stays/dashboard/PhotoTicks";
import { longDate, rand, shortDate } from "@/lib/stays/money";
import type { TourWithSeats } from "@/lib/stays/types";
import type { PhotoOption, WaitlistRow } from "@/components/stays/dashboard/types";

// Trips, seats, and the people waiting for the next date.
//
// A tour is commercial, seated and paid, which is why it lives here and not
// on the Events board: Events is free, public and open to submission by
// anybody, and a paid trip with money attached must never sit on a surface
// a stranger can post to.

const inputClass =
  "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-base text-ink outline-none transition placeholder:text-gray-300 focus:border-gray-400";
const labelClass = "text-xs font-semibold uppercase tracking-wide text-gray-500";

export function ToursPanel({
  tours,
  waitlist,
  photos,
  clientSlug,
  today,
}: {
  tours: TourWithSeats[];
  waitlist: WaitlistRow[];
  photos: PhotoOption[];
  clientSlug: string;
  today: string;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const closeForm = useCallback(() => setEditing(null), []);

  const upcoming = tours.filter((tour) => tour.departureDate >= today);
  const past = tours.filter((tour) => tour.departureDate < today);

  return (
    <div className="flex flex-col gap-4">
      {upcoming.length === 0 && editing === null && (
        <p className="text-sm text-gray-500">
          No trips coming up. Add one and it gets its own page with its own photos and itinerary, which is the page
          Google finds and the link you send on WhatsApp.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {upcoming.map((tour) => (
          <li key={tour.id} className="rounded-2xl border border-gray-100 p-4">
            {editing === tour.id ? (
              <TourForm tour={tour} photos={photos} onDone={closeForm} />
            ) : (
              <TourSummary
                tour={tour}
                clientSlug={clientSlug}
                waitlist={waitlist.filter((entry) => entry.tour_id === tour.id)}
                onEdit={() => setEditing(tour.id)}
              />
            )}
          </li>
        ))}
      </ul>

      {editing === "new" ? (
        <div className="rounded-2xl border border-gray-100 p-4">
          <TourForm tour={null} photos={photos} onDone={closeForm} />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="h-12 w-full rounded-full bg-brand text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
        >
          Add a trip
        </button>
      )}

      {past.length > 0 && (
        <details className="rounded-2xl bg-gray-50 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-gray-700">
            Trips that have run ({past.length})
          </summary>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {past.map((tour) => (
              <li key={tour.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-gray-600">
                  {tour.title}, {shortDate(tour.departureDate)}
                </span>
                <span className="text-xs text-gray-400">
                  {tour.seatsTaken} of {tour.seatsTotal} seats sold
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function TourSummary({
  tour,
  clientSlug,
  waitlist,
  onEdit,
}: {
  tour: TourWithSeats;
  clientSlug: string;
  waitlist: WaitlistRow[];
  onEdit: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-ink">{tour.title}</p>
          <p className="mt-0.5 text-xs text-gray-500">
            {longDate(tour.departureDate)}
            {tour.departureTime ? `, ${tour.departureTime}` : ""}
          </p>
          <p className="mt-1 text-xs text-gray-600">
            {rand(tour.priceCents)} a person, {tour.seatsTaken} of {tour.seatsTotal} seats sold
            {tour.seatsLeft <= 0 && ", fully booked"}
          </p>
          {!tour.isPublished && (
            <p className="mt-1.5 text-xs font-semibold text-amber-700">
              Not on your page yet. Tick &quot;show this on my page&quot; when it is ready.
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-full border border-gray-200 px-4 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-gray-400"
          >
            Change
          </button>
          {tour.isPublished && clientSlug && (
            <Link
              href={`/${clientSlug}/tours/${tour.slug}`}
              target="_blank"
              className="text-xs font-semibold text-brand underline-offset-4 hover:underline"
            >
              See its page ↗
            </Link>
          )}
          {tour.isPublished && (
            <button
              type="button"
              onClick={() => unpublishTour(tour.id)}
              className="text-xs font-semibold text-gray-400 underline-offset-4 hover:text-red-600 hover:underline"
            >
              Take it off
            </button>
          )}
        </div>
      </div>

      {waitlist.length > 0 && (
        <details className="rounded-xl bg-gray-50 p-3">
          <summary className="cursor-pointer text-xs font-bold text-ink">
            {waitlist.length} {waitlist.length === 1 ? "person is" : "people are"} waiting for the next date
          </summary>
          <ul className="mt-2 flex flex-col gap-2">
            {waitlist.map((entry) => (
              <li key={entry.id} className="text-xs text-gray-600">
                <span className="font-semibold text-ink">{entry.name}</span>, {entry.people}{" "}
                {entry.people === 1 ? "person" : "people"}
                {entry.phone && (
                  <>
                    {" · "}
                    <a href={`tel:${entry.phone}`} className="text-brand underline-offset-4 hover:underline">
                      {entry.phone}
                    </a>
                  </>
                )}
                {entry.email && (
                  <>
                    {" · "}
                    <a href={`mailto:${entry.email}`} className="underline-offset-4 hover:underline">
                      {entry.email}
                    </a>
                  </>
                )}
                {entry.note && <span className="block text-gray-500">{entry.note}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function TourForm({
  tour,
  photos,
  onDone,
}: {
  tour: TourWithSeats | null;
  photos: PhotoOption[];
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveTour, null);
  const [depositKind, setDepositKind] = useState(tour?.depositKind ?? "percent");

  useEffect(() => {
    if (state?.saved) onDone();
  }, [state?.saved, onDone]);

  return (
    <form action={action} className="flex flex-col gap-4">
      {tour && <input type="hidden" name="tourId" value={tour.id} />}

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>What is it called</span>
        <input
          name="title"
          type="text"
          required
          defaultValue={tour?.title ?? ""}
          placeholder="Winelands day trip"
          className={inputClass}
        />
        {state?.error?.title && <span className="text-sm text-red-600">{state.error.title[0]}</span>}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>One line about it</span>
        <input
          name="summary"
          type="text"
          maxLength={300}
          defaultValue={tour?.summary ?? ""}
          placeholder="Three estates, lunch, and back before dark."
          className={inputClass}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Date</span>
          <input
            name="departureDate"
            type="date"
            required
            defaultValue={tour?.departureDate ?? ""}
            className={inputClass}
          />
          {state?.error?.departureDate && (
            <span className="text-sm text-red-600">{state.error.departureDate[0]}</span>
          )}
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Leaves at</span>
          <input
            name="departureTime"
            type="text"
            defaultValue={tour?.departureTime ?? ""}
            placeholder="09:00"
            className={inputClass}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Price a person, in Rand</span>
          <input
            name="price"
            type="number"
            min={0}
            step="1"
            required
            inputMode="decimal"
            defaultValue={tour ? tour.priceCents / 100 : ""}
            className={inputClass}
          />
          {state?.error?.price && <span className="text-sm text-red-600">{state.error.price[0]}</span>}
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>How many seats</span>
          <input
            name="seatsTotal"
            type="number"
            min={1}
            max={500}
            required
            inputMode="numeric"
            defaultValue={tour?.seatsTotal ?? 8}
            className={inputClass}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>How long</span>
          <input
            name="durationText"
            type="text"
            defaultValue={tour?.durationText ?? ""}
            placeholder="About 7 hours"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Where you meet</span>
          <input
            name="meetingPoint"
            type="text"
            defaultValue={tour?.meetingPoint ?? ""}
            placeholder="At the guest house"
            className={inputClass}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>What you do</span>
        <textarea name="description" rows={4} defaultValue={tour?.description ?? ""} className={inputClass} />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>The plan for the day</span>
        <textarea
          name="itinerary"
          rows={5}
          defaultValue={tour?.itinerary ?? ""}
          placeholder={"09:00 Leave\n10:30 First estate\n13:00 Lunch"}
          className={inputClass}
        />
      </label>

      <div className="flex flex-col gap-2 rounded-xl bg-gray-50 p-3">
        <span className={labelClass}>What you take up front</span>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="depositKind"
              value="percent"
              checked={depositKind === "percent"}
              onChange={() => setDepositKind("percent")}
              className="h-4 w-4"
            />
            A share of the total
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="depositKind"
              value="fixed"
              checked={depositKind === "fixed"}
              onChange={() => setDepositKind("fixed")}
              className="h-4 w-4"
            />
            A set amount
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className={depositKind === "percent" ? "flex flex-col gap-1.5" : "hidden"}>
            <span className="text-xs text-gray-500">Percent</span>
            <input
              name="depositPercent"
              type="number"
              min={0}
              max={100}
              inputMode="numeric"
              defaultValue={tour?.depositPercent ?? 50}
              className={inputClass}
            />
          </label>
          <label className={depositKind === "fixed" ? "flex flex-col gap-1.5" : "hidden"}>
            <span className="text-xs text-gray-500">Rand</span>
            <input
              name="depositFixed"
              type="number"
              min={0}
              step="1"
              inputMode="decimal"
              defaultValue={tour ? tour.depositFixedCents / 100 : 0}
              className={inputClass}
            />
          </label>
        </div>
        {depositKind === "percent" && (
          <input type="hidden" name="depositFixed" value={tour ? tour.depositFixedCents / 100 : 0} />
        )}
        {depositKind === "fixed" && <input type="hidden" name="depositPercent" value={tour?.depositPercent ?? 50} />}
      </div>

      <PhotoTicks photos={photos} selected={tour?.photoIds ?? []} />

      <label className="flex items-center gap-2 text-sm font-semibold text-ink">
        <input
          type="checkbox"
          name="isPublished"
          defaultChecked={tour?.isPublished ?? false}
          className="h-4 w-4"
        />
        Show this on my page
      </label>

      {state?.error?._form && <p className="text-sm text-red-600">{state.error._form[0]}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="h-11 flex-1 rounded-full bg-brand text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? "Saving" : "Save this trip"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="h-11 rounded-full border border-gray-200 px-6 text-sm font-semibold text-gray-600"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
