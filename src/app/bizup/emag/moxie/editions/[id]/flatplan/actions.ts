"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePublisherForAction } from "@/lib/emag/access";
import { reorderFlatplan } from "@/lib/emag/flatplan";

// The flatplan's writes. Publisher only, checked here rather than trusted
// from the screen: a server action is a public endpoint, and the fact that
// the button is hidden from a writer says nothing about what they can post.

export async function saveOrder(editionId: string, orderedIds: string[]) {
  await requirePublisherForAction();

  // Only blocks that actually belong to this edition may be reordered. The
  // ids come from the browser, so without this a crafted request could pull
  // a block out of somebody else's edition into this one's numbering.
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("emag_flatplan")
    .select("id")
    .eq("edition_id", editionId);
  if (error) throw new Error(`Could not read the flatplan: ${error.message}`);

  const owned = new Set((data ?? []).map((r) => r.id as string));
  const clean = orderedIds.filter((id) => owned.has(id));
  if (clean.length !== owned.size) {
    throw new Error("The running order did not match this edition. Nothing was changed.");
  }

  await reorderFlatplan(editionId, clean);
  revalidatePath(`/bizup/emag/moxie/editions/${editionId}/flatplan`);
}

export async function addBlock(
  editionId: string,
  kind: "cover" | "contents" | "back_cover"
) {
  await requirePublisherForAction();
  const supabase = createAdminClient();

  const { data: last } = await supabase
    .from("emag_flatplan")
    .select("position")
    .eq("edition_id", editionId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("emag_flatplan").insert({
    edition_id: editionId,
    position: ((last?.position as number) ?? 0) + 10,
    kind,
    pages: 1,
  });
  if (error) throw new Error(`Could not add the block: ${error.message}`);

  revalidatePath(`/bizup/emag/moxie/editions/${editionId}/flatplan`);
}

export async function removeBlock(editionId: string, blockId: string) {
  await requirePublisherForAction();
  const supabase = createAdminClient();

  // Removing a block takes it out of the running order. It does not delete
  // the article or the advertisement behind it, which stay available to put
  // back. Deleting a writer's work because a publisher dragged something
  // out of the plan would be a very expensive surprise.
  const { error } = await supabase
    .from("emag_flatplan")
    .delete()
    .eq("id", blockId)
    .eq("edition_id", editionId);
  if (error) throw new Error(`Could not remove the block: ${error.message}`);

  revalidatePath(`/bizup/emag/moxie/editions/${editionId}/flatplan`);
}
