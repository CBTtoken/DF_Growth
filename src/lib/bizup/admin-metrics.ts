import { createAdminClient } from "@/lib/supabase/admin";
import { currentMonthStart } from "./cap";
import { capabilitiesFor, type BizUpPlan } from "./entitlements";

// What Dewald needs to see about KatisoBiz without asking anyone to query
// the database. Being blind to your own numbers is a worse problem than any
// missing feature.
//
// The metrics are chosen to answer four questions in this order, because
// that is the order they actually matter in for a product at this stage:
//
//   1. Is anybody using it?        (activation, not signups)
//   2. Is anybody paying?          (revenue)
//   3. Is the free cap working?    (spec Sec 16's committed metric)
//   4. Who are they?               (the list, so a number can be checked)
//
// Signup counts are deliberately not the headline. A signup that never
// sends a document is worth nothing, and a dashboard that leads with
// signups encourages exactly the wrong optimisation.

const PLAN_PRICE_CENTS: Record<BizUpPlan, number> = {
  free: 0,
  paid: 4900,
  unlimited: 8900,
};

export interface AdminMemberRow {
  id: string;
  businessName: string;
  email: string;
  plan: BizUpPlan;
  planSource: string;
  createdAt: string;
  planGrantedUntil: string | null;
  planGrantedReason: string | null;
  documentsThisMonth: number;
  documentsTotal: number;
  lastDocumentAt: string | null;
  isVatVendor: boolean;
}

export interface BizUpAdminMetrics {
  members: {
    total: number;
    newThisMonth: number;
    byPlan: Record<BizUpPlan, number>;
    /** Plan is included with a Growth subscription rather than bought here. */
    bundled: number;
    /** Given free of charge by an admin. Never counted as revenue. */
    granted: number;
  };
  activation: {
    /** Signed up and issued at least one real document. The number that matters. */
    activated: number;
    /** Signed up and never issued anything. */
    neverSent: number;
    activationRatePct: number | null;
    /** Issued something in the last 30 days. */
    activeLast30: number;
  };
  revenue: {
    /** Monthly recurring, from members paying us directly. */
    mrrCents: number;
    /** Billed through KatisoBiz in the current calendar month, subscriptions and topups. */
    collectedThisMonthCents: number;
    topupsThisMonth: number;
  };
  /**
   * Spec Sec 16 commits to instrumenting this from launch, because it is
   * the metric that decides whether the volume cap model survives at all:
   * "more than half of cap-hitters going dormant rather than upgrading" is
   * the stated trigger to change the model.
   */
  capPressure: {
    freeMembersAtCap: number;
    capHittersGoneDormant: number;
    capHittersUpgraded: number;
  };
  documents: {
    issuedThisMonth: number;
    issuedTotal: number;
  };
  members_list: AdminMemberRow[];
}

