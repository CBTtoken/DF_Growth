"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireDeskUser } from "@/lib/desk/auth";
import { splitCapture } from "@/lib/desk/capture";
import { listItems, listVentures, untriagedItems } from "@/lib/desk/queries";
import { proposeTriage, type TriageProposal } from "@/lib/desk/triage";
import { nextDueDate, type DeskItem } from "@/lib/desk/types";

// Server Actions are POST endpoints in their own right, so each one checks
// the session itself rather than relying on the layout that rendered the
// form.
//
// The screens call most of these from a transition and update themselves
// first, so what happens here is reconciliation, not the thing the operator
// is waiting for.

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function refresh() {
  revalidatePath("/desk", "layout");
}

// Capture. A blank line separates items, a single line break does not, and a
// line that opens with a bullet or a number starts a new one.
export async function captureItems(
  _prev: { saved?: number; error?: string } | null,
  formData: FormData
): Promise<{ saved?: number; error?: string }> {
  await requireDeskUser();

  const titles = splitCapture(String(formData.get("dump") ?? ""));
  if (titles.length === 0) return { error: "Nothing to save." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("desk_items").insert(titles.map((title) => ({ title })));

  if (error) {
    console.error("desk: capture failed", error);
    // The text stays in the box on failure. Losing what was typed is the one
    // thing capture may never do.
    return { error: "Did not save, so nothing was lost. Try again." };
  }

  refresh();
  return { saved: titles.length };
}

export type SortState = {
  proposals?: TriageProposal[];
  error?: string;
  accepted?: number;
  dropped?: number;
} | null;

export async function sortItems(_prev: SortState, _formData: FormData): Promise<SortState> {
  await requireDeskUser();

  const items = await untriagedItems();
  if (items.length === 0) return { error: "Everything already has a next action." };

  const ventures = (await listVentures()).map((v) => v.name);
  const { proposals, error, dropped } = await proposeTriage(items, ventures);

  if (error) return { error };
  if (proposals.length === 0) return { error: "Nothing came back to review." };

  return { proposals, dropped };
}

export type AcceptRow = {
  id: string;
  parts: {
    title: string;
    area: string;
    stream: string;
    venture: string;
    effort: string;
    next_action: string;
  }[];
};

// Accept. The rows come from the screen, so a field the operator edited is
// what gets written, not what the model proposed.
//
// A single part updates the item in place. Several parts turn one capture
// into several items: the original keeps the first span and the rest are
// inserted alongside it, each carrying its own fields.
export async function acceptTriage(rows: AcceptRow[]): Promise<{ accepted: number; created: number }> {
  await requireDeskUser();
  const supabase = createAdminClient();

  let accepted = 0;
  let created = 0;

  for (const row of rows) {
    const parts = row.parts.filter((part) => part.next_action.trim().length > 0);
    // A row with no next action anywhere is skipped rather than saved empty,
    // so it stays in the untriaged pile for the next run.
    if (parts.length === 0) continue;

    const shape = (part: AcceptRow["parts"][number]) => ({
      title: part.title,
      next_action: part.next_action.trim(),
      venture: part.venture.trim() || null,
      area: part.area === "personal" ? "personal" : "business",
      stream: part.stream === "client" || part.stream === "life" ? part.stream : "own",
      effort: part.effort === "deep" ? "deep" : "shallow",
      updated_at: new Date().toISOString(),
    });

    const [first, ...rest] = parts;

    const { error } = await supabase.from("desk_items").update(shape(first)).eq("id", row.id);
    if (error) {
      console.error("desk: accept failed", error);
      continue;
    }
    accepted++;

    if (rest.length > 0) {
      const { error: insertError } = await supabase.from("desk_items").insert(rest.map(shape));
      if (insertError) console.error("desk: split insert failed", insertError);
      else created += rest.length;
    }
  }

  refresh();
  return { accepted, created };
}

// Done. A recurring item does not end here: it is closed and its next
// instance is created on the next date, which is the whole reason recurrence
// exists.
export async function markDone(id: string): Promise<void> {
  await requireDeskUser();
  const supabase = createAdminClient();

  const { data } = await supabase.from("desk_items").select("*").eq("id", id).single();
  const item = data as DeskItem | null;

  await supabase
    .from("desk_items")
    .update({ status: "done", done_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id);

  if (item && item.recurrence !== "none") {
    const due = nextDueDate(item.due_date, item.recurrence);
    await supabase.from("desk_items").insert({
      title: item.title,
      area: item.area,
      stream: item.stream,
      venture: item.venture,
      next_action: item.next_action,
      effort: item.effort,
      due_date: due,
      recurrence: item.recurrence,
      notes: item.notes,
    });
  }

  refresh();
}

// Skip bumps the counter, which is what pushes the item down the order.
export async function skipItem(id: string, skipCount: number): Promise<void> {
  await requireDeskUser();
  const supabase = createAdminClient();
  await supabase
    .from("desk_items")
    .update({ skip_count: skipCount + 1, updated_at: new Date().toISOString() })
    .eq("id", id);
  refresh();
}

export async function blockItem(id: string, name: string): Promise<void> {
  await requireDeskUser();
  const who = name.trim();
  if (!who) return;

  const supabase = createAdminClient();
  await supabase
    .from("desk_items")
    .update({ blocked_by: who, blocked_since: today(), updated_at: new Date().toISOString() })
    .eq("id", id);
  refresh();
}

export async function unblockItem(id: string): Promise<void> {
  await requireDeskUser();
  const supabase = createAdminClient();
  await supabase
    .from("desk_items")
    .update({ blocked_by: "me", blocked_since: null, updated_at: new Date().toISOString() })
    .eq("id", id);
  refresh();
}

// Nudge sent. Resets the clock without moving the item, because the point of
// the count is how long since the last push, not how long since the start.
export async function nudgeItem(id: string): Promise<void> {
  await requireDeskUser();
  const supabase = createAdminClient();
  await supabase
    .from("desk_items")
    .update({ blocked_since: today(), updated_at: new Date().toISOString() })
    .eq("id", id);
  refresh();
}

// Notes, editable wherever an item is open, without a separate screen.
export async function saveNote(id: string, notes: string): Promise<void> {
  await requireDeskUser();
  const supabase = createAdminClient();
  await supabase
    .from("desk_items")
    .update({ notes: notes.trim() || null, updated_at: new Date().toISOString() })
    .eq("id", id);
  refresh();
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
  const stream = String(formData.get("stream") ?? "own");

  const patch: Record<string, unknown> = {
    title,
    area: String(formData.get("area") ?? "business") === "personal" ? "personal" : "business",
    stream: stream === "client" || stream === "life" ? stream : "own",
    venture: String(formData.get("venture") ?? "").trim() || null,
    next_action: String(formData.get("next_action") ?? "").trim() || null,
    effort: String(formData.get("effort") ?? "shallow") === "deep" ? "deep" : "shallow",
    blocked_by: blockedBy,
    // Starting to wait on someone starts the clock; handing it back to
    // himself stops it.
    blocked_since: blockedBy === "me" ? null : existingSince || today(),
    due_date: String(formData.get("due_date") ?? "").trim() || null,
    recurrence: String(formData.get("recurrence") ?? "none"),
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

  refresh();
  return { saved: true };
}

// What done looks like for a venture. The roadmap, without dates or a plan.
export async function saveVenture(name: string, endState: string, stream: string): Promise<void> {
  await requireDeskUser();
  const supabase = createAdminClient();

  await supabase.from("desk_ventures").upsert(
    {
      name,
      end_state: endState.trim() || null,
      stream: stream === "client" || stream === "life" ? stream : "own",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "name" }
  );

  // The stream lives on the items too, so changing it here moves the whole
  // venture rather than only its heading.
  await supabase.from("desk_items").update({ stream }).eq("venture", name);
  refresh();
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

// The go-away section. Free text under headings he names himself.
export async function saveGoAwayNote(id: string, heading: string, body: string): Promise<void> {
  await requireDeskUser();
  const supabase = createAdminClient();
  await supabase
    .from("desk_notes")
    .update({ heading: heading.trim() || "Untitled", body, updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/desk/go-away");
}

export async function addGoAwayNote(heading: string): Promise<void> {
  await requireDeskUser();
  const supabase = createAdminClient();
  await supabase.from("desk_notes").insert({ heading: heading.trim() || "Untitled", body: "" });
  revalidatePath("/desk/go-away");
}

export async function deleteGoAwayNote(id: string): Promise<void> {
  await requireDeskUser();
  const supabase = createAdminClient();
  await supabase.from("desk_notes").delete().eq("id", id);
  revalidatePath("/desk/go-away");
}

// Think. No status, no due date, nothing counting them.
export async function addIdea(board: string, heading: string): Promise<void> {
  await requireDeskUser();
  const supabase = createAdminClient();
  await supabase
    .from("desk_ideas")
    .insert({ board: board.trim() || "Ideas", heading: heading.trim() || null, body: "" });
  revalidatePath("/desk/think");
}

export async function saveIdea(id: string, heading: string, body: string, board: string): Promise<void> {
  await requireDeskUser();
  const supabase = createAdminClient();
  await supabase
    .from("desk_ideas")
    .update({
      heading: heading.trim() || null,
      body,
      board: board.trim() || "Ideas",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  revalidatePath("/desk/think");
}

export async function deleteIdea(id: string): Promise<void> {
  await requireDeskUser();
  const supabase = createAdminClient();
  await supabase.from("desk_ideas").delete().eq("id", id);
  revalidatePath("/desk/think");
}

// The one bridge out of Think. The idea stays where it is; a copy of it
// becomes work.
export async function ideaToItem(id: string): Promise<void> {
  await requireDeskUser();
  const supabase = createAdminClient();

  const { data } = await supabase.from("desk_ideas").select("*").eq("id", id).single();
  if (!data) return;

  const title = [data.heading, data.body].filter(Boolean).join("\n").trim();
  if (!title) return;

  const { data: created } = await supabase
    .from("desk_items")
    .insert({ title, notes: `From Think, board: ${data.board}` })
    .select("id")
    .single();

  if (created) {
    await supabase.from("desk_ideas").update({ became_item_id: created.id }).eq("id", id);
  }

  refresh();
}

// The handoff draft. Much of what is in The Desk is work for Claude Code, not
// for the operator, and this turns the CC group into the shape a handoff
// starts from. It is a draft: context and acceptance criteria are written by
// a human.
export async function draftHandoff(who: string): Promise<string> {
  await requireDeskUser();

  const items = (await listItems({ status: "open", blockedByMe: false })).filter(
    (item) => item.blocked_by.toLowerCase() === who.toLowerCase()
  );

  if (items.length === 0) return "";

  const byVenture = new Map<string, DeskItem[]>();
  for (const item of items) {
    const key = item.venture?.trim() || "Unfiled";
    byVenture.set(key, [...(byVenture.get(key) ?? []), item]);
  }

  const lines: string[] = [];
  lines.push(`# Handoff draft, ${new Date().toISOString().slice(0, 10)}`);
  lines.push("");
  lines.push("Context and acceptance criteria still to be written by a human.");
  lines.push("");

  for (const venture of [...byVenture.keys()].sort()) {
    lines.push(`## ${venture}`);
    lines.push("");
    for (const item of byVenture.get(venture)!) {
      lines.push(`### ${item.title}`);
      if (item.next_action) lines.push(`Next step: ${item.next_action}`);
      if (item.notes) lines.push(`Notes: ${item.notes}`);
      lines.push(`Effort: ${item.effort}`);
      lines.push("");
    }
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Sprints. A bundle of work with a brief attached, aimed at Claude Code.
// ---------------------------------------------------------------------------

export async function createSprint(name: string): Promise<void> {
  await requireDeskUser();
  const supabase = createAdminClient();
  await supabase.from("desk_sprints").insert({ name: name.trim() || "Untitled sprint" });
  revalidatePath("/desk/sprints");
}

export async function saveSprint(
  id: string,
  patch: { name?: string; goal?: string; context?: string }
): Promise<void> {
  await requireDeskUser();
  const supabase = createAdminClient();
  await supabase
    .from("desk_sprints")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/desk/sprints");
}

export async function setSprintItems(sprintId: string, itemIds: string[]): Promise<void> {
  await requireDeskUser();
  const supabase = createAdminClient();

  // Anything dropped goes back to the general pool rather than disappearing.
  await supabase.from("desk_items").update({ sprint_id: null }).eq("sprint_id", sprintId);
  if (itemIds.length > 0) {
    await supabase.from("desk_items").update({ sprint_id: sprintId }).in("id", itemIds);
  }

  refresh();
}

export async function addToSprint(itemId: string, sprintId: string | null): Promise<void> {
  await requireDeskUser();
  const supabase = createAdminClient();
  await supabase
    .from("desk_items")
    .update({ sprint_id: sprintId, updated_at: new Date().toISOString() })
    .eq("id", itemId);
  refresh();
}

// Handing over. The items become CC's, which takes them out of the Today
// rotation and puts them on Waiting On under CC, where their age is visible
// like anything else somebody else is holding.
export async function handOverSprint(id: string): Promise<void> {
  await requireDeskUser();
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  await supabase
    .from("desk_sprints")
    .update({ status: "handed", handed_at: now, updated_at: now })
    .eq("id", id);

  await supabase
    .from("desk_items")
    .update({ blocked_by: "CC", blocked_since: today(), updated_at: now })
    .eq("sprint_id", id)
    .eq("status", "open");

  refresh();
}

// Shipped. Everything in it is done, which is the one moment a batch of items
// leaves the list together.
export async function shipSprint(id: string): Promise<void> {
  await requireDeskUser();
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  await supabase
    .from("desk_sprints")
    .update({ status: "shipped", shipped_at: now, updated_at: now })
    .eq("id", id);

  await supabase
    .from("desk_items")
    .update({ status: "done", done_at: now, blocked_by: "me", blocked_since: null, updated_at: now })
    .eq("sprint_id", id)
    .eq("status", "open");

  refresh();
}

export async function deleteSprint(id: string): Promise<void> {
  await requireDeskUser();
  const supabase = createAdminClient();
  // The items survive; only the bundle goes.
  await supabase.from("desk_items").update({ sprint_id: null }).eq("sprint_id", id);
  await supabase.from("desk_sprints").delete().eq("id", id);
  revalidatePath("/desk/sprints");
}

// An item that should never have been on the list at all. Not done, not
// parked, not killed: a mistake, and the one rule was written about
// abandoning work, not about typos.
export async function removeItem(id: string): Promise<void> {
  await requireDeskUser();
  const supabase = createAdminClient();
  await supabase.from("desk_items").delete().eq("id", id);
  refresh();
}
