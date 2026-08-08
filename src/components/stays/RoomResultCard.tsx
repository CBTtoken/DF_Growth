"use client";

import Image from "next/image";
import { useActionState, useEffect, useState } from "react";
import { Users } from "lucide-react";
import { holdStay, type StayHoldState } from "@/app/[clientSlug]/stays-actions";
import { TurnstileWidget } from "@/components/reviews/TurnstileWidget";
import { AmenityRow } from "@/components/stays/AmenityRow";
import { readableTextOn } from "@/lib/color";
import { STAY_COPY } from "@/lib/stays/copy";
import { rand } from "@/lib/stays/money";
import type { AvailableRoom } from "@/lib/stays/types";

// One available room, and the whole of booking it.
//
// The booking form is hidden behind the button rather than printed under
// every room: three rooms with three open forms is a wall of eighteen
// inputs on a phone, and the interface standard is explicit that the
// eighty percent case is visible and the rest sits behind a tap.
//
// The rate, the total and the deposit were all computed on the server and
// are shown here for reading only. They are computed again, from the
// database, when the form is submitted. Nothing a browser sends decides
// what anybody pays.

const inputClass =
  "w-full rounded-xl border border-gray-200 px-4 py-3 text-base text-gray-900 outline-none transition placeholder:text-gray-300 focus:border-gray-400";

export function RoomResultCard({
  clientSlug,
  room,
  checkIn,
  checkOut,
  adults,
  children,
  accentColor,
  imageUrls,
  balanceDueDays,
  cancellationTerms,
  canPayOnline,
}: {
  clientSlug: string;
  room: AvailableRoom;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  accentColor: string;
  imageUrls: string[];
  balanceDueDays: number;
  cancellationTerms: string | null;
  canPayOnline: boolean;
}) {
  const [open, setOpen] = useState(false);
  const boundAction = holdStay.bind(null, clientSlug);
  const [state, action, pending] = useActionState<StayHoldState, FormData>(boundAction, null);

  // A hosted checkout lives on the gateway's own domain, so this cannot be
  // a redirect() inside the action: it has to leave the site.
  useEffect(() => {
    if (!state?.redirectTo) return;
    if (state.external) window.location.href = state.redirectTo;
    else window.location.assign(state.redirectTo);
  }, [state]);

  const { roomType } = room;

  return (
    <article className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
      <div className="grid gap-0 sm:grid-cols-[minmax(0,240px)_1fr]">
        <div className="relative aspect-4/3 bg-gray-100 sm:aspect-auto sm:min-h-full">
          {imageUrls[0] && (
            <Image
              src={imageUrls[0]}
              alt={roomType.name}
              fill
              sizes="(max-width: 640px) 100vw, 240px"
              className="object-cover"
            />
          )}
        </div>

        <div className="flex flex-col gap-3 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-gray-900">{roomType.name}</h3>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                <Users aria-hidden className="h-4 w-4" />
                Sleeps {roomType.maxAdults} {roomType.maxAdults === 1 ? "adult" : "adults"}
                {roomType.maxChildren > 0 &&
                  `, up to ${roomType.maxChildren} ${roomType.maxChildren === 1 ? "child" : "children"}`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-gray-900">{rand(room.nightlyRateCents)}</p>
              <p className="text-xs text-gray-500">{STAY_COPY.perNight}</p>
            </div>
          </div>

          {roomType.description && (
            <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600">{roomType.description}</p>
          )}

          <AmenityRow slugs={roomType.amenities} level="room" accentColor={accentColor} />

          <div className="mt-1 rounded-2xl bg-gray-50 p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-gray-600">{STAY_COPY.totalForStay}</span>
              <span className="text-lg font-bold text-gray-900">{rand(room.totalCents)}</span>
            </div>
            {room.depositCents > 0 && canPayOnline && (
              <>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-sm text-gray-600">{STAY_COPY.depositNow}</span>
                  <span className="text-sm font-semibold text-gray-900">{rand(room.depositCents)}</span>
                </div>
                <p className="mt-1.5 text-xs text-gray-500">{STAY_COPY.balanceLater(balanceDueDays)}</p>
              </>
            )}
            {room.unitsFree <= 2 && (
              <p className="mt-2 text-xs font-semibold" style={{ color: accentColor }}>
                {STAY_COPY.roomsLeft(room.unitsFree)}
              </p>
            )}
          </div>

          {!open ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-1 h-12 w-full rounded-xl text-base font-semibold shadow-sm transition hover:-translate-y-0.5 sm:w-fit sm:px-8"
              style={{ backgroundColor: accentColor, color: readableTextOn(accentColor) }}
            >
              {STAY_COPY.bookThis}
            </button>
          ) : (
            <form action={action} className="mt-1 flex flex-col gap-3 border-t border-gray-100 pt-4">
              <p className="text-sm font-semibold text-gray-900">{STAY_COPY.yourDetails}</p>

              <input type="hidden" name="roomTypeId" value={roomType.id} />
              <input type="hidden" name="checkIn" value={checkIn} />
              <input type="hidden" name="checkOut" value={checkOut} />
              <input type="hidden" name="adults" value={adults} />
              <input type="hidden" name="children" value={children} />

              <div>
                <input
                  name="guestName"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder={STAY_COPY.name}
                  className={inputClass}
                />
                {state?.error?.guestName && (
                  <p className="mt-1 text-sm text-red-600">{state.error.guestName[0]}</p>
                )}
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
                  {state?.error?.guestEmail && (
                    <p className="mt-1 text-sm text-red-600">{state.error.guestEmail[0]}</p>
                  )}
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
                  {state?.error?.guestPhone && (
                    <p className="mt-1 text-sm text-red-600">{state.error.guestPhone[0]}</p>
                  )}
                </div>
              </div>

              {cancellationTerms && (
                <details className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
                  <summary className="cursor-pointer font-semibold text-gray-900">
                    {STAY_COPY.termsHeading}
                  </summary>
                  <p className="mt-2 whitespace-pre-line">{cancellationTerms}</p>
                </details>
              )}

              {/* Both halves of the bot gate. The Server Action verifies
                  this token against Cloudflare before it does anything;
                  a widget with no server check is decoration. */}
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
                  : canPayOnline && room.depositCents > 0
                    ? `${STAY_COPY.payDeposit}, ${rand(room.depositCents)}`
                    : STAY_COPY.requestBooking}
              </button>

              {canPayOnline && room.depositCents > 0 && (
                <p className="text-center text-xs text-gray-500">{STAY_COPY.holdNotice}</p>
              )}
            </form>
          )}
        </div>
      </div>
    </article>
  );
}
