"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { cancelBooking, type ActionState } from "@/app/dashboard/stays/actions";
import { longDate, rand } from "@/lib/stays/money";
import type { StayBookingRow, TourBookingRow } from "@/components/stays/dashboard/types";
import { balanceOwing } from "@/components/stays/dashboard/types";

// Every booking, stays and tours together, filterable.
//
// Filters rather than more scrolling, because the interface standard says a
// list that can grow past twenty rows needs search or filtering above it,
// and a guesthouse in season passes twenty in a fortnight.

type Filter = "upcoming" | "owing" | "past" | "cancelled";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "upcoming", label: "Coming" },
  { key: "owing", label: "Money owing" },
  { key: "past", label: "Been and gone" },
  { key: "cancelled", label: "Cancelled" },
];

type Unified = {
  id: string;
  kind: "stay" | "tour";
  date: string;
  what: string;
  when: string;
  guestName: string;
  guestPhone: string | null;
  guestEmail: string | null;
  totalCents: number;
  depositCents: number;
  paymentStatus: string;
  status: string;
  owing: number;
  token: string;
  cancellationReason: string | null;
  refundGiven: boolean;
  hasInvoice: boolean;
};

export function BookingsPanel({
  stayBookings,
  tourBookings,
  clientSlug,
  today,
}: {
  stayBookings: StayBookingRow[];
  tourBookings: TourBookingRow[];
  clientSlug: string;
  today: string;
}) {
  const [filter, setFilter] = useState<Filter>("upcoming");

  const all: Unified[] = [
    ...stayBookings.map((booking) => ({
      id: booking.id,
      kind: "stay" as const,
      date: booking.check_in,
      what: booking.roomName,
      when: `${longDate(booking.check_in)} to ${longDate(booking.check_out)}`,
      guestName: booking.guest_name,
      guestPhone: booking.guest_phone,
      guestEmail: booking.guest_email,
      totalCents: booking.total_cents,
      depositCents: booking.deposit_cents,
      paymentStatus: booking.payment_status,
      status: booking.status,
      owing: balanceOwing(booking),
      token: booking.guest_token,
      cancellationReason: booking.cancellation_reason,
      refundGiven: booking.refund_given,
      hasInvoice: Boolean(booking.bizup_document_id),
    })),
    ...tourBookings.map((booking) => ({
      id: booking.id,
      kind: "tour" as const,
      date: booking.departureDate,
      what: `${booking.tourTitle}, ${booking.seats} ${booking.seats === 1 ? "seat" : "seats"}`,
      when: `${longDate(booking.departureDate)}${booking.departureTime ? `, ${booking.departureTime}` : ""}`,
      guestName: booking.guest_name,
      guestPhone: booking.guest_phone,
      guestEmail: booking.guest_email,
      totalCents: booking.total_cents,
      depositCents: booking.deposit_cents,
      paymentStatus: booking.payment_status,
      status: booking.status,
      owing: balanceOwing(booking),
      token: booking.guest_token,
      cancellationReason: booking.cancellation_reason,
      refundGiven: booking.refund_given,
      hasInvoice: Boolean(booking.bizup_document_id),
    })),
  ];

  const shown = all
    .filter((booking) => {
      if (filter === "cancelled") return booking.status === "cancelled";
      if (booking.status === "cancelled") return false;
      if (filter === "owing") return booking.owing > 0 && booking.date >= today;
      if (filter === "past") return booking.date < today;
      return booking.date >= today;
    })
    .sort((a, b) => (filter === "past" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)));

  const totalOwing = all
    .filter((booking) => booking.status !== "cancelled" && booking.date >= today)
    .reduce((sum, booking) => sum + booking.owing, 0);

  return (
    <div className="flex flex-col gap-4">
      {totalOwing > 0 && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          {rand(totalOwing)} still to come in on bookings ahead of you.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setFilter(option.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              filter === option.key
                ? "bg-ink text-white"
                : "border border-gray-200 text-gray-600 hover:border-gray-400"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-gray-500">
          {filter === "upcoming"
            ? "Nothing booked ahead yet. Bookings from your page land here the moment they are made."
            : "Nothing here."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((booking) => (
            <BookingRow key={booking.id} booking={booking} clientSlug={clientSlug} />
          ))}
        </ul>
      )}
    </div>
  );
}

