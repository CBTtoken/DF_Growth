import { createAdminClient } from "@/lib/supabase/admin";

// The media library: curated, tagged ambient images in the `media-library`
// bucket, catalogued in `media_library_images`. Replaces the raw
// Pexels-by-keyword fallback (src/lib/images/pexels.ts), which once gave a
// butler service a photo of a child — a wrong image is worse than none, so
// when nothing in the library matches the industry this returns null and
// the page simply renders without a showcase image. There is deliberately
// no generic catch-all image and no keyword search of an external service.
//
// Every image in the catalogue was individually reviewed against its
// description before landing in the bucket (house rule: ambient and
// decorative only, never posing as the member's own work).

// Industry strings are free-ish text picked at onboarding ("General
// Construction & Small Renovation", "Plumbing", ...). Each entry maps a
// lowercase keyword found in that string to the library tags it may draw
// from. Only genuine matches — no entry, no image.
const KEYWORD_TAGS: Record<string, string[]> = {
  plumbing: ["plumbing"],
  plumber: ["plumbing"],
  construction: ["construction", "handyman", "renovation"],
  renovation: ["renovation", "handyman", "painting"],
  handyman: ["handyman"],
  painting: ["painting"],
  roofing: ["roofing", "waterproofing"],
  carpentry: ["carpentry", "woodwork"],
  wood: ["carpentry", "woodwork"],
  cleaning: ["cleaning", "housekeeping"],
  housekeeping: ["cleaning", "housekeeping"],
  garden: ["garden", "landscaping"],
  landscaping: ["garden", "landscaping"],
  property: ["cleaning", "garden", "handyman"],
  maintenance: ["handyman", "renovation"],
  farming: ["farming", "agriculture", "animal-feed"],
  agriculture: ["farming", "agriculture", "animal-feed"],
  agri: ["farming", "agriculture", "animal-feed"],
  hospitality: ["hospitality", "catering", "guesthouse"],
  catering: ["catering", "hospitality"],
  guesthouse: ["guesthouse", "hospitality"],
  tattoo: ["tattoo", "studio"],
  gold: ["gold", "jewellery", "precious-metals"],
  jewellery: ["jewellery", "gold"],
  jewelry: ["jewellery", "gold"],
  metals: ["precious-metals", "gold"],
  aluminium: ["aluminium", "glass", "windows"],
  glass: ["glass", "aluminium"],
  windows: ["windows", "aluminium", "glass"],
};

function tagsForIndustry(industry: string): string[] {
  const haystack = industry.toLowerCase();
  const tags = new Set<string>();
  for (const [keyword, mapped] of Object.entries(KEYWORD_TAGS)) {
    if (haystack.includes(keyword)) mapped.forEach((t) => tags.add(t));
  }
  return [...tags];
}

export async function getLibraryPhoto(
  industry: string | null | undefined,
  orientation?: "landscape" | "portrait"
): Promise<string | null> {
  if (!industry) return null;
  const tags = tagsForIndustry(industry);
  if (tags.length === 0) return null;

  try {
    const admin = createAdminClient();
    let query = admin
      .from("media_library_images")
      .select("storage_path, orientation")
      .overlaps("trade_tags", tags);
    if (orientation) query = query.eq("orientation", orientation);
    const { data } = await query;
    let rows = data ?? [];
    // An orientation preference is a preference, not a hard filter — a
    // matching image in the other orientation still beats no image.
    if (rows.length === 0 && orientation) {
      const { data: any } = await admin
        .from("media_library_images")
        .select("storage_path, orientation")
        .overlaps("trade_tags", tags);
      rows = any ?? [];
    }
    if (rows.length === 0) return null;
    const pick = rows[Math.floor(Math.random() * rows.length)];
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media-library/${pick.storage_path}`;
  } catch (err) {
    console.error("Media library lookup failed", err);
    return null;
  }
}
