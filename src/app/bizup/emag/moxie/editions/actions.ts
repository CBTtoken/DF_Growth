"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePublisherForAction } from "@/lib/emag/access";
import { slugify } from "@/lib/slugify";

// Starting a new edition.
//
// A new edition is not empty. It arrives carrying the standard running
// order from the Editorial and Design Reference, which is the whole point
// of a fixed section structure: the publisher should be filling slots, not
// remembering what the slots are.
//
// Only the structural blocks are created here. No articles, and no invented
// copy: an edition that looks half written before anybody has written
// anything is worse than an empty one.
const SKELETON: { kind: "cover" | "contents" | "back_cover"; pages: number }[] = [
  { kind: "cover", pages: 1 },
  { kind: "contents", pages: 1 },
  { kind: "back_cover", pages: 1 },
];

export async function createEdition(formData: FormData) {
  const user = await requirePublisherForAction();
  const supabase = createAdminClient();

  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("An edition needs a title, for example July 2026.");

  const editionNoRaw = String(formData.get("edition_no") ?? "").trim();
  const editionNo = editionNoRaw ? Number(editionNoRaw) : null;
  if (editionNoRaw && !Number.isInteger(editionNo)) {
    throw new Error("The edition number must be a whole number.");
  }

  // The slug is what a reader's link is built from, so it is derived once
  // here and never recalculated from the title afterwards. Renaming an
  // edition must not break links already sent out.
  const slug = slugify(title);

  const { data: edition, error } = await supabase
    .from("emag_editions")
    .insert({
      publication_id: user.publicationId,
      title,
      edition_no: editionNo,
      slug,
    })
    .select("id")
    .single();

  if (error) {
    // A duplicate slug is the one failure a publisher can actually act on,
    // so it gets a sentence rather than a database message.
    if (error.code === "23505") {
      throw new Error(`There is already an edition called "${title}".`);
    }
    throw new Error(`Could not create the edition: ${error.message}`);
  }

  const { error: planError } = await supabase.from("emag_flatplan").insert(
    SKELETON.map((block, i) => ({
      edition_id: edition.id,
      position: (i + 1) * 10,
      kind: block.kind,
      pages: block.pages,
    }))
  );
  if (planError) throw new Error(`Could not start the flatplan: ${planError.message}`);

  revalidatePath("/bizup/emag/moxie/editions");
  redirect(`/bizup/emag/moxie/editions/${edition.id}/flatplan`);
}
