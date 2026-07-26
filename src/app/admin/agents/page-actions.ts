"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminEmail } from "@/lib/auth/require-admin";
import { checkSlugAvailable, slugTakenMessage } from "@/lib/slug-namespace";
import { agentPageSchema, agentCopyIntakeSchema } from "@/lib/schemas/agents";
import { replaceAgentPhoto, clearAgentPhoto } from "@/lib/agent-page/photo";
import { agentContentUpdate, readContentFields } from "@/lib/agent-page/form";
import { draftAndSaveAgentCopy } from "@/lib/agent-page/copy";

// Agent Programme Phase 1 Sec 1.10, the admin half of agent page setup:
// the slug, the go-live decision and "active since". The content half
// (copy, colour, services, photo) is shared with the agent's own dashboard
// via lib/agent-page/form.ts, since Dewald moved agent self-editing
// forward out of phase 2. Every action here is still admin-gated.

export type AgentPageFormState = { error?: string; saved?: boolean } | null;

export async function saveAgentPage(
  agentId: string,
  _prevState: AgentPageFormState,
  formData: FormData
): Promise<AgentPageFormState> {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) return { error: "Not allowed." };

  const parsed = agentPageSchema.safeParse({
    ...readContentFields(formData),
    pageSlug: formData.get("pageSlug"),
    activeSince: formData.get("activeSince"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the fields and try again." };
  }

  const values = parsed.data;

  // Sec 1.2: "Enforce at creation with a clear error message." Checked on
  // every save, not just the first, since a slug can be edited later and
  // the namespace can have gained a business page in between.
  const availability = await checkSlugAvailable(values.pageSlug, { ignoreAgentId: agentId });
  if (availability.taken) {
    return { error: slugTakenMessage(availability) ?? "That web address is taken." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("agents")
    .update({
      ...agentContentUpdate(values, formData),
      page_slug: values.pageSlug,
      active_since: values.activeSince || null,
    })
    .eq("id", agentId);

  if (error) {
    console.error("Failed to save agent page", error);
    return { error: "Could not save. Please try again." };
  }

  revalidatePath(`/admin/agents/${agentId}`);
  revalidatePath(`/${values.pageSlug}`);
  return { saved: true };
}

// Sec 1.6: the questions in, drafted copy out. Same shared helper the
// agent's own dashboard uses, so a draft written for an agent and a draft
// an agent writes for themselves behave identically.
export async function draftAgentPageCopy(
  agentId: string,
  _prevState: AgentPageFormState,
  formData: FormData
): Promise<AgentPageFormState> {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) return { error: "Not allowed." };

  const parsed = agentCopyIntakeSchema.safeParse({
    before: formData.get("before"),
    why: formData.get("why"),
    who: formData.get("who"),
    area: formData.get("area"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Answer at least one of these." };
  }

  const result = await draftAndSaveAgentCopy(agentId, parsed.data);
  if (result.error) return { error: result.error };

  revalidatePath(`/admin/agents/${agentId}`);
  return { saved: true };
}

// Sec 1.2: a page with no slug has nowhere to go live, so publishing is
// gated on one existing rather than silently producing an unreachable
// "live" page.
export async function setAgentPageStatus(agentId: string, status: "draft" | "live") {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) return;

  const admin = createAdminClient();
  const { data: agent } = await admin
    .from("agents")
    .select("page_slug, status")
    .eq("id", agentId)
    .maybeSingle();

  if (!agent?.page_slug) return;
  // getLiveAgentPage also requires an approved agent, so publishing a
  // page for a pending or rejected one would produce a "live" page that
  // still 404s. Refused here instead.
  if (agent.status !== "approved") return;

  await admin.from("agents").update({ page_status: status }).eq("id", agentId);

  revalidatePath(`/admin/agents/${agentId}`);
  revalidatePath(`/${agent.page_slug}`);
}

export async function uploadAgentPhoto(
  agentId: string,
  _prevState: AgentPageFormState,
  formData: FormData
): Promise<AgentPageFormState> {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) return { error: "Not allowed." };

  const result = await replaceAgentPhoto(agentId, formData.get("photo"));
  if ("error" in result) return result;

  revalidatePath(`/admin/agents/${agentId}`);
  return { saved: true };
}

export async function removeAgentPhoto(agentId: string) {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) return;

  await clearAgentPhoto(agentId);
  revalidatePath(`/admin/agents/${agentId}`);
}
