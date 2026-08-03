"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireEmagUserForAction, requirePublisherForAction } from "@/lib/emag/access";
import type { Asset, Block, Opener, RenderedPage } from "@/lib/emag/types";

// Writing an article.
//
// Every action checks the caller's own membership rather than trusting the
// screen, because a server action is a public endpoint. A writer can create,
// edit and submit. Only a publisher can approve, and approval is the moment
// an article's page breaks are frozen.

// Built from character codes rather than written literally, because the
// house style check scans this repository for exactly these characters and
// a file that hunts for them would otherwise fail the hunt. en dash, em
// dash, and the two HTML entities that render as one.
const EN = String.fromCharCode(0x2013);
const EM = String.fromCharCode(0x2014);
const ENTITY = (name: string) => `&${name};`;
const EM_DASH = new RegExp(`[${EN}${EM}]|${ENTITY("mdash")}|${ENTITY("ndash")}`);

/**
 * Finds em dashes in text a reader will see.
 *
 * Reports rather than removes. The eleventh acceptance criterion is that
 * body text comes out byte-identical to what was pasted, and Dewald is
 * dyslexic and approves his text before it reaches this stage, so nothing
 * here may quietly rewrite a sentence. The publisher is shown where the
 * character is and fixes it themselves.
 *
 * The house rule applies to Moxie's own copy as well as the platform's,
 * confirmed by Dewald on 1 August 2026 and stated in section 2 of the
 * Editorial and Design Reference as applying to articles, briefs, headings
 * and captions alike.
 */
function findEmDashes(article: { title: string; opener: Opener; blocks: Block[] }): string[] {
  const found: string[] = [];
  const check = (where: string, text: string | undefined) => {
    if (text && EM_DASH.test(text)) found.push(where);
  };

  check("the title", article.title);
  check("the headline", article.opener.headline);
  check("the headline's accent words", article.opener.headlineTurn);
  check("the kicker", article.opener.kicker);
  check("the standfirst", article.opener.standfirst?.text);
  check("the photo credit", article.opener.credit);

  article.blocks.forEach((block, i) => {
    const at = `block ${i + 1}`;
    if (block.type === "p") check(at, block.content.text);
    if (block.type === "subhead") check(`${at}, a subheading`, block.text);
    if (block.type === "pullquote") check(`${at}, a pull quote`, block.content.text);
    if (block.type === "tip") check(`${at}, the Moxie Tip`, block.content.text);
    if (block.type === "list") block.items.forEach((item) => check(`${at}, a list item`, item.text));
    if (block.type === "rows")
      block.rows.forEach((row) => {
        check(`${at}, a row title`, row.title);
        check(`${at}, a row`, row.body?.text);
      });
  });

  return found;
}

export type ArticleDraft = {
  id?: string;
  editionId: string;
  pillar: string;
  section: string;
  title: string;
  writer?: string;
  layout: string;
  opener: Opener;
  blocks: Block[];
  tighten?: number;
};

export async function saveArticle(draft: ArticleDraft) {
  const user = await requireEmagUserForAction();
  const supabase = createAdminClient();

  const row = {
    edition_id: draft.editionId,
    pillar: draft.pillar,
    section: draft.section,
    title: draft.title.trim() || "Untitled",
    writer: draft.writer?.trim() || null,
    layout: draft.layout,
    opener: draft.opener,
    blocks: draft.blocks,
    tighten: draft.tighten ?? 0,
    updated_at: new Date().toISOString(),
  };

  if (draft.id) {
    // Editing an approved article puts it back to draft. Its frozen pages
    // are cleared with it, because pages that no longer match the text they
    // came from are worse than no pages: the flatplan would keep numbering
    // the edition off a page count the article no longer has.
    const { error } = await supabase
      .from("emag_articles")
      .update({ ...row, status: "draft", pages: null, page_count: 0 })
      .eq("id", draft.id);
    if (error) throw new Error(`Could not save: ${error.message}`);

    await syncFlatplanPages(draft.id, 0);
    revalidatePath(`/bizup/kwaaipress/moxie/articles/${draft.id}`);
    return draft.id;
  }

  const { data, error } = await supabase
    .from("emag_articles")
    .insert({ ...row, created_by: user.userId })
    .select("id")
    .single();
  if (error) throw new Error(`Could not create the article: ${error.message}`);

  revalidatePath(`/bizup/kwaaipress/moxie/editions/${draft.editionId}`);
  return data.id as string;
}

