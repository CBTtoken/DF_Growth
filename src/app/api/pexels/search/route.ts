import { NextResponse } from "next/server";
import { requireGrowthClientId } from "@/lib/auth/require-growth-client";

// Combined spec Sec 24: browsing/search UI for PexelsPicker.tsx — separate
// from lib/images/pexels.ts's getIndustryPhoto (a single best-effort
// fallback result used server-side when rendering a page). This one
// returns a real result set for a client to actually choose from, so it
// needs its own thin proxy route: the Pexels API key lives server-side
// only, the browser can't call Pexels directly. Auth-gated (not just
// public) so it isn't usable as a free, unmetered Pexels proxy by anyone
// who finds the URL.
export async function GET(request: Request) {
  const client = await requireGrowthClientId();
  if (client.error) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  if (!query) {
    return NextResponse.json({ error: "Missing search query" }, { status: 400 });
  }

  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Photo search is not available right now" }, { status: 503 });
  }

  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=15`,
    { headers: { Authorization: apiKey } }
  );

  if (!res.ok) {
    return NextResponse.json({ error: "Search failed, please try again" }, { status: 502 });
  }

  const data = (await res.json()) as {
    photos?: { id: number; src?: { medium?: string; large2x?: string; large?: string }; photographer?: string }[];
  };

  const results = (data.photos ?? [])
    .filter((p) => p.src?.medium && (p.src?.large2x || p.src?.large))
    .map((p) => ({
      id: p.id,
      thumbnailUrl: p.src!.medium!,
      fullUrl: (p.src!.large2x ?? p.src!.large)!,
      photographer: p.photographer ?? null,
    }));

  return NextResponse.json({ results });
}
