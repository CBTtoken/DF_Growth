"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePublisherForAction } from "@/lib/emag/access";

// The edition's own pictures: the cover, and each advertiser's artwork.
//
// Separate from an article's pictures because they belong to the edition
// rather than to anything written. The cover in particular had a slot in the
// renderer and no way at all to fill it, which is why covers were drawing on
// charcoal and why "the upload does not work" was a fair report: for the
// thing Dewald was actually trying to upload, there was no upload.

export async function createEditionUploadUrl(editionId: string, extension: string) {
  await requirePublisherForAction();
  const supabase = createAdminClient();

  const safe = extension.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
  const path = `editions/${editionId}/${Date.now()}.${safe}`;

  const { data, error } = await supabase.storage
    .from("emag-assets")
    .createSignedUploadUrl(path);
  if (error) throw new Error(`Could not start the upload: ${error.message}`);

  return { path: data.path, token: data.token };
}

export async function setCover(editionId: string, storagePath: string) {
  await requirePublisherForAction();
  const supabase = createAdminClient();

  // Recorded in two places on purpose. The path on the edition is what the
  // link preview image is built from without assembling anything, and the
  // asset row is what the cover page finds by its slot when it renders.
  const { error } = await supabase
    .from("emag_editions")
    .update({ cover_path: storagePath, updated_at: new Date().toISOString() })
    .eq("id", editionId);
  if (error) throw new Error(`Could not set the cover: ${error.message}`);

  await supabase.from("emag_assets").delete().eq("edition_id", editionId).eq("slot", "cover");
  const { error: assetError } = await supabase.from("emag_assets").insert({
    edition_id: editionId,
    storage_path: storagePath,
    slot: "cover",
    side: "full",
    wrap: false,
    alt: "Cover",
  });
  if (assetError) throw new Error(`Could not set the cover: ${assetError.message}`);

  revalidatePath("/bizup/emag/moxie", "layout");
}

export async function setAdArtwork(editionId: string, adId: string, storagePath: string) {
  await requirePublisherForAction();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("emag_ads")
    .update({ artwork_path: storagePath, updated_at: new Date().toISOString() })
    .eq("id", adId)
    .eq("edition_id", editionId);
  if (error) throw new Error(`Could not save the artwork: ${error.message}`);

  revalidatePath("/bizup/emag/moxie", "layout");
}

export async function renameAdvertiser(editionId: string, adId: string, advertiser: string) {
  await requirePublisherForAction();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("emag_ads")
    .update({ advertiser: advertiser.trim() || "Advertisement" })
    .eq("id", adId)
    .eq("edition_id", editionId);
  if (error) throw new Error(`Could not rename: ${error.message}`);

  revalidatePath("/bizup/emag/moxie", "layout");
}

/**
 * The reader's access code.
 *
 * One shared code for everyone, which is what Dewald asked for: subscribers
 * live on another platform, so there is nothing to check against yet. An
 * empty value clears it and the edition becomes readable by anyone with the
 * link again.
 */
export async function setAccessCode(editionId: string, code: string) {
  await requirePublisherForAction();
  const supabase = createAdminClient();

  const clean = code.trim();
  const { error } = await supabase
    .from("emag_editions")
    .update({ access_code: clean || null, updated_at: new Date().toISOString() })
    .eq("id", editionId);
  if (error) throw new Error(`Could not save the code: ${error.message}`);

  revalidatePath("/bizup/emag/moxie", "layout");
}
