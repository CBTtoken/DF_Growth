// Plain fetch against Pexels' search API, same minimal-dependency approach
// used for Resend and Meta's Conversions API — no SDK needed for a single
// GET. Only the "Left-Heavy Split" template needs a real photo (a sticky
// media showcase with nothing else to fill it); every other new template
// is built from the client's own brand color instead of stock photography,
// so this stays a small, single-purpose helper rather than a general asset
// pipeline. Best-effort: a missing key or failed search must never break
// the page render, it just means that one template renders without its
// showcase image.
export async function getIndustryPhoto(industry: string): Promise<string | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(industry)}&orientation=portrait&per_page=1`,
      {
        headers: { Authorization: apiKey },
        // Matches the page's own revalidate window (src/app/[clientSlug]/page.tsx)
        // — a client's industry practically never changes between visits, so
        // there's no reason to re-search Pexels more often than the page
        // itself re-renders.
        next: { revalidate: 60 },
      }
    );

    if (!res.ok) return null;

    const data = (await res.json()) as { photos?: { src?: { large2x?: string; large?: string } }[] };
    const photo = data.photos?.[0]?.src;
    return photo?.large2x ?? photo?.large ?? null;
  } catch (err) {
    console.error("Pexels search failed", err);
    return null;
  }
}
