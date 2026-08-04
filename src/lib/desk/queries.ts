import { createAdminClient } from "@/lib/supabase/admin";
import type {
  DeskAsset,
  DeskIdea,
  DeskItem,
  DeskNote,
  DeskSprint,
  DeskState,
  DeskStream,
  DeskVenture,
} from "@/lib/desk/types";

// Every read and write goes through the service-role client, behind the
// single-user session gate. The tables have RLS on and no policies, so there
// is no path to them from a browser.

export async function listItems(filter?: {
  status?: DeskItem["status"];
  blockedByMe?: boolean;
  venture?: string;
}): Promise<DeskItem[]> {
  const supabase = createAdminClient();
  let query = supabase.from("desk_items").select("*");

  if (filter?.status) query = query.eq("status", filter.status);
  if (filter?.blockedByMe === true) query = query.eq("blocked_by", "me");
  if (filter?.blockedByMe === false) query = query.neq("blocked_by", "me");
  if (filter?.venture) query = query.eq("venture", filter.venture);

  const { data, error } = await query.order("created_at", { ascending: true }).limit(2000);

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

// The one item, and the two behind it.
//
// v1 fetched exactly one and made the browser wait for the server on every
// Skip. The screen still shows one card and only one, but the next two ride
// along so Done and Skip can swap instantly and reconcile behind.
export async function nextItems(state: DeskState, exclude: string[] = []): Promise<DeskItem[]> {
  const supabase = createAdminClient();

  let query = supabase.from("desk_items").select("*").eq("status", "open").eq("blocked_by", "me");

  if (state === "wrecked") query = query.eq("effort", "shallow");
  if (state === "sharp") query = query.eq("effort", "deep");
  if (exclude.length > 0) query = query.not("id", "in", `(${exclude.join(",")})`);

  query = query.order("skip_count", { ascending: true });
  if (state === "normal") query = query.order("due_date", { ascending: true, nullsFirst: false });
  query = query.order("created_at", { ascending: true }).limit(3);

  const { data, error } = await query;
  if (error) {
    console.error("desk: nextItems failed", error);
    return [];
  }
  return (data ?? []) as DeskItem[];
}

function startOfDaySast(): string {
  // South Africa has no daylight saving, so a fixed +02:00 offset is correct
  // all year and avoids a timezone library for one query.
  const sast = new Date(Date.now() + 2 * 60 * 60 * 1000);
  return new Date(
    Date.UTC(sast.getUTCFullYear(), sast.getUTCMonth(), sast.getUTCDate()) - 2 * 60 * 60 * 1000
  ).toISOString();
}

export async function doneToday(): Promise<DeskItem[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("desk_items")
    .select("*")
    .eq("status", "done")
    .gte("done_at", startOfDaySast())
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

export async function listVentures(): Promise<DeskVenture[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("desk_ventures")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("desk: listVentures failed", error);
    return [];
  }
  return (data ?? []) as DeskVenture[];
}

export type VentureRollup = {
  name: string;
  stream: DeskStream;
  endState: string | null;
  status: DeskVenture["status"];
  open: number;
  waiting: number;
  withCC: number;
  done: number;
  parked: number;
  deep: number;
  shallow: number;
  known: boolean;
};

// The grouped view's numbers, counted in one pass over the items rather than
// one query per venture.
//
// deep and shallow count only what is open and on him, because the question
// they answer is "what can I take on right now", not "what exists".
export async function ventureRollups(): Promise<VentureRollup[]> {
  const [items, ventures] = await Promise.all([listItems(), listVentures()]);

  const rows = new Map<string, VentureRollup>();
  const seed = (name: string, stream: DeskStream, venture?: DeskVenture) => {
    if (!rows.has(name)) {
      rows.set(name, {
        name,
        stream,
        endState: venture?.end_state ?? null,
        status: venture?.status ?? "active",
        open: 0,
        waiting: 0,
        withCC: 0,
        done: 0,
        parked: 0,
        deep: 0,
        shallow: 0,
        known: Boolean(venture),
      });
    }
    return rows.get(name)!;
  };

  for (const venture of ventures) seed(venture.name, venture.stream, venture);

  for (const item of items) {
    const name = item.venture?.trim() || "Unfiled";
    const row = seed(name, item.stream);

    if (item.status === "done") row.done++;
    else if (item.status === "parked") row.parked++;
    else if (item.status === "open" && item.blocked_by !== "me") {
      row.waiting++;
      // Split out separately because "waiting on CC" answers a different
      // question from "waiting on a person": it is work already handed over.
      if (item.blocked_by.toLowerCase() === "cc") row.withCC++;
    } else if (item.status === "open") {
      row.open++;
      if (item.effort === "deep") row.deep++;
      else row.shallow++;
    }
  }

  return [...rows.values()].sort((a, b) => b.open - a.open || a.name.localeCompare(b.name));
}

export type HorizonRow = {
  kind: "item" | "renewal";
  id: string;
  date: string;
  title: string;
  detail: string | null;
  effort: DeskItem["effort"] | null;
  area: DeskItem["area"];
};

// One flat list of everything dated inside the next 30 days, personal and
// business together. Not a calendar: he has few appointments and many
// deadlines, and a month grid is a browsing tool for the opposite problem.
export async function horizon(days = 30): Promise<HorizonRow[]> {
  const [items, assets] = await Promise.all([listItems({ status: "open" }), listAssets()]);
  const cutoff = new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

  const rows: HorizonRow[] = [];

  for (const item of items) {
    if (!item.due_date || item.due_date > cutoff) continue;
    rows.push({
      kind: "item",
      id: item.id,
      date: item.due_date,
      title: item.title,
      detail: item.venture,
      effort: item.effort,
      area: item.area,
    });
  }

  for (const asset of assets) {
    if (!asset.renewal_date || asset.renewal_date > cutoff || asset.status === "cancel") continue;
    rows.push({
      kind: "renewal",
      id: asset.id,
      date: asset.renewal_date,
      title: `${asset.name} renews`,
      detail: asset.provider,
      effort: null,
      area: asset.area,
    });
  }

  return rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export async function listNotes(): Promise<DeskNote[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("desk_notes")
    .select("*")
    .order("position", { ascending: true });

  if (error) {
    console.error("desk: listNotes failed", error);
    return [];
  }
  return (data ?? []) as DeskNote[];
}

export async function listIdeas(): Promise<DeskIdea[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("desk_ideas")
    .select("*")
    .order("board", { ascending: true })
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("desk: listIdeas failed", error);
    return [];
  }
  return (data ?? []) as DeskIdea[];
}

export async function listSprints(): Promise<DeskSprint[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("desk_sprints")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("desk: listSprints failed", error);
    return [];
  }
  return (data ?? []) as DeskSprint[];
}

