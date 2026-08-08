"use client";

import { useActionState, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  holdTourSeats,
  joinTourWaitlist,
  type StayHoldState,
  type WaitlistState,
} from "@/app/[clientSlug]/stays-actions";
import { TurnstileWidget } from "@/components/reviews/TurnstileWidget";
import { readableTextOn } from "@/lib/color";
import { STAY_COPY, TOUR_COPY } from "@/lib/stays/copy";
import { rand } from "@/lib/stays/money";

const inputClass =
  "w-full rounded-xl border border-gray-200 px-4 py-3 text-base text-gray-900 outline-none transition placeholder:text-gray-300 focus:border-gray-400";

/**
 * Booking a seat, or asking about the next date.
 *
 * One component covering both, because from the visitor's point of view
 * they are the same moment answered two ways: the trip has room, or it has
 * not. Handoff Job 6 is explicit that a full tour collects names rather
 * than showing a dead end.
 */
export function TourBookingForm({
  clientSlug,
  tourSlug,
  tourId,
  seatsLeft,
  priceCents,
  depositCents,
  accentColor,
  canPayOnline,
  cancellationTerms,
}: {
  clientSlug: string;
  tourSlug: string;
  tourId: string;
  seatsLeft: number;
  priceCents: number;
  depositCents: number;
  accentColor: string;
  canPayOnline: boolean;
  cancellationTerms: string | null;
}) {
  const bound = holdTourSeats.bind(null, clientSlug, tourSlug);
  const [state, action, pending] = useActionState<StayHoldState, FormData>(bound, null);

  useEffect(() => {
    if (!state?.redirectTo) return;
    if (state.external) window.location.href = state.redirectTo;
    else window.location.assign(state.redirectTo);
  }, [state]);

  if (seatsLeft <= 0) {
    return <WaitlistForm clientSlug={clientSlug} tourId={tourId} accentColor={accentColor} />;
  }

  return (
    <form action={action} className="flex flex-col gap-3 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-baseline justify-between">
        <p className="text-lg font-bold text-gray-900">
          {rand(priceCents)} <span className="text-sm font-normal text-gray-500">{TOUR_COPY.perPerson}</span>
        </p>
        <p className="text-xs font-semibold text-gray-600">{TOUR_COPY.seatsLeft(seatsLeft)}</p>
      </div>

      <input type="hidden" name="tourId" value={tourId} />

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{TOUR_COPY.seats}</span>
        <input
          name="seats"
          type="number"
          min={1}
          max={Math.min(seatsLeft, 50)}
          defaultValue={1}
          inputMode="numeric"
          required
          className={inputClass}
        />
        {state?.error?.seats && <span className="text-sm text-red-600">{state.error.seats[0]}</span>}
      </label>

      <div>
        <input name="guestName" type="text" required autoComplete="name" placeholder={STAY_COPY.name} className={inputClass} />
        {state?.error?.guestName && <p className="mt-1 text-sm text-red-600">{state.error.guestName[0]}</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <input
            name="guestEmail"
            type="email"
            required
            inputMode="email"
            autoComplete="email"
            placeholder={STAY_COPY.email}
            className={inputClass}
          />
          {state?.error?.guestEmail && <p className="mt-1 text-sm text-red-600">{state.error.guestEmail[0]}</p>}
        </div>
        <div>
          <input
            name="guestPhone"
            type="tel"
            required
            inputMode="tel"
            autoComplete="tel"
            placeholder={STAY_COPY.phone}
            className={inputClass}
          />
          {state?.error?.guestPhone && <p className="mt-1 text-sm text-red-600">{state.error.guestPhone[0]}</p>}
        </div>
      </div>

      {cancellationTerms && (
        <details className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
          <summary className="cursor-pointer font-semibold text-gray-900">{STAY_COPY.termsHeading}</summary>
          <p className="mt-2 whitespace-pre-line">{cancellationTerms}</p>
        </details>
      )}

      <TurnstileWidget />

      {state?.error?._form && <p className="text-sm text-red-600">{state.error._form[0]}</p>}

      <button
        type="submit"
        disabled={pending}
        className="h-12 w-full rounded-xl text-base font-semibold shadow-sm transition hover:-translate-y-0.5 disabled:opacity-60"
        style={{ backgroundColor: accentColor, color: readableTextOn(accentColor) }}
      >
        {pending
          ? "Just a moment"
          : canPayOnline && depositCents > 0
            ? `${STAY_COPY.payDeposit}, ${rand(depositCents)} each`
            : TOUR_COPY.bookSeats}
      </button>

      {canPayOnline && depositCents > 0 && (
        <p className="text-center text-xs text-gray-500">{STAY_COPY.holdNotice}</p>
      )}
    </form>
  );
}

export function WaitlistForm({
  clientSlug,
  tourId,
  accentColor,
}: {
  clientSlug: string;
  tourId: string;
  accentColor: string;
}) {
  const bound = joinTourWaitlist.bind(null, clientSlug);
  const [state, action, pending] = useActionState<WaitlistState, FormData>(bound, null);

  if (state?.sent) {
    return (
      <div className="rounded-3xl border border-gray-100 bg-white p-6 text-center shadow-sm">
        <CheckCircle2 aria-hidden className="mx-auto mb-3 h-10 w-10 text-green-600" />
        <p className="text-base font-semibold text-gray-900">{TOUR_COPY.waitlistSent}</p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-lg font-bold text-gray-900">{TOUR_COPY.fullyBooked}</p>
      <p className="text-sm leading-relaxed text-gray-600">{TOUR_COPY.fullyBookedBody}</p>

      <input type="hidden" name="tourId" value={tourId} />

      <input name="name" type="text" required autoComplete="name" placeholder={STAY_COPY.name} className={inputClass} />
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={`${STAY_COPY.email} (optional)`}
          className={inputClass}
        />
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder={`${STAY_COPY.phone} (optional)`}
          className={inputClass}
        />
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{TOUR_COPY.people}</span>
        <input name="people" type="number" min={1} max={50} defaultValue={2} inputMode="numeric" className={inputClass} />
      </label>

      <TurnstileWidget />

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="h-12 w-full rounded-xl text-base font-semibold shadow-sm transition hover:-translate-y-0.5 disabled:opacity-60"
        style={{ backgroundColor: accentColor, color: readableTextOn(accentColor) }}
      >
        {pending ? "Just a moment" : TOUR_COPY.waitlistButton}
      </button>
    </form>
  );
}
