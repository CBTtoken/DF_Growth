// Handoff 01 (docs/New Builds/growth-handoff-01-page-defects.md): the small
// derivations that decide what a member page calls things and whether it is
// honest enough to show a map. Kept in one module rather than inline in the
// components so the public page, the dashboard preview and the template
// preview can never drift into showing different headings or a different map
// for the same member.

// F/G: "General X" is a real subcategory in INDUSTRY_TAXONOMY, the catch-all
// inside each parent category ("General Beauty & Wellness" sits under
// "Beauty & Wellness"). It is fine as a filing label and terrible as public
// copy: a tattoo studio reading "General Beauty & Wellness in Hartbeespoort"
// looks like a data-entry error to a customer and to Google. Stripping the
// prefix lands on the parent category name, which is exactly what we want.
export function displayCategory(industry: string | null | undefined): string | null {
  if (!industry) return null;
  const cleaned = industry.replace(/^General\s+/i, "").trim();
  return cleaned || null;
}

// G: "Where the member has supplied a primary service or trade, use it in the
// title in preference to the assigned category." The first line of
// services_text is the member's own words for what they do, typed at
// onboarding. Only used when it reads like a trade rather than a sentence —
// a long line is a description, not a label, and belongs in the body.
const PRIMARY_SERVICE_MAX = 45;

export function primaryService(servicesText: string | null | undefined): string | null {
  const first = (servicesText ?? "")
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);
  if (!first) return null;
  if (first.length > PRIMARY_SERVICE_MAX) return null;
  // A line ending in a full stop is prose, not a service name.
  if (/[.!?]$/.test(first)) return null;
  // Members write "General " too: /mikeys-handyman's first service is
  // "General Home Repairs". Same reasoning as the category, and the brief's
  // acceptance criterion is that no page title contains "General " at all,
  // whichever field it came from. Dropping the word loses nothing.
  return first.replace(/^General\s+/i, "").trim() || null;
}

// Handoff 01 A, found while testing: /mikeys-handyman's business_description
// is a pasted Google Tag Manager snippet, not a sentence, and preferring that
// field for the meta description published it straight into Google's snippet.
// Members paste all sorts of things into a free-text intake field, so the
// description picks the first candidate that actually reads like prose rather
// than trusting field order.
const CODE_MARKERS = /[{}]|<script|@import|=>|function\s*\(|document\.|window\.|;\s*var\s/i;

export function firstProse(...candidates: (string | null | undefined)[]): string | null {
  for (const candidate of candidates) {
    const value = (candidate ?? "").trim();
    if (!value) continue;
    if (CODE_MARKERS.test(value)) continue;
    return value;
  }
  return null;
}

// F: replaces the literal "Everything you need, in one place." that appeared
// above the services section of every page ever generated.
//
// Two candidates were tried and both rejected, so this is deliberately the
// plainest possible word:
//
// 1. The member's first service line, which the brief prefers. That line is by
//    definition also the first item in the list directly underneath the
//    heading, so /nefeli-property-maintenance rendered "Carpentry" on top of a
//    list starting with "Carpentry".
// 2. The member's category. 19 of 34 active members sit under a "General "
//    category and several are plainly misfiled, so this put "Beauty &
//    Wellness" above the services of a business consultant. Dewald's call,
//    2026-07-31: a neutral heading beats a confidently wrong one.
//
// Revisit once the category taxonomy pass has cleaned up the misfiled members:
// displayCategory below is the switch, and the page title already uses the
// member's own trade, where nothing sits underneath to repeat it.
export function servicesHeading(): string {
  return "Services";
}

// G: the member page title. The root layout sets a global
// `title.template` of "%s | DigitalFlyer Growth"; a member's page is their
// shopfront, not ours, so this is returned for use with Next's `absolute`
// title, which opts out of that template. Suburb is asked for by the brief
// but growth_clients has no suburb column, only business_address free text,
// city and province, so city is as fine-grained as this can honestly go.
export function memberPageTitle({
  businessName,
  industry,
  servicesText,
  city,
}: {
  businessName: string;
  industry: string | null | undefined;
  servicesText: string | null | undefined;
  city: string | null | undefined;
}): string {
  const trade = primaryService(servicesText) ?? displayCategory(industry);
  if (trade && city) return `${businessName} | ${trade} in ${city}`;
  if (trade) return `${businessName} | ${trade}`;
  if (city) return `${businessName} | ${city}`;
  return businessName;
}

// C: address confidence.
//
// The map query used to be the street line alone, so live pages were
// embedding maps of "Pretoria", "Scheiding Street" and "Shop 28 Upperdeck",
// none of which resolve to where the member actually is. A map pointing at
// the wrong place is worse than no map, so this errs towards no map.

// Shared with lib/geo/geocode.ts's own list: things members genuinely type
// into an address field that are not places.
const NON_PHYSICAL = new Set(["online", "n/a", "na", "none", "remote", "tbc", "tba", "-", "various"]);

// A postal address is not a location. Members do use these: one live record
// reads "Postnet Suite #6  Private Bag 12", which has a street number in it
// and would otherwise pass the digit test below.
const POSTAL_MARKERS = /\b(p\.?\s?o\.?\s?box|post\s?net|postnet|private\s?bag|posbus|postal\s?(bag|box))\b/i;

// Street-type words, English and Afrikaans, since a named street with no
// number ("Scheiding Street") is still a real street and resolves correctly
// once the city and province are appended.
const STREET_WORDS =
  /\b(street|straat|road|weg|rd|avenue|laan|ave|drive|rylaan|close|crescent|singel|lane|way|boulevard|highway|park|plot|erf|unit|shop|suite|building|centre|center|mall|complex|estate)\b/i;

function normalise(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export type MapResolution =
  | { kind: "map"; query: string; displayAddress: string }
  | { kind: "area"; areaText: string }
  | { kind: "none" };

export function resolveLocation({
  businessAddress,
  city,
  province,
}: {
  businessAddress: string | null | undefined;
  city: string | null | undefined;
  province: string | null | undefined;
}): MapResolution {
  const address = (businessAddress ?? "").replace(/\s+/g, " ").trim();
  const areaParts = [city, province].map((p) => (p ?? "").trim()).filter(Boolean);
  const areaText = areaParts.join(", ");

  const hasAddress = Boolean(address) && !NON_PHYSICAL.has(normalise(address)) && !POSTAL_MARKERS.test(address);

  // The member typed their city or province into the address field. That is
  // an area, not an address: "Pretoria" and "Hartbeespoort dam" are both live
  // examples. Nothing to pin a map to.
  const addressIsJustTheArea = areaParts.some((part) => normalise(part) === normalise(address));

  // A street number, or a named street with no number. Anything else is a
  // suburb or a landmark and does not deserve a pin.
  const looksLikeStreet = /\d/.test(address) || STREET_WORDS.test(address);

  if (!hasAddress || addressIsJustTheArea || !looksLikeStreet) {
    return areaText ? { kind: "area", areaText } : { kind: "none" };
  }

  // Build the full query the brief asks for. City and province are only
  // appended when the address does not already contain them, so a member who
  // typed the full thing does not get "Cape Town" twice.
  const segments = [address];
  for (const part of areaParts) {
    if (!normalise(address).includes(normalise(part))) segments.push(part);
  }
  segments.push("South Africa");

  return { kind: "map", query: segments.join(", "), displayAddress: address };
}
