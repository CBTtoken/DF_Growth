import { createAdminClient } from "@/lib/supabase/admin";
import type { DeskAsset, DeskItem, DeskState } from "@/lib/desk/types";

// Every read and write goes through the service-role client, behind the
// single-user session gate. The tables have RLS on and no policies, so there
// is no path to them from a browser.

export async function listItems(filter?: {
  status?: DeskItem["status"];
  blockedByMe?: boolean;
}): Promise<DeskItem[]> {
  const supabase = createAdminClient();
  let query = supabase.from("desk_items").select("*");

  if (filter?.status) query = query.eq("status", filter.status);
  if (filter?.blockedByMe === true) query = query.eq("blocked_by", "me");
  if (filter?.blockedByMe === false) query = query.neq("blocked_by", "me");

  const { data, error } = await query
    .order("created_at", { ascending: true })
    .limit(2000);

  if (error) {
    console.error("desk: listItems failed", error);
    return [];
  }
  return (data ?? []) as DeskItem[];
}

export async function getItem(id: string): Promise<DeskItem | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("desk_items").select("*").eq("id", id).single();
  if (error) {
    console.error("desk: getItem failed", error);
    return null;
  }
  return data as DeskItem;
}

// The one item. Not a list, not a shortlist, not a list of one with the
// others below it.
//
// Wrecked and Sharp both take the oldest open item blocked by nobody but the
// operator, split on effort. Normal ignores effort and goes by due date.
// Skipped items sort later everywhere, which is what makes Skip a real
// action rather than a way of hiding from the same card forever.
export async function nextItem(state: DeskState, excludeId?: string): Promise<DeskItem | null> {
  const supabase = createAdminClient();

  let query = supabase
    .from("desk_items")
    .select("*")
    .eq("status", "open")
    .eq("blocked_by", "me");

  if (state === "wrecked") query = query.eq("effort", "shallow");
  if (state === "sharp") query = query.eq("effort", "deep");
  if (excludeId) query = query.neq("id", excludeId);

  query = query.order("skip_count", { ascending: true });
  if (state === "normal") {
    query = query.order("due_date", { ascending: true, nullsFirst: false });
  }
  query = query.order("created_at", { ascending: true }).limit(1);

  const { data, error } = await query;
  if (error) {
    console.error("desk: nextItem failed", error);
    return null;
  }
  return (data?.[0] as DeskItem) ?? null;
}

// What was marked done today, in the operator's own timezone. South Africa
// has no daylight saving, so a fixed +02:00 offset is correct all year and
// avoids a timezone library for one query.
export async function doneToday(): Promise<DeskItem[]> {
  const supabase = createAdminClient();
  const now = new Date();
  const sast = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const startOfDaySast = new Date(
    Date.UTC(sast.getUTCFullYear(), sast.getUTCMonth(), sast.getUTCDate()) - 2 * 60 * 60 * 1000
  );

  const { data, error } = await supabase
    .from("desk_items")
    .select("*")
    .eq("status", "done")
    .gte("done_at", startOfDaySast.toISOString())
    .order("done_at", { ascending: true });

  if (error) {
    console.error("desk: doneToday failed", error);
    return [];
  }
  return (data ?? []) as DeskItem[];
}

export async function listAssets(): Promise<DeskAsset[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("desk_assets")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("desk: listAssets failed", error);
    return [];
  }
  return (data ?? []) as DeskAsset[];
}

// Items with no next action yet: the input to Sort, and the only thing the
// LLM ever sees.
export async function untriagedItems(): Promise<DeskItem[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("desk_items")
    .select("*")
    .is("next_action", null)
    .eq("status", "open")
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) {
    console.error("desk: untriagedItems failed", error);
    return [];
  }
  return (data ?? []) as DeskItem[];
}
