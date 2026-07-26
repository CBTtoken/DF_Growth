import { createAdminClient } from "@/lib/supabase/admin";
import { generateAgentPageCopy } from "@/lib/ai/agent-page-copy";

// Agent Programme Phase 1 Sec 1.6. Shared by the admin view and the
// agent's own dashboard, because both offer the same four questions and
// both must behave identically when the draft comes back unusable.
export async function draftAndSaveAgentCopy(
  agentId: string,
  answers: { before?: string; why?: string; who?: string; area?: string }
): Promise<{ error?: string }> {
  const admin = createAdminClient();
  const { data: agent } = await admin.from("agents").select("full_name, town").eq("id", agentId).maybeSingle();
  if (!agent) return { error: "Agent not found." };

  // Saved before the draft is attempted, so a failed or rejected draft
  // never loses what the agent just typed. They can hit the button again
  // without re-answering.
  await admin
    .from("agents")
    .update({
      intake_before: answers.before || null,
      intake_why: answers.why || null,
      intake_who: answers.who || null,
      intake_area: answers.area || null,
    })
    .eq("id", agentId);

  const draft = await generateAgentPageCopy({
    fullName: agent.full_name,
    town: agent.town ?? "",
    before: answers.before ?? "",
    why: answers.why ?? "",
    who: answers.who ?? "",
    area: answers.area ?? "",
  });

  if (!draft) {
    // Same contract as the member wizard: a failed draft is never an error
    // state that blocks anything, it just means the copy gets written by
    // hand. The answers above are saved either way.
    return {
      error: "The draft did not come back usable. Your answers are saved, so try again or write the boxes yourself.",
    };
  }

  const { error } = await admin
    .from("agents")
    .update({
      hero_promise: draft.heroPromise,
      story_text: draft.storyText,
      offer_text: draft.offerText,
    })
    .eq("id", agentId);

  if (error) {
    console.error("Failed to save drafted agent copy", error);
    return { error: "Wrote the draft but could not save it. Please try again." };
  }

  return {};
}
