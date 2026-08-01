import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export const EDITION_BUCKET = "moxie-editions";

export type EditionPage = {
  page: number;
  key: string;
  width: number;
  height: number;
  text: string;
};

type EditionFixture = { slug: string; pageCount: number; pages: EditionPage[] };

// June and July were produced in Adobe Express and exist only as finished
// PDFs, so their pages and text were extracted once and committed rather
// than being read from the database on every request. Two legacy editions
// are a fixture, not a content model: August onward comes out of Kwaai
// Press with real structured articles and never touches this file.
const FIXTURES: Record<string, () => Promise<EditionFixture>> = {
  "june-2026": () => import("./editions/june-2026.json").then((m) => m.default as EditionFixture),
  "july-2026": () => import("./editions/july-2026.json").then((m) => m.default as EditionFixture),
};

export async function getEditionPages(slug: string): Promise<EditionPage[]> {
  const load = FIXTURES[slug];
  if (!load) return [];
  return (await load()).pages;
}

/**
 * Short-lived signed URLs for an edition's page images.
 *
 * The bucket is private, so this is the only way a page is readable, and it
 * is called only after canRead has passed. A public bucket would have made
 * the entitlement check decorative: anyone with a URL could read a paid
 * edition and never touch the application at all.
 *
 * One hour covers a reading session comfortably and expires long before a
 * copied link is worth anything.
 */
export async function signEditionPages(
  pages: EditionPage[],
  expiresInSeconds = 3600
): Promise<(EditionPage & { url: string })[]> {
  if (pages.length === 0) return [];
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(EDITION_BUCKET)
    .createSignedUrls(pages.map((p) => p.key), expiresInSeconds);

  if (error || !data) {
    console.error("signEditionPages failed", error);
    return [];
  }

  // createSignedUrls preserves input order, but it is matched on path rather
  // than trusted positionally: a silently misaligned page order would show a
  // reader the wrong page with nothing to indicate anything went wrong.
  const byPath = new Map(data.map((d) => [d.path, d.signedUrl]));
  return pages
    .map((p) => ({ ...p, url: byPath.get(p.key) ?? "" }))
    .filter((p) => p.url);
}

// Page furniture that repeats on every page and is meaningless out of
// context: the running head, the section label bar, the footer. Stripped so
// a lead-in opens on a sentence rather than on "DISCOVER · COVER STORY
// MOXIE moxiemag.co.za".
const FURNITURE =
  /^(moxiemag\.co\.za|MOXIE|MOXIE MAGAZINE|A Smart Value Club publication|FREE WITH SVC|\d{1,3}|[A-Z][A-Z\s·'&-]{2,}·[A-Z\s·'&-]+)$/;

// The section label bar, "OPEN EDITOR'S LETTER" or "DISCOVER · COVER
// STORY", flattens to a short line of capitals and always sits at the top of
// the page, directly under the running head.
//
// Only leading lines are stripped, deliberately. A blanket "drop every line
// of capitals" rule would also eat real headlines, and July page 7 opens
// "ALL 19. EVERY ONE OF THEM YOURS." which is the best sentence on the page.
// Position is what separates chrome from content here, not case.
const LEADING_LABEL = /^[A-Z0-9][A-Z0-9\s·'&.,-]{2,59}$/;

function stripFurniture(text: string): string {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !FURNITURE.test(l));

  let start = 0;
  while (start < lines.length && LEADING_LABEL.test(lines[start])) start++;

  // If every line looked like a label, the page is chrome and there is no
  // prose to find. Hand back the original rather than an empty string, and
  // let the ratio test below reject it.
  if (start >= lines.length) return lines.join("\n").trim();

  return lines.slice(start).join("\n").trim();
}

/**
 * The readable prose of an edition, for the lead-in and for the article
 * pages search engines index.
 *
 * Length alone is not enough to tell prose from a contents page. Measured
 * against the real June and July exports, a cover runs 11 to 14 percent
 * lowercase words and a contents page 19 to 37 percent, because both are
 * mostly setwide capitals: section names, page numbers, headlines. Actual
 * article pages sit at 60 to 84 percent without exception.
 *
 * So the test is the mix of the text rather than the size of it. Without
 * this the lead-in opened on the cover, which reads as a pile of disconnected
 * capitals and would have been the first thing Google saw of every edition.
 */
export function readableText(pages: EditionPage[]): { page: number; text: string }[] {
  return pages
    .map((p) => ({ page: p.page, text: stripFurniture(p.text) }))
    .filter((p) => {
      if (p.text.length < 800) return false;
      const words = p.text.split(/\s+/).filter((w) => w.length > 2);
      if (words.length === 0) return false;
      const lower = words.filter((w) => /^[a-z]/.test(w)).length;
      return lower / words.length >= 0.6;
    });
}
