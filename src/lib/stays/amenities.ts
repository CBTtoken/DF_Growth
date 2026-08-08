// The amenity lists, in one place.
//
// Handoff Job 5: two levels, both managed by the member as tick boxes, both
// shown as icons. Stored as structured slugs rather than free text even
// though phase 1 only displays them, because they become marketplace
// filters later and the data has to exist first. Free text would give us
// "Wi-Fi", "wifi", "Free Wifi" and "WIFI" as four different amenities and
// no filter could ever be built on top of it.
//
// Deliberately in application code rather than a check constraint or a
// lookup table: this list grows every time a new kind of property joins,
// and a constraint would turn each addition into a migration.
//
// The starting lists are the ones Dewald was asked to approve or extend in
// the sprint report. Adding to either is one line here.

export type Amenity = { slug: string; label: string };

/** Things a whole property has. */
export const PROPERTY_AMENITIES: Amenity[] = [
  { slug: "wifi", label: "Free WiFi" },
  { slug: "parking", label: "Free parking" },
  { slug: "secure_parking", label: "Secure parking" },
  { slug: "breakfast", label: "Breakfast" },
  { slug: "pool", label: "Swimming pool" },
  { slug: "garden", label: "Garden" },
  { slug: "braai", label: "Braai area" },
  { slug: "shared_kitchen", label: "Guest kitchen" },
  { slug: "shared_lounge", label: "Guest lounge" },
  { slug: "outdoor_dining", label: "Outdoor dining" },
  { slug: "laundry", label: "Laundry" },
  { slug: "pet_friendly", label: "Pet friendly" },
  { slug: "family_friendly", label: "Family friendly" },
  { slug: "non_smoking", label: "Non smoking" },
  { slug: "wheelchair_access", label: "Wheelchair access" },
  { slug: "airport_shuttle", label: "Airport shuttle" },
  { slug: "backup_power", label: "Backup power" },
  { slug: "self_check_in", label: "Self check in" },
];

/** Things one room type has. */
export const ROOM_AMENITIES: Amenity[] = [
  { slug: "ensuite", label: "En-suite bathroom" },
  { slug: "shared_bathroom", label: "Shared bathroom" },
  { slug: "bath", label: "Bath" },
  { slug: "shower", label: "Shower" },
  { slug: "aircon", label: "Air conditioning" },
  { slug: "fan", label: "Fan" },
  { slug: "heater", label: "Heater" },
  { slug: "kitchenette", label: "Kitchenette" },
  { slug: "fridge", label: "Fridge" },
  { slug: "tea_coffee", label: "Tea and coffee" },
  { slug: "tv", label: "TV" },
  { slug: "desk", label: "Desk" },
  { slug: "safe", label: "Safe" },
  { slug: "private_entrance", label: "Private entrance" },
  { slug: "patio", label: "Patio or balcony" },
  { slug: "sleeper_couch", label: "Sleeper couch" },
];

const PROPERTY_BY_SLUG = new Map(PROPERTY_AMENITIES.map((a) => [a.slug, a]));
const ROOM_BY_SLUG = new Map(ROOM_AMENITIES.map((a) => [a.slug, a]));

/**
 * Slugs turned back into labels, in the order this file lists them rather
 * than the order they were stored. A member ticking boxes in a random order
 * should not produce a differently ordered row of icons on their page.
 *
 * A slug that is no longer in the list above is dropped rather than shown
 * raw. Renaming or retiring one must never print `pet_frendly` at a guest.
 */
export function labelAmenities(slugs: string[] | null | undefined, level: "property" | "room"): Amenity[] {
  const source = level === "property" ? PROPERTY_AMENITIES : ROOM_AMENITIES;
  const lookup = level === "property" ? PROPERTY_BY_SLUG : ROOM_BY_SLUG;
  const chosen = new Set((slugs ?? []).filter((slug) => lookup.has(slug)));
  return source.filter((a) => chosen.has(a.slug));
}

/** Keeps a submitted list to slugs this file actually knows. */
export function cleanAmenities(slugs: string[], level: "property" | "room"): string[] {
  const lookup = level === "property" ? PROPERTY_BY_SLUG : ROOM_BY_SLUG;
  return slugs.filter((slug) => lookup.has(slug));
}
