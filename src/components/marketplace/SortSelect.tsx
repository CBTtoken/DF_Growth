"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Quick Sprint: Payments/Geo Sec 3.4. Confirmed with Dewald: "Near me" is
// opt-in only, never the default sort — this only ever triggers the
// browser's location permission prompt when a visitor explicitly picks it,
// not on page load. Isolated into its own small client component rather
// than making the whole Marketplace filter form client-side — the existing
// search/industry/city fields stay exactly as they are (plain GET form,
// explicit Search button, see the sibling comment in page.tsx explaining
// why an auto-submitting select broke there before).
//
// Tier 1 (browser GPS) → tier 2 (Vercel's IP-geolocation headers, read
// server-side in page.tsx when no lat/lng arrive) → tier 3 (silently no-op,
// existing city filter stays untouched) — the three-tier fallback the spec
// calls for.
export function SortSelect({
  defaultSort,
  defaultLat,
  defaultLng,
}: {
  defaultSort: string;
  defaultLat: string;
  defaultLng: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [lat, setLat] = useState(defaultLat);
  const [lng, setLng] = useState(defaultLng);

  function pushWithSort(sort: string, coords?: { lat: string; lng: string }) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", sort);
    if (coords) {
      params.set("lat", coords.lat);
      params.set("lng", coords.lng);
    } else {
      params.delete("lat");
      params.delete("lng");
    }
    router.push(`/marketplace?${params.toString()}`);
  }

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;

    if (value !== "near") {
      setLat("");
      setLng("");
      setNotice(null);
      pushWithSort(value);
      return;
    }

    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      // No browser geolocation API at all — still worth sending the
      // request, the server falls back to Vercel's IP headers.
      pushWithSort("near");
      return;
    }

    setLocating(true);
    setNotice(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLat = String(position.coords.latitude);
        const newLng = String(position.coords.longitude);
        setLat(newLat);
        setLng(newLng);
        setLocating(false);
        pushWithSort("near", { lat: newLat, lng: newLng });
      },
      () => {
        // Denied or failed — fall through to the server's IP-based
        // fallback rather than blocking the sort entirely.
        setLat("");
        setLng("");
        setLocating(false);
        setNotice("Couldn't access your location — showing approximate results based on your network instead.");
        pushWithSort("near");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 }
    );
  }

  return (
    <div className="w-full">
      <select
        name="sort"
        defaultValue={defaultSort}
        onChange={handleChange}
        disabled={locating}
        className="w-full rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-60"
      >
        <option value="recent">Recently added</option>
        <option value="popular">Most visited</option>
        <option value="near">{locating ? "Finding your location…" : "Near me"}</option>
      </select>
      {/* Carries the last-resolved coordinates forward into the plain GET
          form's own submission (the Search button), so changing the text
          search or another filter afterwards doesn't silently drop "Near
          me" back to an un-located state. */}
      <input type="hidden" name="lat" value={lat} />
      <input type="hidden" name="lng" value={lng} />
      {notice && <p className="mt-1.5 text-xs text-gray-400">{notice}</p>}
    </div>
  );
}
