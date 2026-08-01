"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireEmagUserForAction, getPublication } from "@/lib/emag/access";
import { pillarFor } from "@/lib/emag/publication";
import {
  buildSystem,
  draftWithCoEditor,
  type CoEditorDraft,
  type CoEditorTurn,
} from "@/lib/emag/coeditor";

// The co-editor's one server action.
//
// It reads the article's own pillar and section and the publication's voice
// and rules, so the brief is assembled from what the magazine actually is
// rather than from anything typed into a box. Two magazines on Kwaai Press
// get two different co-editors without a line of this changing.

export async function askCoEditor(
  articleId: string,
  turns: CoEditorTurn[]
): Promise<CoEditorDraft> {
  await requireEmagUserForAction();

  if (turns.length === 0) {
    throw new Error("Tell the co-editor what the piece is about first.");
  }

  const supabase = createAdminClient();
  const { data: article, error } = await supabase
    .from("emag_articles")
    .select("pillar, section, edition_id")
    .eq("id", articleId)
    .maybeSingle();

  if (error) throw new Error(`Could not read the article: ${error.message}`);
  if (!article) throw new Error("That article no longer exists.");

  const publication = await getPublication();
  if (!publication) throw new Error("The publication is not set up.");

  // How long the piece should run, from the flatplan rather than from a
  // guess. A Cover Story pencilled in for seven pages and a Book Review
  // pencilled in for one should not come back the same length.
  const { data: slot } = await supabase
    .from("emag_flatplan")
    .select("pages")
    .eq("article_id", articleId)
    .maybeSingle();

  const pillar = pillarFor(article.pillar);

  const system = buildSystem(
    {
      name: publication.name,
      definition: publication.definition,
      houseRules: (publication.house_rules ?? {}) as Record<string, unknown>,
    },
    { label: pillar.label, territory: pillar.territory },
    article.section,
    (slot?.pages as number) ?? 2
  );

  return draftWithCoEditor(system, turns);
}
