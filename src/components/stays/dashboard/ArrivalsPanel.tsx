"use client";

import { addDays, rand, shortDate } from "@/lib/stays/money";
import type { StayBookingRow, TourBookingRow } from "@/components/stays/dashboard/types";
import { balanceOwing } from "@/components/stays/dashboard/types";

/**
 * The question a guesthouse owner opens their phone to ask.
 *
 * Two weeks, not everything, and grouped by day rather than listed flat. A
 * fortnight is what a person can hold in their head and what fits on a
 * phone screen; the full list is one section down for anything further out.
 */
export function ArrivalsPanel({
  stayBookings,
  tourBookings,
  today,
}: {
  stayBookings: StayBookingRow[];
  tourBookings: TourBookingRow[];
  today: string;
}) {
  const horizon = addDays(today, 14);

  const events: { date: string; kind: "in" | "out" | "tour"; label: string; detail: string; owing: number }[] = [];

  for (const booking of stayBookings) {
    if (booking.status !== "confirmed") continue;
    if (booking.check_in >= today && booking.check_in <= horizon) {
      events.push({
        date: booking.check_in,
        kind: "in",
        label: booking.guest_name,
        detail: `${booking.roomName}, ${booking.nights} ${booking.nights === 1 ? "night" : "nights"}, ${booking.adults + booking.children} ${booking.adults + booking.children === 1 ? "guest" : "guests"}`,
        owing: balanceOwing(booking),
      });
    }
    if (booking.check_out >= today && booking.check_out <= horizon) {
      events.push({
        date: booking.check_out,
        kind: "out",
        label: booking.guest_name,
        detail: booking.roomName,
        owing: 0,
      });
    }
  }

  for (const booking of tourBookings) {
    if (booking.status !== "confirmed") continue;
    if (booking.departureDate >= today && booking.departureDate <= horizon) {
      events.push({
        date: booking.departureDate,
        kind: "tour",
        label: booking.guest_name,
        detail: `${booking.tourTitle}, ${booking.seats} ${booking.seats === 1 ? "seat" : "seats"}${booking.departureTime ? `, ${booking.departureTime}` : ""}`,
        owing: balanceOwing(booking),
      });
    }
  }

  events.sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind));

  if (events.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Nothing in the next two weeks. Arrivals, departures and trips will appear here as guests book.
      </p>
    );
  }

  const byDate = new Map<string, typeof events>();
  for (const event of events) {
    const list = byDate.get(event.date) ?? [];
    list.push(event);
    byDate.set(event.date, list);
  }

  return (
    <div className="flex flex-col gap-5">
      {[...byDate.entries()].map(([date, dayEvents]) => (
        <div key={date}>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
            {date === today ? "Today" : date === addDays(today, 1) ? "Tomorrow" : shortDate(date)}
          </p>
          <ul className="mt-2 flex flex-col gap-2">
            {dayEvents.map((event, index) => (
              <li
                key={`${date}-${index}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-semibold text-ink">
                    <span
                      className={`mr-2 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${
                        event.kind === "in"
                          ? "bg-green-100 text-green-800"
                          : event.kind === "out"
                            ? "bg-gray-200 text-gray-700"
                            : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {event.kind === "in" ? "Arrives" : event.kind === "out" ? "Leaves" : "Trip"}
                    </span>
                    {event.label}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">{event.detail}</p>
                </div>
                {event.owing > 0 && (
                  <span className="text-xs font-bold text-amber-700">{rand(event.owing)} owing</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
