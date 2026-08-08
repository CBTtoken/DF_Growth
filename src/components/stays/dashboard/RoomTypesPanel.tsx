"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { restoreRoomType, retireRoomType, saveRoomType, type ActionState } from "@/app/dashboard/stays/actions";
import { AmenityTicks } from "@/components/stays/dashboard/AmenityTicks";
import { PhotoTicks } from "@/components/stays/dashboard/PhotoTicks";
import { labelAmenities } from "@/lib/stays/amenities";
import { depositCents, rand } from "@/lib/stays/money";
import type { RoomType } from "@/lib/stays/types";
import type { PhotoOption } from "@/components/stays/dashboard/types";

// Room TYPES, not rooms.
//
// The single most important idea in this module, and the one a member has
// to understand in one sentence: four Standard Doubles is one room here
// with "how many" set to four, not four entries. The wording below is doing
// that teaching, which is why "How many of these do you have" is a full
// question rather than a "Quantity" label.
//
// Which physical room a guest gets stays where it has always been, which is
// in the member's head on the day. There is nothing to assign here and
// nothing to move.

const inputClass =
  "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-base text-ink outline-none transition placeholder:text-gray-300 focus:border-gray-400";
const labelClass = "text-xs font-semibold uppercase tracking-wide text-gray-500";

