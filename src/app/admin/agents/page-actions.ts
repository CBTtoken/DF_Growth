"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminEmail } from "@/lib/auth/require-admin";
import { checkSlugAvailable, slugTakenMessage } from "@/lib/slug-namespace";
import { agentPageSchema, agentCopyIntakeSchema } from "@/lib/schemas/agents";
import { generateAgentPageCopy } from "@/lib/ai/agent-page-copy";
import { replaceAgentPhoto, clearAgentPhoto } from "@/lib/agent-page/photo";
import { stripEmDashes } from "@/lib/text";
import type { AgentService } from "@/lib/agent-page/data";

// Agent Programme Phase 1 Sec 1.10: "Add agent page fields to the existing
// admin agent view so Dewald can populate them. Agent self-editing of copy
// and colour comes with the dashboard in phase 2." Every action here is
// admin-gated; none of it is reachable by an agent yet.

export type AgentPageFormState = { error?: string; saved?: boolean } | null;

// Sec 1.7: three services, same shape as growth_clients.packages. Read out
// of flat indexed form fields rather than a JSON textarea, so the admin
// form stays a form.
function readServices(formData: FormData): AgentService[] {
  const services: AgentService[] = [];
  for (let i = 0; i < 3; i++) {
    const name = String(formData.get(`serviceName${i}`) ?? "").trim();
    if (!name) continue;
    const type = String(formData.get(`serviceType${i}`) ?? "package");
    services.push({
      name: stripEmDashes(name).slice(0, 80),
      price: stripEmDashes(String(formData.get(`servicePrice${i}`) ?? "").trim()).slice(0, 40),
      description: stripEmDashes(String(formData.get(`serviceDescription${i}`) ?? "").trim()).slice(0, 300),
      type: type === "special" || type === "discount" ? type : "package",
    });
  }
  return services;
}

export async function saveAgentPage(
  agentId: string,
  _prevState: AgentPageFormState,
  formData: FormData
): Promise<AgentPageFormState> {
  const admin_ = await requireAdminEmail();
  if ("error" in admin_) return { error: "Not allowed." };

  const parsed = agentPageSchema.safeParse({
    pageSlug: formData.get("pageSlug"),
    accentColor: formData.get("accentColor"),
    town: formData.get("town"),
    whatsappNumber: formData.get("whatsappNumber"),
    activeSince: formData.get("activeSince"),
    heroPromise: formData.get("heroPromise"),
    storyText: formData.get("storyText"),
    offerText: formData.get("offerText"),
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
      page_slug: values.pageSlug,
      accent_color: values.accentColor,
      town: values.town || null,
      whatsapp_number: values.whatsappNumber || null,
      active_since: values.activeSince || null,
      // stripEmDashes on write, the same backstop the AI copy path uses:
      // this text can also be typed or pasted by hand, and pasted copy is
      // where em dashes actually come from.
      hero_promise: values.heroPromise ? stripEmDashes(values.heroPromise) : null,
      story_text: values.storyText ? stripEmDashes(values.storyText) : null,
      offer_text: values.offerText ? stripEmDashes(values.offerText) : null,
      services: readServices(formData),
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

// Sec 1.6: the four questions in, drafted copy out. Saves the answers
// first so they survive a failed or rejected draft and can be redrafted
// without asking the agent again.
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
    return { error: parsed.error.issues[0]?.message ?? "Answer all four questions." };
  }

  const admin = createAdminClient();
  const { data: agent } = await admin.from("agents").select("full_name, town").eq("id", agentId).maybeSingle();
  if (!agent) return { error: "Agent not found." };

  await admin
    .from("agents")
    .update({
      intake_before: parsed.data.before,
      intake_why: parsed.data.why,
      intake_who: parsed.data.who,
      intake_area: parsed.data.area,
    })
    .eq("id", agentId);

  const draft = await generateAgentPageCopy({
    fullName: agent.full_name,
    town: agent.town ?? "",
    ...parsed.data,
  });

  if (!draft) {
    // Same contract as the member wizard: a failed draft is never an error
    // state that blocks the page, it just means the copy gets written by
    // hand. The answers above are already saved either way.
    return { error: "The draft did not come back usable. The answers are saved, write the copy by hand or try again." };
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
    return { error: "Drafted the copy but could not save it. Please try again." };
  }

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
