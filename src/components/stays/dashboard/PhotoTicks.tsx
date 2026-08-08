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
      {/* Truthfully worded. This used to say "the first one you tick",
          which is wrong: a form returns its checkboxes in the order they
          are drawn, not the order somebody clicked them, so ticking the
          fourth photo and then the first still makes the first the main
          picture. Telling a member their clicks are remembered in order,
          when they are not, is exactly the kind of small lie that makes
          somebody stop trusting a screen. */}
      <p className="mt-2 text-xs text-gray-500">
        The main picture is whichever ticked photo comes first here, reading left to right. Reorder them under
        Your page if you want a different one.
      </p>
    </fieldset>
  );
}