export async function loadBizUpAdminMetrics(): Promise<BizUpAdminMetrics> {
  const admin = createAdminClient();
  const monthStart = currentMonthStart().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const [{ data: accounts }, { data: docs }, { data: billing }] = await Promise.all([
    admin
      .from("bizup_accounts")
      .select("id, business_name, email, plan, plan_source, vat_number, created_at, plan_granted_until, plan_granted_reason")
      .order("created_at", { ascending: false }),
    // Issued documents only. A draft is not usage: it is someone who opened
    // the builder and stopped, which is the opposite of the signal wanted.
    admin
      .from("bizup_documents")
      .select("account_id, issue_date, doc_type")
      .not("number", "is", null),
    admin.from("bizup_billing_events").select("account_id, kind, amount_cents, created_at"),
  ]);

  const allAccounts = accounts ?? [];
  const allDocs = docs ?? [];

  // Per-account document tallies, in one pass.
  const byAccount = new Map<
    string,
    { total: number; thisMonth: number; last: string | null }
  >();
  for (const d of allDocs) {
    const entry = byAccount.get(d.account_id) ?? { total: 0, thisMonth: 0, last: null };
    entry.total += 1;
    const date = d.issue_date ?? "";
    if (date >= monthStart) entry.thisMonth += 1;
    if (!entry.last || date > entry.last) entry.last = date;
    byAccount.set(d.account_id, entry);
  }

  const byPlan: Record<BizUpPlan, number> = { free: 0, paid: 0, unlimited: 0 };
  let bundled = 0;
  let grantedCount = 0;
  let newThisMonth = 0;
  let mrrCents = 0;
  let activated = 0;
  let activeLast30 = 0;
  let freeMembersAtCap = 0;
  let capHittersGoneDormant = 0;

  const members_list: AdminMemberRow[] = [];

  for (const a of allAccounts) {
    const plan = a.plan as BizUpPlan;
    byPlan[plan] = (byPlan[plan] ?? 0) + 1;

    const selfPaid = a.plan_source === "self_paid";
    const granted = a.plan_source === "granted";
    // A comp is neither revenue nor a bundled Growth subscription. Counting
    // it as bundled would claim a Growth plan that does not exist.
    if (!selfPaid && !granted && plan !== "free") bundled += 1;
    if (granted && plan !== "free") grantedCount += 1;
    // Only money that reaches us through KatisoBiz counts as KatisoBiz
    // revenue. A bundled member is real revenue, but it is Growth's, and
    // counting it here would flatter this number and hide whether the R49
    // product stands up on its own.
    if (selfPaid) mrrCents += PLAN_PRICE_CENTS[plan] ?? 0;

    if (a.created_at.slice(0, 10) >= monthStart) newThisMonth += 1;

    const tally = byAccount.get(a.id) ?? { total: 0, thisMonth: 0, last: null };
    if (tally.total > 0) activated += 1;
    if (tally.last && tally.last >= thirtyDaysAgo) activeLast30 += 1;

    // Sec 16's metric. A free member who has used their whole allowance in
    // the current month is under cap pressure right now; one who hit it and
    // has since sent nothing for 30 days is the dormancy case the spec
    // wants counted.
    const allowance = capabilitiesFor(plan).documentsPerMonth;
    if (plan === "free" && allowance !== null) {
      if (tally.thisMonth >= allowance) freeMembersAtCap += 1;
      if (tally.total >= allowance && (!tally.last || tally.last < thirtyDaysAgo)) {
        capHittersGoneDormant += 1;
      }
    }

    members_list.push({
      id: a.id,
      businessName: a.business_name,
      email: a.email,
      plan,
      planSource: a.plan_source,
      createdAt: a.created_at.slice(0, 10),
      planGrantedUntil: a.plan_granted_until,
      planGrantedReason: a.plan_granted_reason,
      documentsThisMonth: tally.thisMonth,
      documentsTotal: tally.total,
      lastDocumentAt: tally.last,
      isVatVendor: !!a.vat_number,
    });
  }

  // Someone who bought a plan after having been capped is the other half of
  // Sec 16's comparison: the members who upgraded rather than went quiet.
  const upgradedAccounts = new Set(
    (billing ?? []).filter((b) => b.kind === "subscription").map((b) => b.account_id),
  );

  const collectedThisMonthCents = (billing ?? [])
    .filter((b) => b.created_at.slice(0, 10) >= monthStart)
    .reduce((s, b) => s + b.amount_cents, 0);

  return {
    members: {
      total: allAccounts.length,
      newThisMonth,
      byPlan,
      bundled,
      granted: grantedCount,
    },
    activation: {
      activated,
      neverSent: allAccounts.length - activated,
      activationRatePct:
        allAccounts.length === 0 ? null : Math.round((activated / allAccounts.length) * 100),
      activeLast30,
    },
    revenue: {
      mrrCents,
      collectedThisMonthCents,
      topupsThisMonth: (billing ?? []).filter(
        (b) => b.kind === "topup" && b.created_at.slice(0, 10) >= monthStart,
      ).length,
    },
    capPressure: {
      freeMembersAtCap,
      capHittersGoneDormant,
      capHittersUpgraded: upgradedAccounts.size,
    },
    documents: {
      issuedThisMonth: allDocs.filter((d) => (d.issue_date ?? "") >= monthStart).length,
      issuedTotal: allDocs.length,
    },
    members_list,
  };
}
