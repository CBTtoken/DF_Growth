"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePublisherForAction } from "@/lib/emag/access";
import { parseCopyPack, type ParsedArticle } from "@/lib/emag/copypack";
import { MOXIE, type LayoutKey, type PillarKey } from "@/lib/emag/publication";

// Importing an edition's worth of copy.
//
// Two steps on purpose, and the split is the whole point: reading a pack
// writes nothing. A publisher pastes thirty pages, sees exactly what the
// builder made of it, and only then decides. An importer that created
// thirteen articles the moment you pasted would be a very fast way to make
// a mess that has to be deleted by hand.

export type ImportPreview = {
  articles: {
    pageRange: string;
    heading: string;
    pillar: string;
    section: string;
    headline: string;
    counts: Record<string, number>;
    notes: string[];
    exists: boolean;
  }[];
  warnings: string[];
};

/** Matches a pack's pillar name to one of the publication's own keys. */
function toPillar(name: string | undefined): PillarKey {
  const want = (name ?? "").trim().toLowerCase();
  const found = MOXIE.pillars.find(
    (p) => p.key === want || p.label.toLowerCase() === want
  );
  return (found?.key ?? "open") as PillarKey;
}

/**
 * The layout a section normally uses.
 *
 * Taken from the publication's own section list rather than guessed, so an
 * imported article opens the same way a hand-made one does. A section the
 * pack invented falls back to the standard opener rather than failing the
 * import, because a wrong-but-editable layout is a smaller problem than an
 * article that never arrived.
 */
function toLayout(section: string | undefined): LayoutKey {
  const want = (section ?? "").trim().toLowerCase();
  const found = MOXIE.sections.find((s) => s.title.toLowerCase() === want);
  return (found?.defaultLayout ?? "band-opener") as LayoutKey;
}

function titleOf(article: ParsedArticle): string {
  // The heading names the slot in the flatplan, which is what a publisher
  // looks for. The headline is what a reader sees, and it lives on the
  // opener where it belongs.
  return article.heading.trim() || "Untitled";
}

/** Reads a pack and reports what would be created. Writes nothing. */
export async function previewPack(editionId: string, source: string): Promise<ImportPreview> {
  await requirePublisherForAction();
  const supabase = createAdminClient();

  const pack = parseCopyPack(source);

  const { data: existing } = await supabase
    .from("emag_articles")
    .select("title")
    .eq("edition_id", editionId);

  const taken = new Set((existing ?? []).map((r) => String(r.title).trim().toLowerCase()));

  return {
    articles: pack.articles.map((a) => {
      const counts: Record<string, number> = {};
      a.blocks.forEach((b) => {
        counts[b.type] = (counts[b.type] ?? 0) + 1;
      });
      return {
        pageRange: a.pageRange,
        heading: a.heading,
        pillar: toPillar(a.pillar),
        section: a.section ?? a.heading,
        headline: a.opener.headline,
        counts,
        notes: a.notes,
        exists: taken.has(titleOf(a).toLowerCase()),
      };
    }),
    warnings: pack.warnings,
  };
}

/**
 * Creates the articles the preview showed.
 *
 * Anything already in the edition under the same name is skipped rather than
 * duplicated, so importing a corrected pack a second time tops up what is
 * missing instead of producing thirteen more articles. Replacing an article
 * that already exists is deliberately not offered: it would throw away edits
 * made since the first import, and the publisher can delete one and re-import
 * if that is really what they want.
 */
export async function importPack(
  editionId: string,
  source: string
): Promise<{ created: number; skipped: number }> {
  await requirePublisherForAction();
  const supabase = createAdminClient();

  const pack = parseCopyPack(source);

  const { data: existing } = await supabase
    .from("emag_articles")
    .select("title")
    .eq("edition_id", editionId);

  const taken = new Set((existing ?? []).map((r) => String(r.title).trim().toLowerCase()));

  let created = 0;
  let skipped = 0;

  for (const article of pack.articles) {
    const title = titleOf(article);
    if (taken.has(title.toLowerCase())) {
      skipped++;
      continue;
    }

    const { error } = await supabase.from("emag_articles").insert({
      edition_id: editionId,
      pillar: toPillar(article.pillar),
      section: article.section ?? article.heading,
      title,
      layout: toLayout(article.section),
      opener: article.opener,
      blocks: article.blocks,
      status: "draft",
      tighten: 0,
    });

    if (error) throw new Error(`Could not create "${title}": ${error.message}`);
    taken.add(title.toLowerCase());
    created++;
  }

  revalidatePath(`/bizup/kwaaipress/moxie/editions/${editionId}`);
  return { created, skipped };
}
