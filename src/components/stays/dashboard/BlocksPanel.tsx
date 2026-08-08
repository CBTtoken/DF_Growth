"use client";

import { useActionState } from "react";
import { addBlock, removeBlock, type ActionState } from "@/app/dashboard/stays/actions";
import { longDate } from "@/lib/stays/money";
import type { RoomType } from "@/lib/stays/types";
import type { BlockRow } from "@/components/stays/dashboard/types";

// Nights nobody may book: sold on another platform, family staying, or a
// room being painted.
//
// Blocked nights behave exactly like booked nights in search, which is the
// whole point of them and is acceptance criterion 9. Counted in nights
// rather than dates, because "the 5th to the 7th" means three nights to the
// person typing it, and that is the only reading that will not surprise
// them.

const inputClass =
  "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-base text-ink outline-none transition focus:border-gray-400";
const labelClass = "text-xs font-semibold uppercase tracking-wide text-gray-500";

export function BlocksPanel({
  blocks,
  roomTypes,
  today,
}: {
  blocks: BlockRow[];
  roomTypes: RoomType[];
  today: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(addBlock, null);
  const bookable = roomTypes.filter((room) => room.isActive);
  const nameById = new Map(roomTypes.map((room) => [room.id, room.name]));

  if (bookable.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Add a room first, under <strong>Rooms and rates</strong>, and you can block nights on it here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <form action={action} className="flex flex-col gap-3 rounded-2xl bg-gray-50 p-4">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Which room</span>
          <select name="roomTypeId" required className={inputClass}>
            {bookable.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>First night</span>
            <input name="firstNight" type="date" required min={today} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Last night</span>
            <input name="lastNight" type="date" required min={today} className={inputClass} />
            {state?.error?.lastNight && <span className="text-sm text-red-600">{state.error.lastNight[0]}</span>}
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>How many of them</span>
            <input
              name="units"
              type="number"
              min={1}
              max={100}
              defaultValue={1}
              inputMode="numeric"
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Why, for yourself</span>
            <input name="reason" type="text" maxLength={200} placeholder="Booked on another site" className={inputClass} />
          </label>
        </div>

        {state?.error?._form && <p className="text-sm text-red-600">{state.error._form[0]}</p>}

        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded-full bg-brand text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? "Blocking" : "Block these nights"}
        </button>
      </form>

      {blocks.length === 0 ? (
        <p className="text-sm text-gray-500">Nothing blocked. Every night is open for booking.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {blocks.map((block) => (
            <li
              key={block.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-100 px-3 py-2.5"
            >
              <div>
                <p className="text-sm font-semibold text-ink">{nameById.get(block.room_type_id) ?? "Room"}</p>
                <p className="text-xs text-gray-500">
                  {block.first_night === block.last_night
                    ? longDate(block.first_night)
                    : `${longDate(block.first_night)} to ${longDate(block.last_night)}`}
                  {block.units > 1 && `, ${block.units} of them`}
                  {block.reason && ` · ${block.reason}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeBlock(block.id)}
                className="text-xs font-semibold text-gray-400 underline-offset-4 hover:text-brand hover:underline"
              >
                Open them up again
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
