"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireDeskUser } from "@/lib/desk/auth";
import { untriagedItems } from "@/lib/desk/queries";
import { proposeTriage, type TriageProposal } from "@/lib/desk/triage";

// Server Actions are POST endpoints in their own right, so each one checks
// the session itself rather than relying on the layout that rendered the
// form.

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// Capture. The only required field is the title, and a multi-line paste
// becomes one item per line: no parsing, no structure, nothing clever.
export async function captureItems(
  _prev: { saved?: number; error?: string } | null,
  formData: FormData
): Promise<{ saved?: number; error?: string }> {
  await requireDeskUser();

  const raw = String(formData.get("dump") ?? "");
  const titles = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (titles.length === 0) return { error: "Nothing to save." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("desk_items").insert(titles.map((title) => ({ title })));

  if (error) {
    console.error("desk: capture failed", error);
    return { error: "Did not save. Try again." };
  }

  revalidatePath("/desk", "layout");
  return { saved: titles.length };
}

export type SortState = { proposals?: TriageProposal[]; error?: string; accepted?: number } | null;

// Sort. One batched call for the whole set of untriaged items, and nothing
// is written until Accept.
export async function sortItems(_prev: SortState, _formData: FormData): Promise<SortState> {
  await requireDeskUser();

  const items = await untriagedItems();
  if (items.length === 0) return { error: "Everything already has a next action." };

  const supabase = createAdminClient();
  const { data: ventureRows } = await supabase
    .from("desk_items")
    .select("venture")
    .not("venture", "is", null)
    .limit(500);

  const ventures = [...new Set((ventureRows ?? []).map((row) => row.venture as string))].sort();

  const { proposals, error } = await proposeTriage(items, ventures);
  if (error) return { error };
  if (proposals.length === 0) return { error: "Nothing came back to review." };

  return { proposals };
}

// Accept. Reads the edited rows out of the form, so a field the operator
// changed on screen is what gets written, not what the model proposed.
export async function acceptTriage(_prev: SortState, formData: FormData): Promise<SortState> {
  await requireDeskUser();

  const ids = formData.getAll("id").map(String);
  const supabase = createAdminClient();
  let accepted = 0;

  for (const id of ids) {
    const nextAction = String(formData.get(`next_action:${id}`) ?? "").trim();
    const venture = String(formData.get(`venture:${id}`) ?? "").trim();
    const area = String(formData.get(`area:${id}`) ?? "business");
    const effort = String(formData.get(`effort:${id}`) ?? "shallow");

    // A row with no next action is skipped rather than saved empty, so it
    // stays in the untriaged pile for the next run.
    if (!nextAction) continue;

    const { error } = await supabase
      .from("desk_items")
      .update({
        next_action: nextAction,
        venture: venture || null,
        area: area === "personal" ? "personal" : "business",
        effort: effort === "deep" ? "deep" : "shallow",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("desk: accept failed", error);
      continue;
    }
    accepted++;
  }

  revalidatePath("/desk", "layout");
  return { accepted };
}

export async function markDone(formData: FormData) {
  await requireDeskUser();
  const id = String(formData.get("id") ?? "");
  const state = String(formData.get("state") ?? "normal");

  const supabase = createAdminClient();
  await supabase
    .from("desk_items")
    .update({ status: "done", done_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id);

  redirect(`/desk/today?state=${state}`);
}

// Skip bumps the counter, which is what pushes the item down the order, and
// hands back the next one immediately. The skipped id travels in the URL so
// the very next card is guaranteed to be a different item even when only two
// are left.
export async function skipItem(formData: FormData) {
  await requireDeskUser();
  const id = String(formData.get("id") ?? "");
  const state = String(formData.get("state") ?? "normal");
  const count = Number(formData.get("skip_count") ?? 0);

  const supabase = createAdminClient();
  await supabase
    .from("desk_items")
    .update({ skip_count: count + 1, updated_at: new Date().toISOString() })
    .eq("id", id);

  redirect(`/desk/today?state=${state}&skipped=${id}`);
}

export async function blockItem(formData: FormData) {
  await requireDeskUser();
  const id = String(formData.get("id") ?? "");
  const state = String(formData.get("state") ?? "normal");
  const name = String(formData.get("blocked_by") ?? "").trim();

  if (!name) redirect(`/desk/today?state=${state}`);

  const supabase = createAdminClient();
  await supabase
    .from("desk_items")
    .update({ blocked_by: name, blocked_since: today(), updated_at: new Date().toISOString() })
    .eq("id", id);

  redirect(`/desk/today?state=${state}`);
}

export async function unblockItem(formData: FormData) {
  await requireDeskUser();
  const id = String(formData.get("id") ?? "");

  const supabase = createAdminClient();
  await supabase
    .from("desk_items")
    .update({ blocked_by: "me", blocked_since: null, updated_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/desk/waiting");
}

// Nudge sent. Resets the clock without moving the item, because the point of
// the count is how long since the last push, not how long since the start.
export async function nudgeItem(formData: FormData) {
  await requireDeskUser();
  const id = String(formData.get("id") ?? "");

  const supabase = createAdminClient();
  await supabase
    .from("desk_items")
    .update({ blocked_since: today(), updated_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/desk/waiting");
}

// The full edit form. This is also where the one rule lives: an item leaves
// the list by being done, parked with a written trigger, or killed with a
// date. The database refuses the bad cases too, so this message is the
// friendly half of a constraint rather than the whole of it.
export async function saveItem(
  _prev: { error?: string; saved?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; saved?: boolean }> {
  await requireDeskUser();

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "open");
  const parkTrigger = String(formData.get("park_trigger") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();

  if (!title) return { error: "An item needs a title." };

  if (status === "parked" && !parkTrigger) {
    return { error: "Parked needs a trigger: what has to be true for this to come back?" };
  }

  const blockedBy = String(formData.get("blocked_by") ?? "me").trim() || "me";
  const existingSince = String(formData.get("blocked_since") ?? "").trim();

  const patch: Record<string, unknown> = {
    title,
    area: String(formData.get("area") ?? "business") === "personal" ? "personal" : "business",
    venture: String(formData.get("venture") ?? "").trim() || null,
    next_action: String(formData.get("next_action") ?? "").trim() || null,
    effort: String(formData.get("effort") ?? "shallow") === "deep" ? "deep" : "shallow",
    blocked_by: blockedBy,
    // Starting to wait on someone starts the clock; handing it back to
    // himself stops it.
    blocked_since: blockedBy === "me" ? null : existingSince || today(),
    due_date: String(formData.get("due_date") ?? "").trim() || null,
    status,
    park_trigger: status === "parked" ? parkTrigger : null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    updated_at: new Date().toISOString(),
  };

  if (status === "killed") patch.killed_at = new Date().toISOString();
  if (status === "done") patch.done_at = new Date().toISOString();

  const supabase = createAdminClient();
  const { error } = await supabase.from("desk_items").update(patch).eq("id", id);

  if (error) {
    console.error("desk: saveItem failed", error);
    return { error: "Did not save. Check the fields and try again." };
  }

  revalidatePath("/desk", "layout");
  return { saved: true };
}

function assetPatch(formData: FormData): Record<string, unknown> {
  const cost = String(formData.get("cost_zar_monthly") ?? "").trim();

  return {
    name: String(formData.get("name") ?? "").trim(),
    type: String(formData.get("type") ?? "other"),
    provider: String(formData.get("provider") ?? "").trim() || null,
    area: String(formData.get("area") ?? "business") === "personal" ? "personal" : "business",
    cost_zar_monthly: cost === "" ? null : Number(cost),
    billing_cycle: String(formData.get("billing_cycle") ?? "unknown"),
    renewal_date: String(formData.get("renewal_date") ?? "").trim() || null,
    where_login_lives: String(formData.get("where_login_lives") ?? "").trim() || null,
    status: String(formData.get("status") ?? "unknown"),
    notes: String(formData.get("notes") ?? "").trim() || null,
    updated_at: new Date().toISOString(),
  };
}

export async function saveAsset(formData: FormData) {
  await requireDeskUser();
  const id = String(formData.get("id") ?? "");
  const patch = assetPatch(formData);
  if (!patch.name) return;

  const supabase = createAdminClient();
  await supabase.from("desk_assets").update(patch).eq("id", id);
  revalidatePath("/desk/register");
}

export async function addAsset(formData: FormData) {
  await requireDeskUser();
  const patch = assetPatch(formData);
  if (!patch.name) return;

  const supabase = createAdminClient();
  await supabase.from("desk_assets").insert(patch);
  revalidatePath("/desk/register");
}

export async function deleteAsset(formData: FormData) {
  await requireDeskUser();
  const id = String(formData.get("id") ?? "");

  const supabase = createAdminClient();
  await supabase.from("desk_assets").delete().eq("id", id);
  revalidatePath("/desk/register");
}
