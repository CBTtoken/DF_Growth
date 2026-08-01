import { createAdminClient } from "@/lib/supabase/admin";
import { assetUrl } from "./articles";
import { contentsPage } from "./contents";
import { loadFlatplan, planPages, type PlannedBlock } from "./flatplan";
import type { Asset, RenderedPage } from "./types";
import { AD_FORMATS, type AdFormat } from "./publication";

// Turning an edition into the pages a reader sees.
//
// Everything here is a replay. The articles' pages were frozen when they
// were approved, the page numbers come from the running order, and the
// contents page is generated from that same order. Nothing is laid out
// again at this point, which is the whole reason a published edition cannot
// disagree with the contents page about where anything is.

export type AssembledEdition = {
  title: string;
  slug: string;
  editionNo: number | null;
  status: string;
  pdfEnabled: boolean;
  pages: RenderedPage[];
  assets: Asset[];
  /** The cover image, for the link preview when the edition is shared. */
  coverImage: string | null;
  problems: string[];
};

export async function assembleEdition(editionId: string): Promise<AssembledEdition | null> {
  const supabase = createAdminClient();

  const { data: edition } = await supabase
    .from("emag_editions")
    .select("*")
    .eq("id", editionId)
    .maybeSingle();
  if (!edition) return null;

  const plan = planPages(await loadFlatplan(editionId));

  // Every approved article's frozen pages, and every image any of them
  // needs. Read in two queries rather than one per article: an edition is
  // twenty or so articles and doing it per block is twenty round trips for
  // no benefit.
  const articleIds = plan.blocks
    .filter((b) => b.kind === "article" && b.article)
    .map((b) => b.article!.id);

  const [{ data: articles }, { data: assetRows }, { data: ads }] = await Promise.all([
    articleIds.length
      ? supabase.from("emag_articles").select("id, pages").in("id", articleIds)
      : Promise.resolve({ data: [] as { id: string; pages: unknown }[] }),
    articleIds.length
      ? supabase.from("emag_assets").select("*").in("article_id", articleIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    supabase.from("emag_ads").select("*").eq("edition_id", editionId),
  ]);

  const frozen = new Map<string, RenderedPage[]>();
  for (const row of articles ?? []) {
    frozen.set(row.id as string, (row.pages ?? []) as RenderedPage[]);
  }

  const adsById = new Map<string, Record<string, unknown>>();
  for (const ad of ads ?? []) adsById.set(ad.id as string, ad);

  const assets: Asset[] = (assetRows ?? []).map((row) => ({
    id: row.id as string,
    src: assetUrl(row.storage_path as string),
    alt: (row.alt as string) ?? "",
    caption: (row.caption as string) ?? undefined,
    captionStyle: (row.caption_style as "regular" | "italic" | null) ?? undefined,
    finish: (row.finish as Asset["finish"]) ?? undefined,
    slot: row.slot as Asset["slot"],
    side: row.side as Asset["side"],
    wrap: Boolean(row.wrap),
    widthPct: (row.width_pct as number) ?? undefined,
    heightMm: (row.height_mm as number) ?? undefined,
    overlay: (row.overlay as Asset["overlay"]) ?? undefined,
  }));

  const pages: RenderedPage[] = [];
  const problems = [...plan.problems.map((p) => p.message)];

  for (const block of plan.blocks) {
    switch (block.kind) {
      case "cover":
        pages.push(coverPage(edition, plan.blocks));
        break;

      case "back_cover":
        pages.push(backCoverPage(edition));
        break;

      case "contents":
        pages.push(
          contentsPage(plan.blocks, {
            folio: block.firstPage,
            nextEdition: edition.next_edition_title
              ? {
                  title: edition.next_edition_title as string,
                  note: (edition.next_edition_note as string) ?? undefined,
                }
              : undefined,
          })
        );
        break;

      case "article": {
        const stored = frozen.get(block.article!.id) ?? [];
        if (stored.length === 0) {
          problems.push(`"${block.article!.title}" has no frozen pages, so it was left out.`);
          break;
        }
        // The folio is applied here rather than stored on the frozen page.
        // An article's pages do not know where in the edition they sit, and
        // must not: moving the article changes its numbers and nothing else.
        stored.forEach((page, i) => {
          pages.push({ ...page, folio: block.firstPage + i });
        });
        break;
      }

      case "ad": {
        const ad = adsById.get(block.ad!.id);
        pages.push(adPage(ad, block));
        break;
      }
    }
  }

  const coverAsset = (edition.cover_path as string) ?? null;

  return {
    title: edition.title as string,
    slug: edition.slug as string,
    editionNo: (edition.edition_no as number) ?? null,
    status: edition.status as string,
    pdfEnabled: Boolean(edition.pdf_enabled),
    pages,
    assets,
    coverImage: coverAsset ? assetUrl(coverAsset) : null,
    problems,
  };
}

/**
 * The front cover.
 *
 * Built from the edition and the running order rather than authored, which
 * is why the also-in-this-edition list cannot go stale: it is the same
 * articles the contents page lists, read from the same place.
 */
function coverPage(edition: Record<string, unknown>, blocks: PlannedBlock[]): RenderedPage {
  const features = blocks
    .filter((b) => b.kind === "article" && b.article && b.lastPage > b.firstPage)
    .slice(0, 6);

  const lead = features[0];

  return {
    layout: "cover",
    head: { pillar: "cover", section: String(edition.title ?? "") },
    // No folio. A cover does not carry a page number in either published
    // edition, and numbering it would push every other page up by one.
    opener: {
      kicker: edition.edition_no
        ? `Edition ${String(edition.edition_no).padStart(2, "0")}`
        : undefined,
      headline: lead?.article?.title ?? String(edition.title ?? ""),
      scale: "xl",
    },
    blocks: features.length
      ? [
          { type: "subhead", text: "Also in this edition" },
          {
            type: "rows",
            rows: features.slice(1).map((b) => ({
              tag: String(b.firstPage).padStart(2, "0"),
              title: b.article!.title,
              meta: b.article!.section,
            })),
          },
        ]
      : [],
  };
}

function backCoverPage(edition: Record<string, unknown>): RenderedPage {
  return {
    layout: "cover",
    head: { pillar: "cover", section: "Next edition" },
    opener: {
      headline: (edition.next_edition_title as string) ?? "Next month",
      scale: "lg",
    },
    blocks: edition.next_edition_note
      ? [{ type: "p", content: { text: edition.next_edition_note as string } }]
      : [],
  };
}

function adPage(ad: Record<string, unknown> | undefined, block: PlannedBlock): RenderedPage {
  const format = (ad?.format as AdFormat) ?? "full";
  return {
    layout: "advert",
    head: { pillar: "partner", section: AD_FORMATS[format].label },
    folio: block.firstPage,
    blocks: [],
    ad: {
      format,
      advertiser: (ad?.advertiser as string) ?? "Advertisement",
      artwork: ad?.artwork_path ? assetUrl(ad.artwork_path as string) : undefined,
    },
  };
}
