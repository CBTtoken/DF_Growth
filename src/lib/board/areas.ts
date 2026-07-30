import { slugify } from "@/lib/slugify";

// The Board, Phase 1, handoff section 4: "Area identity, not just an area
// filter. A member belongs to an area and the board presents it as a place,
// with a name and a page of its own."
//
// Area is growth_clients.city, which is the decision taken on 30 July after
// a live data check: there is no suburb column anywhere in this database,
// and city is filled for 22 of the 34 active members. Using what already
// exists means area pages have content on day one, and the member can move
// himself by editing his city in the dashboard, which is one source of
// truth rather than two fields that disagree.
//
// The area list is NOT the static CITIES array. Cities are a curated
// dropdown with a free-text escape hatch (lib/cities.ts), and members have
// used it: Hartbeespoort is in the live data and is not in the list. So the
// set of real areas is whatever the listable members actually say, read
// back from the database. That also means an area page only exists when
// somebody is in it, which is the empty-state problem solved by not
// creating the page at all.

/** "Gqeberha (Port Elizabeth)" becomes "gqeberha-port-elizabeth". */
export function areaSlug(city: string): string {
  return slugify(city);
}

/**
 * Turns the distinct city values of listable members into area records.
 *
 * Two members typing "Cape Town" and "cape town" would otherwise be two
 * areas at the same URL, so entries are grouped by slug and the first
 * spelling wins as the display name.
 */
export function buildAreas(cities: (string | null)[]): { slug: string; name: string; count: number }[] {
  const bySlug = new Map<string, { slug: string; name: string; count: number }>();

  for (const city of cities) {
    const name = (city ?? "").trim();
    if (!name) continue;
    const slug = areaSlug(name);
    if (!slug) continue;

    const existing = bySlug.get(slug);
    if (existing) existing.count += 1;
    else bySlug.set(slug, { slug, name, count: 1 });
  }

  return [...bySlug.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/**
 * Copy for an area page.
 *
 * "Businesses in Boksburg" rather than a filter label, because the handoff
 * asks the page to read as a place. Not templated any further than this:
 * the Afrikaans belonging of "Ek's van die Ooste" comes from members being
 * there, not from the platform inventing a nickname for a town.
 */
export function areaHeading(name: string): string {
  return `Businesses in ${name}`;
}
