import { INDUSTRY_TAXONOMY } from "@/lib/industries";
import { slugify } from "@/lib/slugify";

// The Board browses by trade as well as by area. The trade data already
// exists and is already controlled: growth_clients.industry always holds a
// subcategory string from INDUSTRY_TAXONOMY (e.g. "Plumbing"), or the
// member's own words when they picked "Other / Not Listed".
//
// Board category pages are at the parent-category level ("Skilled Trades &
// Repairs"), the same level the marketplace filter uses, so the two never
// disagree about what a category means. Subcategory stays visible as the
// label on each card, which is where the useful specificity is.
//
// A free-text industry has no parent category, so it gets no category page.
// The post still appears on the board and on its area page. Generating a
// page for every spelling a member ever typed would be the classic
// thin-content mistake, and Google treats it as one.

export type BoardCategory = { slug: string; name: string; subcategories: string[] };

export const BOARD_CATEGORIES: BoardCategory[] = INDUSTRY_TAXONOMY.map((category) => ({
  slug: slugify(category.name),
  name: category.name,
  subcategories: category.subcategories,
}));

export function categoryFromSlug(slug: string): BoardCategory | null {
  return BOARD_CATEGORIES.find((c) => c.slug === slug) ?? null;
}

/** The parent category for a stored industry value, or null when it is free text. */
export function categoryForIndustry(industry: string | null): BoardCategory | null {
  if (!industry) return null;
  return BOARD_CATEGORIES.find((c) => c.subcategories.includes(industry)) ?? null;
}