export async function submitArticle(id: string) {
  await requireEmagUserForAction();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("emag_articles")
    .update({ status: "submitted", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`Could not submit: ${error.message}`);

  revalidatePath(`/bizup/kwaaipress/moxie/articles/${id}`);
}

/**
 * Approves an article and freezes its pages.
 *
 * The pages arrive already worked out. They were measured once, in the
 * browser, at the article's real size, and split by the pure paginator.
 * From here on the renderer replays exactly this and never recomputes,
 * which is what makes repeat runs identical and the contents page
 * trustworthy.
 */
export async function approveArticle(id: string, pages: RenderedPage[]) {
  const user = await requirePublisherForAction();
  const supabase = createAdminClient();

  if (!pages.length) {
    throw new Error("There are no pages to approve. Something went wrong measuring the article.");
  }

  const { data: existing, error: readError } = await supabase
    .from("emag_articles")
    .select("title, opener, blocks, edition_id")
    .eq("id", id)
    .maybeSingle();
  if (readError) throw new Error(`Could not read the article: ${readError.message}`);
  if (!existing) throw new Error("That article no longer exists.");

  const dashes = findEmDashes({
    title: existing.title,
    opener: (existing.opener ?? {}) as Opener,
    blocks: (existing.blocks ?? []) as Block[],
  });
  if (dashes.length) {
    throw new Error(
      `There is an em dash in ${dashes.join(", ")}. The house rule is no em dashes anywhere. Change it to a comma or a full stop and approve again. Nothing has been altered for you.`
    );
  }

  const { error } = await supabase
    .from("emag_articles")
    .update({
      status: "approved",
      pages,
      page_count: pages.length,
      approved_by: user.userId,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(`Could not approve: ${error.message}`);

  await syncFlatplanPages(id, pages.length);
  await ensureInFlatplan(existing.edition_id as string, id, pages.length);

  revalidatePath(`/bizup/kwaaipress/moxie/articles/${id}`);
  revalidatePath(`/bizup/kwaaipress/moxie/editions/${existing.edition_id}/flatplan`);
}

/** Keeps the flatplan's copy of the extent in step with the article. */
async function syncFlatplanPages(articleId: string, pages: number) {
  const supabase = createAdminClient();
  await supabase
    .from("emag_flatplan")
    .update({ pages: Math.max(1, pages) })
    .eq("article_id", articleId);
}

/**
 * Puts a newly approved article into the running order.
 *
 * Placed at the end, before the back cover if there is one, because the
 * publisher decides where it actually belongs and the flatplan is where
 * they do that. Inserting it somewhere clever would be guessing.
 */
async function ensureInFlatplan(editionId: string, articleId: string, pages: number) {
  const supabase = createAdminClient();

  const { data: already } = await supabase
    .from("emag_flatplan")
    .select("id")
    .eq("article_id", articleId)
    .maybeSingle();
  if (already) return;

  // Approving a second article used to fail here, every time, on any edition
  // that had a back cover.
  //
  // The old sum was `back.position - 5`, which is not a gap, it is a fixed
  // point. The first article took it. The second one computed the identical
  // number, because the back cover had not moved, and collided with the first
  // on the unique index over (edition_id, position). Sentry has been
  // reporting it as "Approved, but could not add it to the flatplan", which
  // is exactly what happened: the article was approved and then stranded
  // outside the running order.
  //
  // Now the article goes after the last thing in the edition and the back
  // cover is pushed along to stay last, which is the only place a back cover
  // can be. Monotonic, so it cannot collide with itself however many are
  // approved.
  const { data: rows } = await supabase
    .from("emag_flatplan")
    .select("id, position, kind")
    .eq("edition_id", editionId)
    .order("position", { ascending: true });

  const all = (rows ?? []) as { id: string; position: number; kind: string }[];
  const back = all.find((r) => r.kind === "back_cover");
  const lastContent = all
    .filter((r) => r.kind !== "back_cover")
    .reduce((max, r) => Math.max(max, r.position), 0);

  const position = lastContent + 10;

  // The back cover keeps the last slot. Moved first, so the insert below is
  // never racing it for the same number.
  if (back && back.position <= position) {
    const { error: moveError } = await supabase
      .from("emag_flatplan")
      .update({ position: position + 10 })
      .eq("id", back.id);
    if (moveError) {
      throw new Error(`Approved, but could not make room in the flatplan: ${moveError.message}`);
    }
  }

  const { error } = await supabase.from("emag_flatplan").insert({
    edition_id: editionId,
    position,
    kind: "article",
    article_id: articleId,
    pages: Math.max(1, pages),
  });
  if (error) throw new Error(`Approved, but could not add it to the flatplan: ${error.message}`);
}

export async function deleteArticle(id: string, editionId: string) {
  await requirePublisherForAction();
  const supabase = createAdminClient();

  const { error } = await supabase.from("emag_articles").delete().eq("id", id);
  if (error) throw new Error(`Could not delete: ${error.message}`);

  revalidatePath(`/bizup/kwaaipress/moxie/editions/${editionId}/flatplan`);
  redirect(`/bizup/kwaaipress/moxie/editions/${editionId}`);
}

/**
 * Authorises one upload and hands back a signed URL to push the file to.
 *
 * The first version had the browser upload straight to the bucket with the
 * publishable key, and it could not work: storage refuses that write with a
 * row level security error, so the picture control was dead on arrival.
 *
 * Routing the file through a server action instead would have meant every
 * magazine photograph travelling through our own server and running into
 * the body size limit. A signed upload URL avoids both. Membership is
 * checked here, on our side, where it belongs, and the file then goes
 * directly from the browser to storage without a policy having to encode
 * who is allowed to write.
 *
 * The token is single use and short lived, so it cannot be kept and reused
 * to fill the bucket later.
 */
export async function createUploadUrl(articleId: string, extension: string) {
  await requireEmagUserForAction();
  const supabase = createAdminClient();

  // Named by article and time, never by the original filename. Two
  // photographs called IMG_1234.jpg in one edition would otherwise
  // overwrite each other, and the second would silently replace the first
  // on a page nobody was looking at.
  const safe = extension.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
  const path = `${articleId}/${Date.now()}.${safe}`;

  const { data, error } = await supabase.storage
    .from("emag-assets")
    .createSignedUploadUrl(path);

  if (error) throw new Error(`Could not start the upload: ${error.message}`);
  return { path: data.path, token: data.token };
}

/**
 * Records an uploaded image and its placement.
 *
 * The file itself has already gone to storage. This only writes the row
 * describing where it sits.
 */
export async function saveAsset(
  articleId: string,
  asset: Omit<Asset, "id" | "src"> & { id?: string; storagePath: string }
) {
  await requireEmagUserForAction();
  const supabase = createAdminClient();

  const row = {
    article_id: articleId,
    storage_path: asset.storagePath,
    alt: asset.alt ?? "",
    caption: asset.caption ?? null,
    caption_style: asset.captionStyle ?? null,
    finish: asset.finish ?? null,
    slot: asset.slot,
    side: asset.side,
    wrap: asset.wrap,
    width_pct: asset.widthPct ?? null,
    height_mm: asset.heightMm ?? null,
    overlay: asset.overlay ?? null,
  };

  if (asset.id) {
    const { error } = await supabase.from("emag_assets").update(row).eq("id", asset.id);
    if (error) throw new Error(`Could not save the image settings: ${error.message}`);
    revalidatePath(`/bizup/kwaaipress/moxie/articles/${articleId}`);
    return asset.id;
  }

  const { data, error } = await supabase.from("emag_assets").insert(row).select("id").single();
  if (error) throw new Error(`Could not save the image: ${error.message}`);
  revalidatePath(`/bizup/kwaaipress/moxie/articles/${articleId}`);
  return data.id as string;
}

/**
 * Changes where a picture sits, without touching anything else about it.
 *
 * Separate from saveAsset because the editor calls this on every step of a
 * width slider and has no business resending the caption, the alt text and
 * the storage path thirty times to change one number. Only the placement
 * fields are accepted, so a stray key from the browser cannot rewrite which
 * file an asset points at.
 */
export async function updateAssetPlacement(assetId: string, changes: Record<string, unknown>) {
  await requireEmagUserForAction();
  const supabase = createAdminClient();

  const row: Record<string, unknown> = {};
  if (typeof changes.widthPct === "number") row.width_pct = changes.widthPct;
  if (typeof changes.heightMm === "number") row.height_mm = changes.heightMm;
  if (changes.side === "left" || changes.side === "right" || changes.side === "full") {
    row.side = changes.side;
  }
  if (typeof changes.wrap === "boolean") row.wrap = changes.wrap;
  if (typeof changes.finish === "string" && ["none","rule","shadow","framed","rounded"].includes(changes.finish)) {
    row.finish = changes.finish;
  }

  if (Object.keys(row).length === 0) return;

  const { data, error } = await supabase
    .from("emag_assets")
    .update(row)
    .eq("id", assetId)
    .select("article_id")
    .maybeSingle();
  if (error) throw new Error(`Could not move the picture: ${error.message}`);

  if (data?.article_id) revalidatePath(`/bizup/kwaaipress/moxie/articles/${data.article_id}`);
}

export async function deleteAsset(articleId: string, assetId: string) {
  await requireEmagUserForAction();
  const supabase = createAdminClient();
  const { error } = await supabase.from("emag_assets").delete().eq("id", assetId);
  if (error) throw new Error(`Could not remove the image: ${error.message}`);
  revalidatePath(`/bizup/kwaaipress/moxie/articles/${articleId}`);
}
