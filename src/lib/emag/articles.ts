import { createAdminClient } from "@/lib/supabase/admin";
import type { Asset, Block, Opener, RenderedPage } from "./types";
import type { PillarKey } from "./publication";

// Reading an article and its images back out.
//
// The editor and the preview both go through here rather than each writing
// their own query, so an image's placement controls cannot be read one way
// in the editor and another way on the page.

export type ArticleRecord = {
  id: string;
  editionId: string;
  pillar: PillarKey;
  section: string;
  title: string;
  writer: string | null;
  layout: string;
  opener: Opener;
  blocks: Block[];
  pages: RenderedPage[] | null;
  pageCount: number;
  tighten: number;
  status: "draft" | "submitted" | "approved";
  assets: Asset[];
};

/** The public URL of a stored image. */
export function assetUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${base}/storage/v1/object/public/emag-assets/${storagePath}`;
}

export async function loadArticle(id: string): Promise<ArticleRecord | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("emag_articles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Could not read the article: ${error.message}`);
  if (!data) return null;

  const { data: assetRows, error: assetError } = await supabase
    .from("emag_assets")
    .select("*")
    .eq("article_id", id)
    .order("sort", { ascending: true });
  if (assetError) throw new Error(`Could not read the images: ${assetError.message}`);

  return {
    id: data.id,
    editionId: data.edition_id,
    pillar: data.pillar as PillarKey,
    section: data.section,
    title: data.title,
    writer: data.writer,
    layout: data.layout,
    opener: (data.opener ?? {}) as Opener,
    blocks: (data.blocks ?? []) as Block[],
    pages: (data.pages ?? null) as RenderedPage[] | null,
    pageCount: data.page_count ?? 0,
    tighten: Number(data.tighten ?? 0),
    status: data.status,
    assets: (assetRows ?? []).map(toAsset),
  };
}

export async function listArticles(editionId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("emag_articles")
    .select("id, title, pillar, section, writer, status, page_count, updated_at")
    .eq("edition_id", editionId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`Could not read the articles: ${error.message}`);
  return data ?? [];
}

type AssetRow = {
  id: string;
  storage_path: string;
  alt: string | null;
  caption: string | null;
  caption_style: string | null;
  finish: string | null;
  slot: string;
  side: string;
  wrap: boolean;
  width_pct: number | null;
  height_mm: number | null;
  overlay: { text: string; color: string } | null;
  focal_x: number | null;
  focal_y: number | null;
};

function toAsset(row: AssetRow): Asset {
  return {
    id: row.id,
    src: assetUrl(row.storage_path),
    alt: row.alt ?? "",
    caption: row.caption ?? undefined,
    captionStyle: (row.caption_style as "regular" | "italic" | null) ?? undefined,
    finish: (row.finish as Asset["finish"]) ?? undefined,
    slot: row.slot as Asset["slot"],
    side: row.side as Asset["side"],
    wrap: row.wrap,
    widthPct: row.width_pct ?? undefined,
    heightMm: row.height_mm ?? undefined,
    overlay: row.overlay ?? undefined,
    focalX: row.focal_x ?? undefined,
    focalY: row.focal_y ?? undefined,
  };
}
