"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePublisherForAction } from "@/lib/emag/access";
import { assembleEdition } from "@/lib/emag/assemble";

// Publishing, and the two switches beside it.

/**
 * Publishes an edition.
 *
 * Refuses if the edition has a blocking problem, and the refusal names it.
 * The two that block are an unapproved article, whose length is not final
 * so every page number after it will move, and an advertisement with no
 * artwork, which would publish a blank page somebody has paid for.
 *
 * Everything else is a warning at most. A publisher deciding at eleven at
 * night that they want something unusual should be told it is unusual, not
 * stopped.
 */
export async function publishEdition(editionId: string) {
  await requirePublisherForAction();
  const supabase = createAdminClient();

  const assembled = await assembleEdition(editionId);
  if (!assembled) throw new Error("That edition no longer exists.");

  if (assembled.pages.length === 0) {
    throw new Error("There is nothing in this edition yet.");
  }

  if (assembled.problems.length) {
    throw new Error(
      `Not ready to publish. ${assembled.problems[0]}${
        assembled.problems.length > 1 ? ` And ${assembled.problems.length - 1} more.` : ""
      }`
    );
  }

  const { error } = await supabase
    .from("emag_editions")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", editionId);
  if (error) throw new Error(`Could not publish: ${error.message}`);

  revalidatePath("/bizup/kwaaipress/moxie", "layout");
}

/** Takes an edition back off the shelf. The link stops working. */
export async function unpublishEdition(editionId: string) {
  await requirePublisherForAction();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("emag_editions")
    .update({ status: "draft", updated_at: new Date().toISOString() })
    .eq("id", editionId);
  if (error) throw new Error(`Could not unpublish: ${error.message}`);

  revalidatePath("/bizup/kwaaipress/moxie", "layout");
}

/**
 * The PDF download switch.
 *
 * A convenience control and nothing more. Anything a browser can display
 * can be captured, so this must never be described anywhere in the
 * interface as preventing sharing, and there is no protection here to back
 * such a claim up.
 */
export async function setPdfEnabled(editionId: string, enabled: boolean) {
  await requirePublisherForAction();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("emag_editions")
    .update({ pdf_enabled: enabled, updated_at: new Date().toISOString() })
    .eq("id", editionId);
  if (error) throw new Error(`Could not change that: ${error.message}`);

  revalidatePath("/bizup/kwaaipress/moxie", "layout");
}
