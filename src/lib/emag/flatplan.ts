import { createAdminClient } from "@/lib/supabase/admin";
import { AD_FORMATS, type AdFormat } from "./publication";

// The flatplan, and the one calculation the whole build turns on.
//
// Page numbers are derived by walking the running order and adding up how
// many pages each block occupies. Nothing stores a page number, nothing
// types one, and the contents page is generated from the result rather than
// written alongside it. That is what makes reordering two blocks renumber
// everything correctly and rebuild the contents to match.

export type FlatplanKind = "cover" | "contents" | "article" | "ad" | "back_cover";

export type FlatplanRow = {
  id: string;
  position: number;
  kind: FlatplanKind;
  pages: number;
  article: {
    id: string;
    title: string;
    pillar: string;
    section: string;
    writer: string | null;
    status: "draft" | "submitted" | "approved";
    pageCount: number;
  } | null;
  ad: {
    id: string;
    advertiser: string;
    format: AdFormat;
    positionCode: string | null;
    hasArtwork: boolean;
  } | null;
};

/** A block with its resolved page numbers. */
export type PlannedBlock = FlatplanRow & {
  /** The first page this block occupies. The cover is page 1. */
  firstPage: number;
  lastPage: number;
};

export type Plan = {
  blocks: PlannedBlock[];
  totalPages: number;
  problems: Problem[];
};

export type Problem = {
  /** The block the problem is about, if it is about one. */
  blockId?: string;
  severity: "blocking" | "warning";
  message: string;
};

/**
 * Turns a running order into page numbers.
 *
 * Pure, and deliberately so: it takes rows and returns numbers, touches no
 * database and no clock, so the same order always produces the same
 * numbering and it can be tested without a fixture edition.
 *
 * Two quarter pages share a physical page, which is the one place the sum
 * is not simply "add up the parts". They are paired in order: the first
 * quarter opens a page and the next one to come along closes it. A quarter
 * page with nothing to pair with keeps its own page, because the
 * alternative is silently dropping an advertisement somebody paid for.
 */
export function planPages(rows: FlatplanRow[]): Plan {
  const ordered = [...rows].sort((a, b) => a.position - b.position);
  const blocks: PlannedBlock[] = [];
  const problems: Problem[] = [];

  let page = 1;
  // The page number of a quarter page advertisement that is still waiting
  // for a partner to share its page with.
  let openQuarter: number | null = null;

  for (const row of ordered) {
    const isQuarter = row.kind === "ad" && row.ad?.format === "quarter";

    if (isQuarter && openQuarter !== null) {
      blocks.push({ ...row, firstPage: openQuarter, lastPage: openQuarter });
      openQuarter = null;
      continue;
    }

    // An approved article's real page count wins. An unwritten one falls
    // back to the extent planned for it, so a flatplan is useful as a
    // planning document before a word has been written: a Cover Story
    // pencilled in for seven pages numbers the edition as seven, and the
    // numbers firm up as articles are approved rather than starting wrong.
    const planned =
      row.kind === "article" && row.article && row.article.pageCount > 0
        ? row.article.pageCount
        : row.pages;
    const extent = Math.max(1, planned);
    const firstPage = page;
    const lastPage = page + extent - 1;
    blocks.push({ ...row, firstPage, lastPage });
    page = lastPage + 1;

    if (isQuarter) openQuarter = firstPage;
  }

  return { blocks, totalPages: page - 1, problems: problems.concat(checkRules(blocks)) };
}

/**
 * The rules from the brief, checked rather than trusted.
 *
 * These are reported, not enforced by refusal. A publisher who genuinely
 * wants an advertisement in an odd place at 11pm before publication should
 * be told it is odd, not stopped. The exception is an unapproved article,
 * which cannot be numbered honestly because its page count is not final.
 */
