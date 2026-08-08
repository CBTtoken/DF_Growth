// Rebuild credits for job seekers. Handoff Job 5.
//
// What is free forever, never gated, never behind a credit: building a CV,
// editing it, importing one, every template, both file formats, applying
// for a job, being found by employers, and the spelling and wording check.
// None of those paths import this file, and that is the check worth doing
// if you ever wonder whether a change here has broken the promise.
//
// What costs: a rebuild past the free allowance. R45 buys five. One-off
// Paystack payment on DigitalFlyer's own account, billing DigitalFlyer's
// own product, which is inside the portfolio rule. No subscription.
// Credits never expire.
//
// Pitched as what it is, everywhere a person sees it: five CVs aimed at
// five different jobs, R45. Not "AI credits".

import { createAdminClient } from "@/lib/supabase/admin";
import { AI_WRITE_CAP, CREDITS_PER_PURCHASE, CREDIT_PURCHASE_RANDS } from "@/lib/jobs/cv-conversation";
import { JOBS_PRODUCT_TAG } from "@/lib/jobs/billing";

export interface SeekerCredits {
  balance: number;
  freeWritesUsed: number;
  freeWritesLeft: number;
}

export interface LedgerEntry {
  id: string;
  delta: number;
  reason: string;
  detail: string | null;
  createdAt: string;
}

/**
 * The person's standing. Creates no row: somebody who has never bought
 * anything and never used a free turn has no row, and reads as zeros.
 * Rows appear on first spend or first purchase.
 */
export async function getSeekerCredits(ownerUserId: string): Promise<SeekerCredits> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("jobs_ai_credits")
    .select("balance, free_writes_used")
    .eq("owner_user_id", ownerUserId)
    .maybeSingle();

  const freeWritesUsed = data?.free_writes_used ?? 0;
  return {
    balance: data?.balance ?? 0,
    freeWritesUsed,
    freeWritesLeft: Math.max(0, AI_WRITE_CAP - freeWritesUsed),
  };
}

/**
 * Spend one free Write with AI turn.
 *
 * Called only AFTER a successful generation, never before: "only a
 * successful call spends a turn" is the handoff's rule and a person whose
 * rewrite failed must be left exactly where they were.
 */
export async function spendFreeWrite(ownerUserId: string): Promise<void> {
  const admin = createAdminClient();
  const current = await getSeekerCredits(ownerUserId);
  await admin.from("jobs_ai_credits").upsert(
    {
      owner_user_id: ownerUserId,
      free_writes_used: current.freeWritesUsed + 1,
      balance: current.balance,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "owner_user_id" },
  );
}

/**
 * Carry an anonymous draft's turn count into the account that just
 * claimed it.
 *
 * An anonymous draft has no person to count against, so it counts on the
 * row (jobs_candidates.ai_write_count). Without this, signing up after
 * using both turns would hand out two more, which is the loophole the
 * per-person allowance exists to close.
 *
 * Takes the higher of the two rather than adding them, so a person who
 * already had an account and simply picked up a draft on the same phone
 * is not charged twice for the same turns.
 */
export async function carryDraftWritesIntoAccount(
  ownerUserId: string,
  draftWriteCount: number,
): Promise<void> {
  if (draftWriteCount <= 0) return;
  const admin = createAdminClient();
  const current = await getSeekerCredits(ownerUserId);
  const used = Math.max(current.freeWritesUsed, draftWriteCount);
  if (used === current.freeWritesUsed) return;

  await admin.from("jobs_ai_credits").upsert(
    {
      owner_user_id: ownerUserId,
      free_writes_used: used,
      balance: current.balance,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "owner_user_id" },
  );
}

/**
 * Take one credit for a rebuild that has already succeeded.
 *
 * Returns false when there was nothing to take, and the caller must treat
 * that as "do not deliver". Called after the generation, so a failed
 * generation costs nothing, which is the handoff's rule and the only
 * version of this that is fair: the person cannot see whether the model
 * failed or we did.
 *
 * The balance is decremented with a guard in the WHERE clause rather than
 * read-then-written, so two tabs cannot both spend the last credit.
 */
export async function spendCredit(
  ownerUserId: string,
  detail: string,
  candidateId: string | null,
  reason: "tailor" | "rebuild" = "tailor",
): Promise<boolean> {
  const admin = createAdminClient();

  const { data: row } = await admin
    .from("jobs_ai_credits")
    .select("balance")
    .eq("owner_user_id", ownerUserId)
    .maybeSingle();

  const balance = row?.balance ?? 0;
  if (balance <= 0) return false;

  // gte guards the race: the row only updates if the balance is still
  // what we read, so a second tab that got there first makes this a
  // zero-row update rather than an overdraft.
  const { data: updated } = await admin
    .from("jobs_ai_credits")
    .update({ balance: balance - 1, updated_at: new Date().toISOString() })
    .eq("owner_user_id", ownerUserId)
    .gte("balance", balance)
    .select("balance");

  if (!updated || updated.length === 0) return false;

  await admin.from("jobs_ai_credit_ledger").insert({
    owner_user_id: ownerUserId,
    delta: -1,
    reason,
    detail,
    candidate_id: candidateId,
  });

  return true;
}

