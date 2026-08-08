"use client";

import Image from "next/image";
import type { PhotoOption } from "@/components/stays/dashboard/types";

/**
 * Which of the member's own photos belong to this room or this trip.
 *
 * Reads from the one photo library they already manage under Your page,
 * rather than adding a second upload path. Two upload paths is two places
 * a photo can live, and the day they disagree is the day a member deletes
 * a picture and it stays on their page.
 */
export function PhotoTicks({ photos, selected }: { photos: PhotoOption[]; selected: string[] }) {
  const chosen = new Set(selected);

  if (photos.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No photos yet. Add them under <strong>Your page</strong>, then come back and tick which ones belong here.
      </p>
    );
  }

  return (
    <fieldset>
      <legend className="text-xs font-semibold uppercase tracking-wide text-gray-500">Photos</legend>
      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
        {photos.map((photo) => (
          <label key={photo.id} className="relative block cursor-pointer">
            <input
              type="checkbox"
              name="photoIds"
              value={photo.id}
              defaultChecked={chosen.has(photo.id)}
              className="peer sr-only"
            />
            <span className="relative block aspect-square overflow-hidden rounded-xl border-2 border-transparent bg-gray-100 peer-checked:border-brand">
              <Image src={photo.url} alt="" fill sizes="120px" className="object-cover" />
            </span>
            <span className="absolute right-1.5 top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white peer-checked:flex">
              ✓
            </span>
          </label>
        ))}
      </div>
      <p className="mt-2 text-xs text-gray-500">The first one you tick is the picture guests see first.</p>
    </fieldset>
  );
}