function checkRules(blocks: PlannedBlock[]): Problem[] {
  const problems: Problem[] = [];

  blocks.forEach((block, i) => {
    if (block.kind === "article" && block.article && block.article.status !== "approved") {
      problems.push({
        blockId: block.id,
        severity: "blocking",
        message: `"${block.article.title}" is not approved yet, so its length is not final and the page numbers after it will move.`,
      });
    }

    if (block.kind === "ad" && block.ad && !block.ad.hasArtwork) {
      problems.push({
        blockId: block.id,
        severity: "blocking",
        message: `${block.ad.advertiser} has no artwork uploaded, so this page would publish blank.`,
      });
    }

    // Advertisements sit between sections, never mid article. With articles
    // as whole blocks that cannot happen by construction, so the rule that
    // is actually at risk is a half or quarter page landing between two
    // blocks of the same article, which the flatplan cannot express either.
    // What can go wrong is an advertisement immediately before the contents
    // page, which puts it ahead of the reader knowing what they are reading.
    if (block.kind === "ad") {
      const next = blocks[i + 1];
      if (next?.kind === "contents") {
        problems.push({
          blockId: block.id,
          severity: "warning",
          message: "An advertisement sits directly before the contents page.",
        });
      }
    }
  });

  const cover = blocks[0];
  if (!cover || cover.kind !== "cover") {
    problems.push({ severity: "warning", message: "The edition does not open on a cover." });
  }

  const contents = blocks.find((b) => b.kind === "contents");
  if (!contents) {
    problems.push({ severity: "warning", message: "The edition has no contents page." });
  }

  return problems;
}

/** Reads an edition's running order, ready for planPages. */
export async function loadFlatplan(editionId: string): Promise<FlatplanRow[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("emag_flatplan")
    .select(
      `id, position, kind, pages,
       article:emag_articles ( id, title, pillar, section, writer, status, page_count ),
       ad:emag_ads ( id, advertiser, format, position_code, artwork_path )`
    )
    .eq("edition_id", editionId)
    .order("position", { ascending: true });

  if (error) throw new Error(`Could not read the flatplan: ${error.message}`);

  return (data ?? []).map((row) => {
    // Supabase types an embedded one-to-one as an array. Narrowed here once
    // rather than at every call site.
    const article = Array.isArray(row.article) ? row.article[0] : row.article;
    const ad = Array.isArray(row.ad) ? row.ad[0] : row.ad;

    return {
      id: row.id as string,
      position: row.position as number,
      kind: row.kind as FlatplanKind,
      pages: row.pages as number,
      article: article
        ? {
            id: article.id,
            title: article.title,
            pillar: article.pillar,
            section: article.section,
            writer: article.writer,
            status: article.status,
            pageCount: article.page_count,
          }
        : null,
      ad: ad
        ? {
            id: ad.id,
            advertiser: ad.advertiser,
            format: ad.format as AdFormat,
            positionCode: ad.position_code,
            hasArtwork: Boolean(ad.artwork_path),
          }
        : null,
    };
  });
}

/**
 * Moves a block to a new index in the running order.
 *
 * Positions are rewritten in full rather than nudged. An edition is at most
 * a few dozen blocks, and a single ordered rewrite cannot leave two blocks
 * claiming the same slot the way incremental arithmetic eventually does.
 *
 * The two writes are sequential on purpose: positions are unique per
 * edition, so moving everything to a temporary range first is what stops
 * the update colliding with the order it is replacing.
 */
export async function reorderFlatplan(editionId: string, orderedIds: string[]) {
  const supabase = createAdminClient();

  const parked = orderedIds.map((id, i) =>
    supabase
      .from("emag_flatplan")
      .update({ position: -(i + 1) })
      .eq("id", id)
      .eq("edition_id", editionId)
  );
  for (const write of parked) {
    const { error } = await write;
    if (error) throw new Error(`Could not reorder the flatplan: ${error.message}`);
  }

  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("emag_flatplan")
      .update({ position: (i + 1) * 10 })
      .eq("id", orderedIds[i])
      .eq("edition_id", editionId);
    if (error) throw new Error(`Could not reorder the flatplan: ${error.message}`);
  }
}

/** How a block describes itself on the flatplan screen. */
export function describeBlock(block: PlannedBlock): { title: string; detail: string } {
  switch (block.kind) {
    case "cover":
      return { title: "Cover", detail: "Front cover" };
    case "back_cover":
      return { title: "Back cover", detail: "Next edition teaser" };
    case "contents":
      return { title: "Contents", detail: "Generated from this running order" };
    case "article":
      return {
        title: block.article?.title ?? "Untitled",
        detail: [block.article?.pillar, block.article?.section, block.article?.writer]
          .filter(Boolean)
          .join(" · "),
      };
    case "ad":
      return {
        title: block.ad?.advertiser ?? "Advertisement",
        detail: [
          block.ad ? AD_FORMATS[block.ad.format].label : "",
          block.ad?.positionCode ?? "",
        ]
          .filter(Boolean)
          .join(" · "),
      };
  }
}
