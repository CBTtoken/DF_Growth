import "server-only";

import crypto from "crypto";
import { createSvcClient } from "@/lib/svc/db";

/**
 * The referral programme's engine, to the letter of handoff section 8:
 * three levels and never a fourth, relationships set at signup and never
 * edited outside an audited admin action, matching on verified cell
 * number, and a member view that is three numbers rather than a tree.
 */

// No 0/O/1/I so a code can be read aloud over a phone without ambiguity.
const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function randomCode(length = 8): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  }
  return out;
}

/** The member's shareable code, generated once on first request. */
export async function getOrCreateReferralCode(memberId: string): Promise<string | null> {
  const db = createSvcClient();
  const { data: member } = await db
    .from("member")
    .select("referral_code")
    .eq("id", memberId)
    .maybeSingle();
  if (!member) return null;
  if (member.referral_code) return member.referral_code;

  // Retry a handful of times on the astronomically unlikely collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const { error } = await db
      .from("member")
      .update({ referral_code: code })
      .eq("id", memberId)
      .is("referral_code", null);
    if (!error) {
      const { data: check } = await db
        .from("member")
        .select("referral_code")
        .eq("id", memberId)
        .maybeSingle();
      if (check?.referral_code) return check.referral_code;
    }
  }
  console.error("SVC referral code generation kept colliding", memberId);
  return null;
}

/**
 * Creates the referral chain for a freshly verified member: level 1 to
 * the referrer, level 2 to the referrer's own level-1 referrer, level 3
 * one step further, and then stops because there is no level 4, ever.
 *
 * Called exactly once, at the moment the new member's cell number
 * verifies (relationships are set at signup; matching is on verified
 * cell). Self-referral is refused, and because cell numbers are unique
 * across members, the same cell cannot appear twice in a chain by
 * construction.
 */
export async function createReferralChain(newMemberId: string, referralCode: string): Promise<void> {
  const db = createSvcClient();

  const { data: newMember } = await db
    .from("member")
    .select("id, cell_number, cell_verified_at")
    .eq("id", newMemberId)
    .maybeSingle();
  if (!newMember?.cell_verified_at) return;

  const { data: referrer } = await db
    .from("member")
    .select("id, cell_number, cell_verified_at")
    .eq("referral_code", referralCode.toUpperCase())
    .maybeSingle();
  if (!referrer?.cell_verified_at) return;
  if (referrer.id === newMember.id || referrer.cell_number === newMember.cell_number) return;

  // Never twice: if any chain already exists for this member (a retry, a
  // second verification pass), the relationships stand as first written.
  const { data: existing } = await db
    .from("referral")
    .select("id")
    .eq("referred_member_id", newMember.id)
    .limit(1);
  if ((existing ?? []).length > 0) return;

  const chain: { referrer_member_id: string; level: number }[] = [
    { referrer_member_id: referrer.id, level: 1 },
  ];

  // Walk up: who referred the referrer (their level-1 row), and one more.
  let current = referrer.id;
  for (let level = 2; level <= 3; level++) {
    const { data: upline } = await db
      .from("referral")
      .select("referrer_member_id")
      .eq("referred_member_id", current)
      .eq("level", 1)
      .maybeSingle();
    if (!upline) break;
    if (upline.referrer_member_id === newMember.id) break;
    chain.push({ referrer_member_id: upline.referrer_member_id, level });
    current = upline.referrer_member_id;
  }

  const { error } = await db.from("referral").insert(
    chain.map((c) => ({
      referrer_member_id: c.referrer_member_id,
      referred_member_id: newMember.id,
      level: c.level,
    }))
  );
  if (error) console.error("SVC referral chain insert failed", error);
}

export type ReferralStats = {
  joinedByLevel: { level: number; count: number }[];
  thisMonthCents: number;
  totalEarnedCents: number;
  paidOutCents: number;
  balanceCents: number;
};

/**
 * The three-number member view (handoff section 8): people joined at each
 * level, this month's earning, total earned, and what has been paid or
 * applied. No tree, no network.
 */
export async function memberReferralStats(memberId: string): Promise<ReferralStats> {
  const db = createSvcClient();

  const { data: referrals } = await db
    .from("referral")
    .select("id, level")
    .eq("referrer_member_id", memberId)
    .eq("status", "active");

  const joinedByLevel = [1, 2, 3].map((level) => ({
    level,
    count: (referrals ?? []).filter((r) => r.level === level).length,
  }));

  const referralIds = (referrals ?? []).map((r) => r.id);
  let thisMonthCents = 0;
  let totalEarnedCents = 0;
  if (referralIds.length > 0) {
    const { data: earnings } = await db
      .from("referral_earning")
      .select("amount_cents, period")
      .in("referral_id", referralIds);
    const now = new Date();
    const currentPeriod = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
    for (const e of earnings ?? []) {
      totalEarnedCents += e.amount_cents;
      if (e.period === currentPeriod) thisMonthCents += e.amount_cents;
    }
  }

  const { data: payouts } = await db
    .from("payout_line")
    .select("amount_cents")
    .eq("member_id", memberId)
    .eq("payee_type", "member")
    .not("paid_at", "is", null);
  const paidOutCents = (payouts ?? []).reduce((sum, p) => sum + p.amount_cents, 0);

  return {
    joinedByLevel,
    thisMonthCents,
    totalEarnedCents,
    paidOutCents,
    balanceCents: totalEarnedCents - paidOutCents,
  };
}
