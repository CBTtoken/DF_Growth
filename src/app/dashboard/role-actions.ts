"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACTIVE_ROLE_COOKIE, getMyAgentRecord, type DashboardRole } from "@/lib/agents/dashboard-role";
import { replaceAgentPhoto } from "@/lib/agent-page/photo";
import { revalidatePath } from "next/cache";

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

// Sec 1.5: "Show a single, non-nagging prompt in the dashboard noting that
// a real photo performs better, with a direct link to upload." This is the
// upload behind that link. Scoped hard to the agent record belonging to
// the current login, so the agent id is never taken from the request.
export async function uploadMyAgentPhoto(
  _prevState: { error?: string; saved?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; saved?: boolean } | null> {
  const agent = await getMyAgentRecord();
  if (!agent) return { error: "Only an approved agent can do that." };

  const result = await replaceAgentPhoto(agent.id, formData.get("photo"));
  if ("error" in result) return result;

  revalidatePath("/dashboard/agent");
  if (agent.pageSlug) revalidatePath(`/${agent.pageSlug}`);
  return { saved: true };
}