export function RoomTypesPanel({
  roomTypes,
  photos,
  hasGateway,
}: {
  roomTypes: RoomType[];
  photos: PhotoOption[];
  hasGateway: boolean;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const closeForm = useCallback(() => setEditing(null), []);

  const active = roomTypes.filter((room) => room.isActive);
  const retired = roomTypes.filter((room) => !room.isActive);

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
        Add one room for each <strong>kind</strong> of room you have, not one for each door. Four rooms that are all
        the same is one entry here with four as the number you have.
      </p>

      {active.length === 0 && (
        <p className="text-sm text-gray-500">
          No rooms yet. Add your first one below and give it a price per night, and guests can start booking it.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {active.map((room) => (
          <li key={room.id} className="rounded-2xl border border-gray-100 p-4">
            {editing === room.id ? (
              <RoomForm room={room} photos={photos} hasGateway={hasGateway} onDone={closeForm} />
            ) : (
              <RoomSummary room={room} onEdit={() => setEditing(room.id)} />
            )}
          </li>
        ))}
      </ul>

      {editing === "new" ? (
        <div className="rounded-2xl border border-gray-100 p-4">
          <RoomForm room={null} photos={photos} hasGateway={hasGateway} onDone={closeForm} />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="h-12 w-full rounded-full bg-brand text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
        >
          Add a room
        </button>
      )}

      {retired.length > 0 && (
        <details className="rounded-2xl bg-gray-50 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-gray-700">
            Rooms you have taken off ({retired.length})
          </summary>
          <ul className="mt-3 flex flex-col gap-2">
            {retired.map((room) => (
              <li key={room.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-gray-600">{room.name}</span>
                <button
                  type="button"
                  onClick={() => restoreRoomType(room.id)}
                  className="text-xs font-semibold text-brand underline-offset-4 hover:underline"
                >
                  Put it back
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function RoomSummary({ room, onEdit }: { room: RoomType; onEdit: () => void }) {
  const amenities = labelAmenities(room.amenities, "room");
  const deposit =
    room.rateCents === null
      ? null
      : depositCents(room.rateCents, room.depositKind, room.depositPercent, room.depositFixedCents);

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-sm font-bold text-ink">{room.name}</p>
        <p className="mt-0.5 text-xs text-gray-500">
          {room.unitsCount} {room.unitsCount === 1 ? "of these" : "of these"}, sleeps {room.maxAdults}{" "}
          {room.maxAdults === 1 ? "adult" : "adults"}
          {room.maxChildren > 0 && ` and ${room.maxChildren} ${room.maxChildren === 1 ? "child" : "children"}`}
        </p>
        {amenities.length > 0 && (
          <p className="mt-1 text-xs text-gray-400">{amenities.map((a) => a.label).join(" · ")}</p>
        )}
        {room.rateCents === null ? (
          // The empty state that matters most: a room with no price is
          // invisible to guests, and the member has to know that.
          <p className="mt-1.5 text-xs font-semibold text-amber-700">
            No price yet, so guests cannot book it. Add a rate per night.
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-gray-600">
            {rand(room.rateCents)} a night
            {deposit ? `, ${rand(deposit)} deposit on one night` : ""}
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
        <button
          type="button"
          onClick={() => retireRoomType(room.id)}
          className="text-xs font-semibold text-gray-400 underline-offset-4 hover:text-red-600 hover:underline"
        >
          Take it off
        </button>
      </div>
    </div>
  );
}

function RoomForm({
  room,
  photos,
  hasGateway,
  onDone,
}: {
  room: RoomType | null;
  photos: PhotoOption[];
  hasGateway: boolean;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveRoomType, null);
  const [depositKind, setDepositKind] = useState(room?.depositKind ?? "percent");

  // Closing the form is a parent state change, so it has to happen after
  // the render that reported success rather than during it.
  useEffect(() => {
    if (state?.saved) onDone();
  }, [state?.saved, onDone]);

  return (
    <form action={action} className="flex flex-col gap-4">
      {room && <input type="hidden" name="roomTypeId" value={room.id} />}

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>What do you call it</span>
        <input
          name="name"
          type="text"
          required
          defaultValue={room?.name ?? ""}
          placeholder="Standard double"
          className={inputClass}
        />
        {state?.error?.name && <span className="text-sm text-red-600">{state.error.name[0]}</span>}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Describe it for a guest</span>
        <textarea
          name="description"
          rows={3}
          defaultValue={room?.description ?? ""}
          placeholder="A quiet room at the back with its own entrance and a view over the garden."
          className={inputClass}
        />
      </label>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>How many do you have</span>
          <input
            name="unitsCount"
            type="number"
            min={1}
            max={100}
            required
            inputMode="numeric"
            defaultValue={room?.unitsCount ?? 1}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Most adults</span>
          <input
            name="maxAdults"
            type="number"
            min={1}
            max={20}
            required
            inputMode="numeric"
            defaultValue={room?.maxAdults ?? 2}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Most children</span>
          <input
            name="maxChildren"
            type="number"
            min={0}
            max={20}
            inputMode="numeric"
            defaultValue={room?.maxChildren ?? 0}
            className={inputClass}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Price per night, in Rand</span>
        <input
          name="rate"
          type="number"
          min={0}
          step="1"
          inputMode="decimal"
          defaultValue={room?.rateCents !== null && room?.rateCents !== undefined ? room.rateCents / 100 : ""}
          placeholder="950"
          className={inputClass}
        />
        <span className="text-xs text-gray-500">
          One price a night for this room, whatever the season. Leave it empty until you have decided, and guests
          will not see this room at all.
        </span>
        {state?.error?.rate && <span className="text-sm text-red-600">{state.error.rate[0]}</span>}
      </label>

      {hasGateway && (
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
                defaultValue={room?.depositPercent ?? 50}
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
                defaultValue={room ? room.depositFixedCents / 100 : 0}
                className={inputClass}
              />
              {state?.error?.depositFixed && (
                <span className="text-sm text-red-600">{state.error.depositFixed[0]}</span>
              )}
            </label>
          </div>
          <p className="text-xs text-gray-500">
            The deposit goes straight into your own account. The rest becomes a balance owing that you collect
            yourself.
          </p>
          {/* Both fields are always submitted so the unused one keeps its
              stored value. A hidden input rather than an unmounted field:
              unmounting drops it from the form and would silently reset it
              to zero every time the member picked the other option. */}
          {depositKind === "percent" && (
            <input type="hidden" name="depositFixed" value={room ? room.depositFixedCents / 100 : 0} />
          )}
          {depositKind === "fixed" && (
            <input type="hidden" name="depositPercent" value={room?.depositPercent ?? 50} />
          )}
        </div>
      )}

      {!hasGateway && (
        <>
          <input type="hidden" name="depositKind" value="percent" />
          <input type="hidden" name="depositPercent" value={room?.depositPercent ?? 50} />
          <input type="hidden" name="depositFixed" value={room ? room.depositFixedCents / 100 : 0} />
        </>
      )}

      <AmenityTicks level="room" selected={room?.amenities ?? []} />
      <PhotoTicks photos={photos} selected={room?.photoIds ?? []} />

      {state?.error?._form && <p className="text-sm text-red-600">{state.error._form[0]}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="h-11 flex-1 rounded-full bg-brand text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? "Saving" : "Save this room"}
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
