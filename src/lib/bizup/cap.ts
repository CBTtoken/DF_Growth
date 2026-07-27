import { createAdminClient } from "@/lib/supabase/admin";
import { capabilitiesFor, type BizUpPlan } from "./entitlements";

// BizUp/docs/bizup-phase1-spec.md Sec 15, document caps.
//
// Two rules from Sec 15 shape this whole file:
//
//   "The cap counts issued documents only. Drafts are free and unlimited,
//    so nobody is ever blocked mid-job by a cap."
//   "The block happens at Send, never at Create. A tradesman standing in a
//    customer's kitchen must always be able to build the quote in front of
//    them."
//
// Usage is derived by counting, not stored. The spec's own
// documents_used_this_month counter was dropped deliberately: a stored
// integer reset by a monthly cron can double-reset, miss a month or drift
// after a failed run, and either wrongly blocks a paying member or wrongly
// lets one through. A count cannot drift and needs no cron.

export interface CapState {
  /** null means uncapped. */
  allowance: number | null;
  used: number;
  /** Purchased documents that roll over and never expire (Sec 15). */
  topupBalance: number;
  /** Whether one more document can be issued right now. */
  canIssue: boolean;
  /** Free allowance left this month, before topup is touched. */
  remaining: number | null;
  /** True when the next issue will draw on purchased credit rather than the monthly allowance. */
  usingTopup: boolean;
}

/**
 * Sec 15: "The counter resets on the calendar month, not the member's
 * billing date, because it is simpler to explain."
 */
export function currentMonthStart(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function getCapState(
  accountId: string,
  plan: BizUpPlan,
  topupBalance: number,
): Promise<CapState> {
  const allowance = capabilitiesFor(plan).documentsPerMonth;
  if (allowance === null) {
    return { allowance: null, used: 0, topupBalance, canIssue: true, remaining: null, usingTopup: false };
  }

  const admin = createAdminClient();
  // Counts issued documents only, per Sec 15. Credit notes are excluded
  // because a member must never be charged for fixing a mistake.
  const { count } = await admin
    .from("bizup_documents")
    .select("id", { count: "exact", head: true })
    .eq("account_id", accountId)
    .neq("doc_type", "credit_note")
    .not("issued_at", "is", null)
    .gte("issued_at", currentMonthStart().toISOString());

  const used = count ?? 0;
  const remaining = Math.max(0, allowance - used);

  return {
    allowance,
    used,
    topupBalance,
    // Sec 15: "Consumption order: monthly allowance first, then topup
    // balance. Never burn purchased credit while free allowance remains."
    canIssue: remaining > 0 || topupBalance > 0,
    remaining,
    usingTopup: remaining === 0 && topupBalance > 0,
  };
}

/**
 * Sec 15: progressive warnings at 10 remaining, 3 remaining, and on the
 * last available document. On the free tier of 10, only at 3 and 1.
 *
 * Returns null when there is nothing worth saying, so the caller does not
 * have to decide when to nag. The permanently visible counter is the
 * primary defence; these are a backstop for people who open the app rarely.
 */
export function capWarning(state: CapState): string | null {
  if (state.allowance === null || state.remaining === null) return null;
  if (state.remaining === 0) return null;

  const isFreeTier = state.allowance <= 10;
  const thresholds = isFreeTier ? [3, 1] : [10, 3, 1];
  if (!thresholds.includes(state.remaining)) return null;

  return state.remaining === 1
    ? "This is your last document this month."
    : `${state.remaining} documents left this month.`;
}
