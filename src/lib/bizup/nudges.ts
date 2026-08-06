import { createAdminClient } from "@/lib/supabase/admin";

// Handoff: scripts/handoff-activation-nudges-and-emails.md, Jobs 4, 5, 6.
//
// Everything shared between the three KatisoBiz-side prompts: the "shown
// once, dismiss for 30 days" rule (Jobs 5 and 6), and the two real-number
// queries (a review count, a quote count) each nudge is built from. Kept
// out of the components themselves so a prompt's gating logic lives in one
// place, not copy-pasted into three.

const DISMISS_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/** True when a dismissal is still in effect — null (never dismissed) counts as not dismissed. */
export function isDismissed(dismissedAt: string | null, now: number): boolean {
  if (!dismissedAt) return false;
  return now - new Date(dismissedAt).getTime() < DISMISS_WINDOW_MS;
}

/** Published reviews sitting on this KatisoBiz account with no Growth page to show them on. */
export async function getPublishedReviewCount(accountId: string): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("bizup_account_id", accountId)
    .eq("status", "published");
  return count ?? 0;
}

export interface QuoteStats {
  sentCount: number;
  wonCount: number;
}

/**
 * All-time, this account's own numbers only — no invented benchmark, no
 * comparison to anyone else (Job 6's own explicit constraint). "Sent" means
 * actually shared with a customer, a draft never counted. "Won" is
 * accepted or converted (converted implies it was accepted first — the
 * product's own one-tap quote-to-invoice flow only runs after the customer
 * said yes).
 */
export async function getQuoteStats(accountId: string): Promise<QuoteStats> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("bizup_documents")
    .select("status")
    .eq("account_id", accountId)
    .eq("doc_type", "quote")
    .neq("status", "draft");

  const rows = data ?? [];
  const wonCount = rows.filter((r) => r.status === "accepted" || r.status === "converted").length;
  return { sentCount: rows.length, wonCount };
}

/** Job 6: below this many sent quotes, a win rate is noise, not a number worth showing. */
export const QUOTE_NUDGE_THRESHOLD = 5;
