import type { PlannedBlock } from "./flatplan";
import type { RenderedPage } from "./types";
import type { PillarKey } from "./publication";

// The contents page, generated from the assembled edition.
//
// The reference calls it "built last, after page numbers confirmed", and
// June's own contents page shows why that matters: it lists the Editor's
// Letter on page 02 and the Editor's Letter prints 01. Somebody typed a
// number, the running order moved underneath it, and the two never met
// again. Nothing here is typed.

export type ContentsEntry = {
  page: number;
  pillar: PillarKey;
  title: string;
  detail: string;
};

export type ContentsGroup = {
  heading: string;
  entries: ContentsEntry[];
};

/**
 * Groups the edition into the three headings June and July both use.
 *
 * Features are the long editorial pieces, regular sections are the standing
 * short ones, and partner stories are the advertorials. Advertisements
 * themselves are never listed: a reader looking for something is not
 * looking for an advertisement, and both published editions leave them out.
 */
export function buildContents(blocks: PlannedBlock[]): ContentsGroup[] {
  const features: ContentsEntry[] = [];
  const regular: ContentsEntry[] = [];
  const partner: ContentsEntry[] = [];

  for (const block of blocks) {
    if (block.kind !== "article" || !block.article) continue;

    const entry: ContentsEntry = {
      page: block.firstPage,
      pillar: block.article.pillar as PillarKey,
      title: block.article.title,
      detail: [block.article.section, block.article.writer].filter(Boolean).join(" · "),
    };

    if (block.article.pillar === "partner") partner.push(entry);
    // Two pages or more is what makes something a feature rather than a
    // standing slot. Derived from the edition rather than declared, so an
    // unusually long Word of the Month lands in the right group by itself.
    else if (block.lastPage - block.firstPage >= 1) features.push(entry);
    else regular.push(entry);
  }

  const groups: ContentsGroup[] = [];
  if (features.length) groups.push({ heading: "Features", entries: features });
  if (regular.length) groups.push({ heading: "Regular sections", entries: regular });
  if (partner.length) groups.push({ heading: "Partner stories", entries: partner });
  return groups;
}

/**
 * The contents as a page the renderer can draw, like any other page.
 *
 * Deliberately the same shape as an article's page rather than a special
 * case: it carries the same section label bar, the same footer and the same
 * derived folio, so it cannot drift away from the rest of the edition.
 */
export function contentsPage(
  blocks: PlannedBlock[],
  options: { folio: number; nextEdition?: { title: string; note?: string } }
): RenderedPage {
  const groups = buildContents(blocks);

  return {
    layout: "contents",
    head: { pillar: "cover", section: "In This Edition" },
    folio: options.folio,
    opener: {
      headline: "In This",
      headlineTurn: "Edition.",
      scale: "xl",
    },
    // The groups travel as rows so the contents page renders through the
    // same block machinery as everything else.
    blocks: groups.flatMap((group) => [
      { type: "subhead" as const, text: group.heading },
      {
        type: "rows" as const,
        rows: group.entries.map((entry) => ({
          tag: String(entry.page).padStart(2, "0"),
          tagNote: entry.pillar.toUpperCase(),
          title: entry.title,
          meta: entry.detail || undefined,
        })),
      },
    ]),
    nextEdition: options.nextEdition,
  };
}
