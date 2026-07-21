// Quick Sprint: Payments/Geo Sec 3.1/3.3. Business address is still a
// plain text field — confirmed live: no Google Places Autocomplete exists
// anywhere in this codebase yet, deliberately deferred as a new paid
// dependency when the Shop module's own collection address hit the same
// question (docs/GROWTH_BOOKING_SHOP_MODULES_CLAUDE.md). Real coordinates
// come from geocoding the address instead — exactly the escape hatch the
// spec itself names ("...or via a geocoding call otherwise").
//
// OpenStreetMap's Nominatim: free, no API key, no new paid infra to set
// up — matches every other "avoid a new paid dependency unless truly
// needed" call this project has made so far. Usage policy caps this at 1
// request/second and requires a descriptive User-Agent identifying the
// app, both honored here. Best-effort like every other external lookup in
// this codebase (Pexels, Meta CAPI): a failed or unmatched address just
// means that client has no stored coordinates yet, never blocks the save
// it's attached to.

// Learned from the real backfill over the live client base: "Online" is a
// genuinely common thing to type into a business-address field, and
// Nominatim happily matches it to an actual place called that — which
// would show the client as "0.3 km away" from somewhere they aren't.
// Same for digits-only entries like "9288". Treat these as "no address".
const NON_PHYSICAL_ADDRESSES = new Set(["online", "n/a", "na", "none", "remote", "tbc", "tba", "-"]);

async function queryNominatim(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=za&q=${encodeURIComponent(query)}`,
      {
        headers: {
          // Nominatim's usage policy requires a real identifying
          // User-Agent — a generic/browser-default one gets silently
          // rate-limited or blocked.
          "User-Agent": "DigitalFlyerGrowth/1.0 (info@digitalflyer.co.za)",
        },
      }
    );
    if (!res.ok) return null;

    const data = (await res.json()) as { lat: string; lon: string }[];
    const first = data[0];
    if (!first) return null;

    const lat = parseFloat(first.lat);
    const lng = parseFloat(first.lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

    return { lat, lng };
  } catch (err) {
    console.error("Geocoding failed", err);
    return null;
  }
}

// Two-tier match, shaped by what the live client base's addresses actually
// look like (full addresses, street-only, unit/complex prefixes Nominatim
// can't parse, placeholders): try the full address first, and when that
// doesn't match, fall back to the city's own coordinates. A city-centroid
// point is approximate, but for a directory's "Near me" ordering it puts
// the business in the right part of the country rather than excluding it
// from distance results entirely — the client can tighten it any time by
// cleaning up their address in the dashboard.
export async function geocodeAddress(
  address: string | null,
  city: string | null
): Promise<{ lat: number; lng: number } | null> {
  const trimmedAddress = (address ?? "").trim();
  const usableAddress =
    trimmedAddress.length > 0 &&
    !NON_PHYSICAL_ADDRESSES.has(trimmedAddress.toLowerCase()) &&
    /[a-z]/i.test(trimmedAddress)
      ? trimmedAddress
      : null;
  const usableCity = (city ?? "").trim() || null;

  if (usableAddress) {
    const full = await queryNominatim([usableAddress, usableCity, "South Africa"].filter(Boolean).join(", "));
    if (full) return full;
  }

  if (usableCity) {
    return queryNominatim(`${usableCity}, South Africa`);
  }

  return null;
}

// Postgres's `geography` type accepts EWKT text directly via its own input
// function — no RPC needed to write one from supabase-js, just supply this
// exact string as the column's value in a normal .update()/.insert().
export function toGeographyPoint(coords: { lat: number; lng: number }): string {
  return `SRID=4326;POINT(${coords.lng} ${coords.lat})`;
}