/**
 * Put a credit back when delivery failed after the spend.
 *
 * The spend happens after a successful generation, so this is a narrow
 * window: the model produced something and saving it failed. Narrow is
 * not never, and a person who paid and got nothing must not be told to
 * take it up with support.
 */
export async function refundCredit(ownerUserId: string, detail: string): Promise<void> {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("jobs_ai_credits")
    .select("balance")
    .eq("owner_user_id", ownerUserId)
    .maybeSingle();

  await admin
    .from("jobs_ai_credits")
    .update({ balance: (row?.balance ?? 0) + 1, updated_at: new Date().toISOString() })
    .eq("owner_user_id", ownerUserId);

  await admin.from("jobs_ai_credit_ledger").insert({
    owner_user_id: ownerUserId,
    delta: 1,
    reason: "refund_failed_generation",
    detail,
  });
}

/**
 * Credit a completed purchase. Called from the Paystack webhook only.
 *
 * Idempotent on the provider's own transaction reference, which is unique
 * on the ledger: a redelivered webhook loses the insert and returns
 * without touching the balance. Keyed on the reference and never on
 * anything derived from user input, because a replayed event that credits
 * twice is free money and a dedup key made of a name is not a key.
 */
export async function creditPurchase(
  ownerUserId: string,
  paystackReference: string,
): Promise<boolean> {
  const admin = createAdminClient();

  const { error: ledgerError } = await admin.from("jobs_ai_credit_ledger").insert({
    owner_user_id: ownerUserId,
    delta: CREDITS_PER_PURCHASE,
    reason: "purchase",
    detail: `${CREDITS_PER_PURCHASE} rebuilds, R${CREDIT_PURCHASE_RANDS}`,
    paystack_reference: paystackReference,
  });

  if (ledgerError) {
    // 23505 is the unique violation on paystack_reference: this exact
    // payment has already been credited. Not an error, just a replay.
    if (ledgerError.code !== "23505") {
      console.error("Failed to record credit purchase", ledgerError);
    }
    return false;
  }

  const { data: row } = await admin
    .from("jobs_ai_credits")
    .select("balance, free_writes_used")
    .eq("owner_user_id", ownerUserId)
    .maybeSingle();

  await admin.from("jobs_ai_credits").upsert(
    {
      owner_user_id: ownerUserId,
      balance: (row?.balance ?? 0) + CREDITS_PER_PURCHASE,
      free_writes_used: row?.free_writes_used ?? 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "owner_user_id" },
  );

  return true;
}

/** The person's own ledger: what they bought, what they spent, on what. */
export async function getLedger(ownerUserId: string, limit = 25): Promise<LedgerEntry[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("jobs_ai_credit_ledger")
    .select("id, delta, reason, detail, created_at")
    .eq("owner_user_id", ownerUserId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((r) => ({
    id: r.id,
    delta: r.delta,
    reason: r.reason,
    detail: r.detail,
    createdAt: r.created_at,
  }));
}

/**
 * Open Paystack's hosted page for a one-off credit purchase.
 *
 * A one-off transaction, not a plan, so the amount is stated here rather
 * than fetched from a Paystack Plan the way the recruiter tiers are. That
 * makes a price change a code change, which is the right trade for a
 * single fixed price that is quoted in copy on four screens: the number
 * on the button and the number charged can never drift apart.
 */
export async function initializeCreditPurchase({
  ownerUserId,
  email,
  callbackUrl,
}: {
  ownerUserId: string;
  email: string;
  callbackUrl: string;
}): Promise<{ authorizationUrl: string } | { error: string }> {
  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount: CREDIT_PURCHASE_RANDS * 100,
      currency: "ZAR",
      callback_url: callbackUrl,
      metadata: {
        product: JOBS_PRODUCT_TAG,
        kind: "seeker_credits",
        jobs_seeker_user_id: ownerUserId,
      },
    }),
  });

  const data = await res.json();
  if (!data.status || !data.data?.authorization_url) {
    console.error("Failed to initialize credit purchase", data);
    return { error: "We could not open the payment page. Please try again." };
  }
  return { authorizationUrl: data.data.authorization_url };
}
