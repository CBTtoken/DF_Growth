import { createAdminClient } from "@/lib/supabase/admin";

// The retention policy, in one file, in numbers rather than prose.
//
// Settled by Dewald on 30 July 2026, closing the contradiction the handoff
// flagged as blocking Phase 3. If any of these numbers change, they change
// here and the privacy policy page changes in the same commit, because a
// published promise and an unenforced number is the worst of both.

/** Growth member data, counted from the day the account ended. Matches the published policy. */
export const GROWTH_RETENTION_MONTHS = 12;

/**
 * KatisoBiz financial records. Protected, not scheduled.
 *
 * Nothing in this system deletes a bizup_ row on a timer, and this constant
 * exists to be shown on the admin screen rather than to drive a job. Five
 * years is the floor SARS requires, the published policy's "except where we
 * are required by law to keep it longer" carve-out already covers it, and
 * "marked solid" was Dewald's own phrase for it.
 */
export const KATISOBIZ_RETENTION_YEARS = 5;

/** A member of the public who only ever verified an email to comment. */
export const PUBLIC_IDENTITY_INACTIVITY_MONTHS = 12;

function monthsAgo(months: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date.toISOString();
}

export type RetentionCandidate = {
  id: string;
  label: string;
  detail: string;
};

export type RetentionReport = {
  /** Ended accounts past the 12 month window, with a known end date. */
  growthClients: RetentionCandidate[];
  /**
   * Ended accounts with no end date recorded, because they were cancelled
   * before the column existed. Deliberately never deleted automatically:
   * the clock cannot be proved, so a person decides.
   */
  growthClientsUnknownDate: RetentionCandidate[];
  /** Public commenters with no activity inside the window. */
  publicIdentities: RetentionCandidate[];
  /** Counted and shown, never touched. */
  protectedKatisoBiz: { documents: number; accounts: number; oldestIssuedAt: string | null };
};

/**
 * What is currently due, without changing anything.
 *
 * Every screen and every job reads this same function, so the dry run and
 * the real run can never disagree about what was in scope.
 */
export async function buildRetentionReport(): Promise<RetentionReport> {
  const admin = createAdminClient();
  const cutoff = monthsAgo(GROWTH_RETENTION_MONTHS);
  const identityCutoff = monthsAgo(PUBLIC_IDENTITY_INACTIVITY_MONTHS);

  const [{ data: ended }, { data: endedUnknown }, { data: identities }, { count: docCount }, { count: accountCount }, { data: oldest }] =
    await Promise.all([
      admin
        .from("growth_clients")
        .select("id, business_name, slug, ended_at")
        .not("ended_at", "is", null)
        .lt("ended_at", cutoff),
      admin
        .from("growth_clients")
        .select("id, business_name, slug, created_at")
        .eq("status", "cancelled")
        .is("ended_at", null),
      admin.from("board_identities").select("id, email, display_name, created_at"),
      admin.from("bizup_documents").select("id", { count: "exact", head: true }),
      admin.from("bizup_accounts").select("id", { count: "exact", head: true }),
      admin
        .from("bizup_documents")
        .select("issued_at")
        .not("issued_at", "is", null)
        .order("issued_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);

  // A public identity is only stale if they have done nothing since. Last
  // activity is derived rather than stored, so there is no column to keep
  // in step and no way for it to be wrong.
  const identityIds = (identities ?? []).map((i) => i.id);
  const lastActivity = new Map<string, string>();

  if (identityIds.length) {
    const [{ data: comments }, { data: likes }] = await Promise.all([
      admin.from("board_comments").select("identity_id, created_at").in("identity_id", identityIds),
      admin.from("board_likes").select("identity_id, created_at").in("identity_id", identityIds),
    ]);

    for (const row of [...(comments ?? []), ...(likes ?? [])]) {
      const current = lastActivity.get(row.identity_id);
      if (!current || row.created_at > current) lastActivity.set(row.identity_id, row.created_at);
    }
  }

  return {
    growthClients: (ended ?? []).map((client) => ({
      id: client.id,
      label: client.business_name,
      detail: `Ended ${new Date(client.ended_at as string).toLocaleDateString("en-ZA")}, past ${GROWTH_RETENTION_MONTHS} months`,
    })),
    growthClientsUnknownDate: (endedUnknown ?? []).map((client) => ({
      id: client.id,
      label: client.business_name,
      detail: `Cancelled before end dates were recorded, joined ${new Date(client.created_at).toLocaleDateString("en-ZA")}`,
    })),
    publicIdentities: (identities ?? [])
      .filter((identity) => (lastActivity.get(identity.id) ?? identity.created_at) < identityCutoff)
      .map((identity) => ({
        id: identity.id,
        label: identity.display_name,
        detail: `No activity since ${new Date(lastActivity.get(identity.id) ?? identity.created_at).toLocaleDateString("en-ZA")}`,
      })),
    protectedKatisoBiz: {
      documents: docCount ?? 0,
      accounts: accountCount ?? 0,
      oldestIssuedAt: oldest?.issued_at ?? null,
    },
  };
}

/**
 * Deletes one category, and records what it did.
 *
 * Guarded on purpose: nothing calls this on a schedule. The scheduled job
 * reports, a person looks at the list and presses the button, and the run
 * is written to retention_runs either way. Dewald's standing preference for
 * deletion runs on this project is that each one is confirmed rather than
 * silent, and POPIA cares that the policy demonstrably runs, not that it
 * runs unattended.
 *
 * KatisoBiz is not a category here and cannot be passed in. That is the
 * "marked solid" part, enforced by there being no code path to it.
 */
export async function applyRetention(
  category: "growth_clients" | "public_identities",
  actor: string
): Promise<{ deleted: number }> {
  const admin = createAdminClient();
  const report = await buildRetentionReport();

  const targets = category === "growth_clients" ? report.growthClients : report.publicIdentities;
  if (targets.length === 0) {
    await admin.from("retention_runs").insert({
      mode: "delete",
      actor,
      summary: { category, deleted: 0, note: "Nothing was due" },
    });
    return { deleted: 0 };
  }

  const ids = targets.map((t) => t.id);

  if (category === "growth_clients") {
    // Board posts, comments and likes cascade from growth_clients through
    // board_posts. Nothing bizup_ is touched: those rows reference the
    // account, not the Growth client, and are protected for five years.
    await admin.from("growth_clients").delete().in("id", ids);
  } else {
    await admin.from("board_identities").delete().in("id", ids);
  }

  await admin.from("retention_runs").insert({
    mode: "delete",
    actor,
    summary: { category, deleted: ids.length, ids },
  });

  return { deleted: ids.length };
}
