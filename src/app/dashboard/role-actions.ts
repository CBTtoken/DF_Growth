"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { ACTIVE_ROLE_COOKIE, getMyAgentRecord, type DashboardRole } from "@/lib/agents/dashboard-role";
import { replaceAgentPhoto } from "@/lib/agent-page/photo";
import { agentContentUpdate, readContentFields } from "@/lib/agent-page/form";
import { draftAndSaveAgentCopy } from "@/lib/agent-page/copy";
import { agentPageContentSchema, agentCopyIntakeSchema } from "@/lib/schemas/agents";

// Agent Programme Phase 1 Sec 1.1: the switch itself. Writes the
// preference, then sends the browser to the right dashboard, so a return
// visit to /dashboard lands where the agent left off.
export async function switchDashboardRole(role: DashboardRole) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ROLE_COOKIE, role, {
    // A whole year: this is a UI preference, not a session, and having it
    // expire mid-use would silently drop an agent back into the business
    // dashboard for no reason they could see.
    maxAge: 365 * 24 * 60 * 60,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  redirect(role === "agent" ? "/dashboard/agent" : "/dashboard");
}

export type AgentSelfEditState = { error?: string; saved?: boolean } | null;

// Sec 1.5: "Show a single, non-nagging prompt in the dashboard noting that
// a real photo performs better, with a direct link to upload." This is the
// upload behind that link. Scoped hard to the agent record belonging to
// the current login, so the agent id is never taken from the request.
export async function uploadMyAgentPhoto(
  _prevState: AgentSelfEditState,
  formData: FormData
): Promise<AgentSelfEditState> {
  const agent = await getMyAgentRecord();
  if (!agent) return { error: "Only an approved agent can do that." };

  const result = await replaceAgentPhoto(agent.id, formData.get("photo"));
  if ("error" in result) return result;

  revalidateForAgent(agent.pageSlug);
  return { saved: true };
}

// Agents edit their own page copy, colour and services from their own
// dashboard. Sec 1.10 had this arriving with the phase 2 dashboard, moved
// forward on Dewald's call: an agent who does not want to answer the copy
// questions must still be able to fill a box in later themselves, rather
// than the alternative, which is mailing changes to Dewald forever.
//
// The slug, the publish state and "active since" stay admin-only. The
// first two are namespace and go-live decisions, and the third is a
// credential claim printed on the public page.
export async function saveMyAgentPage(
  _prevState: AgentSelfEditState,
  formData: FormData
): Promise<AgentSelfEditState> {
  const agent = await getMyAgentRecord();
  if (!agent) return { error: "Only an approved agent can do that." };

  const parsed = agentPageContentSchema.safeParse(readContentFields(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the boxes and try again." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("agents").update(agentContentUpdate(parsed.data, formData)).eq("id", agent.id);

  if (error) {
    console.error("Failed to save own agent page", error);
    return { error: "Could not save. Please try again." };
  }

  revalidateForAgent(agent.pageSlug);
  return { saved: true };
}

// Sec 1.6, offered rather than required: an agent who would rather not
// write their own copy answers whichever questions they like and gets a
// draft they can then edit. Answers are saved before the draft is
// attempted, so a failed or rejected draft never loses what they typed.
export async function draftMyAgentPageCopy(
  _prevState: AgentSelfEditState,
  formData: FormData
): Promise<AgentSelfEditState> {
  const agent = await getMyAgentRecord();
  if (!agent) return { error: "Only an approved agent can do that." };

  const parsed = agentCopyIntakeSchema.safeParse({
    before: formData.get("before"),
    why: formData.get("why"),
    who: formData.get("who"),
    area: formData.get("area"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Answer at least one of these." };
  }

  const result = await draftAndSaveAgentCopy(agent.id, parsed.data);
  if (result.error) return { error: result.error };

  revalidateForAgent(agent.pageSlug);
  return { saved: true };
}

function revalidateForAgent(pageSlug: string | null) {
  revalidatePath("/dashboard/agent");
  if (pageSlug) revalidatePath(`/${pageSlug}`);
}