function BookingRow({ booking, clientSlug }: { booking: Unified; clientSlug: string }) {
  const [cancelling, setCancelling] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(cancelBooking, null);

  const paidLabel =
    booking.paymentStatus === "paid"
      ? "Paid in full"
      : booking.paymentStatus === "deposit_paid"
        ? `Deposit paid, ${rand(booking.depositCents)}`
        : "Nothing paid yet";

  return (
    <li className="rounded-2xl border border-gray-100 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-ink">{booking.guestName}</p>
          <p className="mt-0.5 text-sm text-gray-600">{booking.what}</p>
          <p className="mt-0.5 text-xs text-gray-500">{booking.when}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-ink">{rand(booking.totalCents)}</p>
          <p className="text-xs text-gray-500">{paidLabel}</p>
          {booking.owing > 0 && booking.status !== "cancelled" && (
            <p className="text-xs font-bold text-amber-700">{rand(booking.owing)} owing</p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
        {booking.guestPhone && (
          <a href={`tel:${booking.guestPhone}`} className="font-semibold text-brand underline-offset-4 hover:underline">
            {booking.guestPhone}
          </a>
        )}
        {booking.guestEmail && (
          <a href={`mailto:${booking.guestEmail}`} className="text-gray-500 underline-offset-4 hover:underline">
            {booking.guestEmail}
          </a>
        )}
        {clientSlug && (
          <Link
            href={`/${clientSlug}/confirmation/${booking.token}`}
            target="_blank"
            className="text-gray-500 underline-offset-4 hover:underline"
          >
            What the guest sees ↗
          </Link>
        )}
        {booking.hasInvoice && (
          // The balance lives in KatisoBiz, using the part payment machinery
          // that already exists. This is the way through to it, and to the
          // reminder the member sends themselves.
          <Link href="/bizup/documents" className="text-gray-500 underline-offset-4 hover:underline">
            Invoice in KatisoBiz ↗
          </Link>
        )}
      </div>

      {booking.status === "cancelled" ? (
        <p className="mt-3 rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-600">
          Cancelled{booking.cancellationReason ? `: ${booking.cancellationReason}` : "."}{" "}
          {booking.refundGiven ? "You recorded that you refunded this." : ""}
        </p>
      ) : state?.saved ? (
        <p className="mt-3 text-xs font-semibold text-gray-600">Cancelled. Those dates are free again.</p>
      ) : cancelling ? (
        // Destructive things ask first, worded so it is clear what will be
        // lost. And the refund tick records a fact; it never moves money.
        <form action={action} className="mt-3 flex flex-col gap-2 rounded-xl bg-gray-50 p-3">
          <p className="text-xs font-semibold text-ink">
            Cancel this booking? The dates go back into your calendar straight away and the guest is not told
            automatically.
          </p>
          <input type="hidden" name="bookingId" value={booking.id} />
          <input type="hidden" name="kind" value={booking.kind} />
          <input
            name="reason"
            type="text"
            maxLength={500}
            placeholder="Why, for your own records"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input type="checkbox" name="refundGiven" className="h-4 w-4" />
            I have refunded this guest in my own Paystack
          </label>
          {state?.error?._form && <p className="text-xs text-red-600">{state.error._form[0]}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            >
              {pending ? "Cancelling" : "Yes, cancel it"}
            </button>
            <button
              type="button"
              onClick={() => setCancelling(false)}
              className="rounded-full border border-gray-200 px-4 py-1.5 text-xs font-semibold text-gray-600"
            >
              Keep it
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setCancelling(true)}
          className="mt-3 text-xs font-semibold text-gray-400 underline-offset-4 hover:text-red-600 hover:underline"
        >
          Cancel this booking
        </button>
      )}
    </li>
  );
}
