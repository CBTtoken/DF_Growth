import { createAdminClient } from "@/lib/supabase/admin";
import { ALL_CHECKS } from "./checks";
import { safely, type HealthCategory, type HealthResult, type HealthStatus } from "./types";

// Running the checks, storing the results, and turning failures into work.
//
// TheDesk/Handoff_Desk_HealthCheck.md sections 4 and 6. The rules that matter
// most are the ones about restraint: a fail creates exactly one Desk item and
// a repeat failure updates it rather than breeding a second, warn creates
// nothing, and no notification, badge or count appears anywhere in The Desk.

export type StoredResult = HealthResult & { ran_at: string };

/**
 * Runs everything, in parallel, and writes the results down.
 *
 * Parallel because a dozen checks each waiting on a different provider is a
 * dozen round trips, and done one after another that is a screen nobody waits
 * for. Each check catches its own failures (see safely), so one slow provider
 * cannot take the run down with it.
 */
export async function runHealthChecks(): Promise<StoredResult[]> {
  const results = await Promise.all(ALL_CHECKS.map(safely));
  const admin = createAdminClient();
  const ranAt = new Date().toISOString();

  const { error } = await admin.from("desk_health_runs").insert(
    results.map((r) => ({
      check_name: r.check,
      category: r.category,
      status: r.status,
      result: r.result,
      raw: r.raw ?? null,
      ran_at: ranAt,
    }))
  );
  if (error) console.error("Could not store health results", error);

  await raiseItemsForFailures(results);

  return results.map((r) => ({ ...r, ran_at: ranAt }));
}

/**
 * A failure becomes one Desk item, and stays one.
 *
 * Section 4: "Do not create duplicates: if an open item already exists for
 * that check, update it rather than adding another." Without that rule a
 * check failing every day for a fortnight produces fourteen identical items,
 * and The Desk becomes the notepad it is trying not to be.
 *
 * Warnings deliberately create nothing. They show on the screen and that is
 * all: a warning is something to notice while looking, not something to be
 * handed as a job.
 */
async function raiseItemsForFailures(results: HealthResult[]): Promise<void> {
  const failures = results.filter((r) => r.status === "fail");
  if (failures.length === 0) return;

  const admin = createAdminClient();

  for (const failure of failures) {
    const marker = `[health:${failure.check}]`;

    const { data: existing } = await admin
      .from("desk_items")
      .select("id")
      .eq("status", "open")
      .ilike("notes", `%${marker}%`)
      .maybeSingle();

    if (existing) {
      await admin
        .from("desk_items")
        .update({ next_action: failure.result, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      continue;
    }

    await admin.from("desk_items").insert({
      title: `Health check failing: ${failure.check.replace(/_/g, " ")}`,
      area: "business",
      venture: "DigitalFlyer SA",
      next_action: failure.result,
      effort: "shallow",
      blocked_by: "me",
      status: "open",
      stream: "own",
      // The marker is how the next run finds this item again. Kept in notes
      // rather than the title so the title stays readable.
      notes: `${marker} Raised automatically by the health check. It will update itself while the check keeps failing.`,
    });
  }
}

/** The newest result for each check, which is what the screen shows. */
export async function latestResults(): Promise<StoredResult[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("desk_health_runs")
    .select("check_name, category, status, result, raw, ran_at")
    .order("ran_at", { ascending: false })
    .limit(400);

  const seen = new Set<string>();
  const latest: StoredResult[] = [];
  for (const row of data ?? []) {
    if (seen.has(row.check_name)) continue;
    seen.add(row.check_name);
    latest.push({
      check: row.check_name,
      category: row.category as HealthCategory,
      status: row.status as HealthStatus,
      result: row.result,
      raw: row.raw,
      ran_at: row.ran_at,
    });
  }
  return latest;
}

/** Worst first, because the point of the screen is what needs attention. */
const ORDER: Record<HealthStatus, number> = { fail: 0, warn: 1, unknown: 2, ok: 3 };

export function sortBySeverity(results: StoredResult[]): StoredResult[] {
  return [...results].sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.check.localeCompare(b.check));
}

export const CATEGORY_LABEL: Record<HealthCategory, string> = {
  usage: "Usage and cost",
  availability: "Is everything up",
  change: "Anything that changed",
  backup: "Backups",
};