export async function getSprint(id: string): Promise<DeskSprint | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("desk_sprints").select("*").eq("id", id).single();
  if (error) {
    console.error("desk: getSprint failed", error);
    return null;
  }
  return data as DeskSprint;
}

export async function sprintItems(sprintId: string): Promise<DeskItem[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("desk_items")
    .select("*")
    .eq("sprint_id", sprintId)
    .order("venture", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("desk: sprintItems failed", error);
    return [];
  }
  return (data ?? []) as DeskItem[];
}

// Everything that could go into a sprint: open, not already in one. Sorted so
// the things he has already thought about enough to write a next action for
// come first.
export async function sprintCandidates(): Promise<DeskItem[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("desk_items")
    .select("*")
    .eq("status", "open")
    .is("sprint_id", null)
    .order("venture", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(500);

  if (error) {
    console.error("desk: sprintCandidates failed", error);
    return [];
  }
  return (data ?? []) as DeskItem[];
}

// Counts for the sprint list, so a row can say what is in it without opening
// it.
export async function sprintSizes(): Promise<Map<string, number>> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("desk_items").select("sprint_id").not("sprint_id", "is", null);

  const sizes = new Map<string, number>();
  if (error) {
    console.error("desk: sprintSizes failed", error);
    return sizes;
  }
  for (const row of data ?? []) {
    const id = (row as { sprint_id: string }).sprint_id;
    sizes.set(id, (sizes.get(id) ?? 0) + 1);
  }
  return sizes;
}
