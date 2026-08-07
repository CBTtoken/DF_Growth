"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminEmail } from "@/lib/auth/require-admin";

// Server actions for the saved answer library, the system copy and the
// retention settings.

const PATH = "/admin/whatsapp/answers";
const GROUPS = ["member", "join", "job", "general"];

async function isAdmin(): Promise<boolean> {
  const admin = await requireAdminEmail();
  return !("error" in admin);
}

export type AnswerFormResult = { ok: true } | { ok: false; message: string } | null;

export async function createAnswer(_prev: AnswerFormResult, formData: FormData): Promise<AnswerFormResult> {
  if (!(await isAdmin())) return { ok: false, message: "Not signed in as an admin." };

  const buttonLabel = String(formData.get("button_label") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const group = String(formData.get("group_slug") ?? "general");

  if (!buttonLabel) return { ok: false, message: "Give the answer a button label." };
  if (buttonLabel.length > 20) return { ok: false, message: "Button labels can be 20 characters at most, WhatsApp cuts off anything longer." };
  if (!body) return { ok: false, message: "Write the full reply text." };
  if (!GROUPS.includes(group)) return { ok: false, message: "Unknown group." };

  const admin = createAdminClient();
  const { data: last } = await admin
    .from("wa_saved_answers")
    .select("sort_order")
    .eq("group_slug", group)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await admin.from("wa_saved_answers").insert({
    group_slug: group,
    button_label: buttonLabel,
    body,
    sort_order: (last?.sort_order ?? 0) + 1,
  });
  if (error) return { ok: false, message: "Could not save the answer, try again." };

  revalidatePath(PATH);
  return { ok: true };
}

export async function updateAnswer(answerId: string, _prev: AnswerFormResult, formData: FormData): Promise<AnswerFormResult> {
  if (!(await isAdmin())) return { ok: false, message: "Not signed in as an admin." };

  const buttonLabel = String(formData.get("button_label") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const group = String(formData.get("group_slug") ?? "general");

  if (!buttonLabel) return { ok: false, message: "Give the answer a button label." };
  if (buttonLabel.length > 20) return { ok: false, message: "Button labels can be 20 characters at most, WhatsApp cuts off anything longer." };
  if (!body) return { ok: false, message: "Write the full reply text." };
  if (!GROUPS.includes(group)) return { ok: false, message: "Unknown group." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("wa_saved_answers")
    .update({ button_label: buttonLabel, body, group_slug: group, updated_at: new Date().toISOString() })
    .eq("id", answerId);
  if (error) return { ok: false, message: "Could not save the change, try again." };

  revalidatePath(PATH);
  return { ok: true };
}

export async function deleteAnswer(answerId: string): Promise<void> {
  if (!(await isAdmin())) return;
  const admin = createAdminClient();
  await admin.from("wa_saved_answers").delete().eq("id", answerId);
  revalidatePath(PATH);
}

// Up/down ordering: swap sort_order with the neighbour. Buttons rather
// than drag and drop, which does not work well on a phone.
export async function moveAnswer(answerId: string, direction: "up" | "down"): Promise<void> {
  if (!(await isAdmin())) return;
  const admin = createAdminClient();

  const { data: answer } = await admin
    .from("wa_saved_answers")
    .select("id, group_slug, sort_order")
    .eq("id", answerId)
    .maybeSingle();
  if (!answer) return;

  const neighbourQuery = admin
    .from("wa_saved_answers")
    .select("id, sort_order")
    .eq("group_slug", answer.group_slug)
    .limit(1);

  const { data: neighbour } = await (direction === "up"
    ? neighbourQuery.lt("sort_order", answer.sort_order).order("sort_order", { ascending: false })
    : neighbourQuery.gt("sort_order", answer.sort_order).order("sort_order", { ascending: true })
  ).maybeSingle();
  if (!neighbour) return;

  await admin.from("wa_saved_answers").update({ sort_order: neighbour.sort_order }).eq("id", answer.id);
  await admin.from("wa_saved_answers").update({ sort_order: answer.sort_order }).eq("id", neighbour.id);
  revalidatePath(PATH);
}

// The system's own messages. Saving an edit marks the row unapproved again
// unless the approve box was ticked in the same save: an edited sentence
// is a new sentence, and only Dewald's tick makes it approved.
export async function updateBotCopy(slug: string, _prev: AnswerFormResult, formData: FormData): Promise<AnswerFormResult> {
  if (!(await isAdmin())) return { ok: false, message: "Not signed in as an admin." };

  const body = String(formData.get("body") ?? "").trim();
  const approved = formData.get("approved") === "on";
  if (!body) return { ok: false, message: "The message text cannot be empty." };
  if (slug.includes("button") && body.length > 20) {
    return { ok: false, message: "Button labels can be 20 characters at most, WhatsApp cuts off anything longer." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("wa_bot_copy")
    .update({ body, approved, updated_at: new Date().toISOString() })
    .eq("slug", slug);
  if (error) return { ok: false, message: "Could not save, try again." };

  revalidatePath(PATH);
  return { ok: true };
}

export async function saveSettings(_prev: AnswerFormResult, formData: FormData): Promise<AnswerFormResult> {
  if (!(await isAdmin())) return { ok: false, message: "Not signed in as an admin." };

  const retentionHours = Number(formData.get("retention_hours"));
  const autoResolveDays = Number(formData.get("auto_resolve_days"));
  if (!Number.isInteger(retentionHours) || retentionHours < 1) {
    return { ok: false, message: "Retention must be a whole number of hours, 1 or more." };
  }
  if (!Number.isInteger(autoResolveDays) || autoResolveDays < 1) {
    return { ok: false, message: "Auto-finish must be a whole number of days, 1 or more." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("wa_settings")
    .update({ retention_hours: retentionHours, auto_resolve_days: autoResolveDays, updated_at: new Date().toISOString() })
    .eq("id", true);
  if (error) return { ok: false, message: "Could not save, try again." };

  revalidatePath(PATH);
  return { ok: true };
}
