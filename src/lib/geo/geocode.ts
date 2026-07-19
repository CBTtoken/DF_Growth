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
export async function geocodeAddress(
  address: string | null,
  city: string | null
): Promise<{ lat: number; lng: number } | null> {
  const parts = [address, city, "South Africa"].filter((p) => p && p.trim().length > 0);
  if (parts.length < 2) return null; // Just "South Africa" alone isn't a real query.

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=za&q=${encodeURIComponent(parts.join(", "))}`,
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

// Postgres's `geography` type accepts EWKT text directly via its own input
// function — no RPC needed to write one from supabase-js, just supply this
// exact string as the column's value in a normal .update()/.insert().
export function toGeographyPoint(coords: { lat: number; lng: number }): string {
  return `SRID=4326;POINT(${coords.lng} ${coords.lat})`;
}
