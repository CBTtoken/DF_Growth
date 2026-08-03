import "server-only";

import { createSvcClient } from "@/lib/svc/db";

/**
 * The fraud view's signals (handoff section 8): flag only, never
 * auto-suspend. Three of the handoff's four signals are computable today;
 * device fingerprints are not captured anywhere in the platform yet, and
 * that absence is reported in the admin screen rather than papered over.
 */
export type FraudSignals = {
  sharedInstruments: { customerCode: string; members: { id: string; name: string; cell: string }[] }[];
  cellPrefixClusters: { prefix: string; count: number; members: { id: string; name: string; cell: string }[] }[];
  fastChains: { memberId: string; name: string; cell: string; recentLevel1: number }[];
  chainThreshold: number;
};

export async function fraudSignals(): Promise<FraudSignals> {
  const db = createSvcClient();

  const [{ data: members }, { data: subs }, { data: referrals }, { data: thresholdSetting }] =
    await Promise.all([
      db.from("member").select("id, first_name, surname, cell_number, created_at"),
      db.from("subscription").select("member_id, provider_customer_code").not("provider_customer_code", "is", null),
      db
        .from("referral")
        .select("referrer_member_id, created_at")
        .eq("level", 1)
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      db.from("setting").select("value").eq("key", "fraud_chain_weekly_threshold").maybeSingle(),
    ]);

  const memberById = new Map(
    (members ?? []).map((m) => [
      m.id,
      { id: m.id, name: `${m.first_name} ${m.surname}`, cell: m.cell_number, created_at: m.created_at },
    ])
  );

  // One payment instrument, several members.
  const byCode = new Map<string, string[]>();
  for (const s of subs ?? []) {
    if (!s.provider_customer_code) continue;
    const list = byCode.get(s.provider_customer_code) ?? [];
    if (!list.includes(s.member_id)) list.push(s.member_id);
    byCode.set(s.provider_customer_code, list);
  }
  const sharedInstruments = [...byCode.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([customerCode, ids]) => ({
      customerCode,
      members: ids.map((id) => memberById.get(id)).filter(Boolean) as FraudSignals["sharedInstruments"][0]["members"],
    }));

  // Runs of near-identical cell numbers joining recently: the same first
  // six digits five or more times inside 30 days.
  const recentCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const byPrefix = new Map<string, { id: string; name: string; cell: string; created_at: string }[]>();
  for (const m of memberById.values()) {
    if (new Date(m.created_at).getTime() < recentCutoff) continue;
    const prefix = m.cell.slice(0, 6);
    const list = byPrefix.get(prefix) ?? [];
    list.push(m);
    byPrefix.set(prefix, list);
  }
  const cellPrefixClusters = [...byPrefix.entries()]
    .filter(([, list]) => list.length >= 5)
    .map(([prefix, list]) => ({
      prefix,
      count: list.length,
      members: list.map(({ id, name, cell }) => ({ id, name, cell })),
    }))
    .sort((a, b) => b.count - a.count);

  // A chain growing faster than the set rate: level-1 signups per referrer
  // in the trailing week, against an admin-configurable threshold.
  const chainThreshold = Number(thresholdSetting?.value ?? 10);
  const level1Counts = new Map<string, number>();
  for (const r of referrals ?? []) {
    level1Counts.set(r.referrer_member_id, (level1Counts.get(r.referrer_member_id) ?? 0) + 1);
  }
  const fastChains = [...level1Counts.entries()]
    .filter(([, count]) => count >= chainThreshold)
    .map(([memberId, recentLevel1]) => {
      const m = memberById.get(memberId);
      return { memberId, name: m?.name ?? "Unknown", cell: m?.cell ?? "", recentLevel1 };
    })
    .sort((a, b) => b.recentLevel1 - a.recentLevel1);

  return { sharedInstruments, cellPrefixClusters, fastChains, chainThreshold };
}

/** The aggregated demand view (handoff 7.4), ordered by count. */
export async function demandSummary(): Promise<{
  byCategory: { category: string; count: number }[];
  recent: { category: string; message: string; created_at: string; memberName: string }[];
}> {
  const db = createSvcClient();
  const { data } = await db
    .from("demand_signal")
    .select("category, message, created_at, member:member_id (first_name, surname)")
    .order("created_at", { ascending: false })
    .limit(500);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.category, (counts.get(row.category) ?? 0) + 1);
  }

  return {
    byCategory: [...counts.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count),
    recent: (data ?? []).slice(0, 50).map((row) => {
      const m = row.member as unknown as { first_name: string; surname: string } | null;
      return {
        category: row.category,
        message: row.message,
        created_at: row.created_at,
        memberName: m ? `${m.first_name} ${m.surname}` : "Member",
      };
    }),
  };
}
