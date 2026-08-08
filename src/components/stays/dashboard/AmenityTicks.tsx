"use client";

import { PROPERTY_AMENITIES, ROOM_AMENITIES } from "@/lib/stays/amenities";

/**
 * Tick boxes, which is what the handoff asked for and what a person can
 * actually fill in on a phone.
 *
 * Not a multi-select, not a tag input, not free text. Free text is what
 * produces "Wi-Fi", "wifi" and "Free Wifi" as three amenities, and it is
 * the reason these are stored as slugs at all.
 */
export function AmenityTicks({
  level,
  selected,
  name = "amenities",
}: {
  level: "property" | "room";
  selected: string[];
  name?: string;
}) {
  const options = level === "property" ? PROPERTY_AMENITIES : ROOM_AMENITIES;
  const chosen = new Set(selected);

  return (
    <fieldset>
      <legend className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {level === "property" ? "What the place has" : "What this room has"}
      </legend>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        {options.map((amenity) => (
          <label key={amenity.slug} className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              name={name}
              value={amenity.slug}
              defaultChecked={chosen.has(amenity.slug)}
              className="h-4 w-4 shrink-0"
            />
            {amenity.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
