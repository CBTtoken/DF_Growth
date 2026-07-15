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
// Same fix as src/app/api/checkout/finish/route.ts — this route's only auth
// check reads the session via requireGrowthClientId(), which calls cookies()
// indirectly through @supabase/ssr, not detected reliably by Next's automatic
// dynamic-rendering detection for Route Handlers. force-dynamic removes the
// ambiguity rather than risk this route serving a stale "not authorized" (or
// worse, a stale authorized) response.
export const dynamic = "force-dynamic";

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
  // Public Beta Polish Sprint Sec 8: "Show More" pages through additional
  // Pexels results instead of the gallery being capped at the first 15.
  const pageParam = Number(searchParams.get("page") ?? "1");
  const page = Number.isFinite(pageParam) && pageParam >= 1 ? Math.floor(pageParam) : 1;

  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Photo search is not available right now" }, { status: 503 });
  }

  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=15&page=${page}`,
    { headers: { Authorization: apiKey } }
  );

  if (!res.ok) {
    return NextResponse.json({ error: "Search failed, please try again" }, { status: 502 });
  }

  const data = (await res.json()) as {
    photos?: { id: number; src?: { medium?: string; large2x?: string; large?: string }; photographer?: string }[];
    next_page?: string;
  };

  const results = (data.photos ?? [])
    .filter((p) => p.src?.medium && (p.src?.large2x || p.src?.large))
    .map((p) => ({
      id: p.id,
      thumbnailUrl: p.src!.medium!,
      fullUrl: (p.src!.large2x ?? p.src!.large)!,
      photographer: p.photographer ?? null,
    }));

  return NextResponse.json({ results, hasMore: Boolean(data.next_page) });
}
