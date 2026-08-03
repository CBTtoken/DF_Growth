import "server-only";

import { createSvcClient } from "@/lib/svc/db";
import { rateForBenefit } from "@/lib/svc/rates";

/**
 * The payout and referral runs (handoff 7.3 and section 8). Both are
 * generated, never entered, and neither moves a cent of money: they
 * produce payout_line rows an operator marks paid by hand with a date and
 * a reference.
 *
 * Every Rand applied is the rate in effect FOR THE MONTH BEING RUN, via
 * rateForBenefit's effective-dating, which is the acceptance criterion
 * about a September rate change never altering an August run.
 */

function monthBounds(period: string): { start: string; end: string; endDate: Date } {
  const start = new Date(`${period}T00:00:00Z`);
  const endDate = new Date(start);
  endDate.setUTCMonth(endDate.getUTCMonth() + 1);
  return { start: start.toISOString(), end: endDate.toISOString(), endDate };
}

/**
 * "Paid and active for the month": the subscription's paid window covers
 * the last moment of the month (or now, for the current month). A lapsed
 * member earns nobody anything for that month (handoff section 8), and
 * the same definition drives the per-member partner counts so the two
 * runs can never disagree about who was active.
 */
async function activeSubscriptionsForMonth(period: string) {
  const db = createSvcClient();
  const { endDate } = monthBounds(period);
  const cutoff = endDate.getTime() > Date.now() ? new Date() : endDate;

  const { data } = await db
    .from("subscription")
    .select("id, member_id, package_id, started_at, current_period_end, status")
    .in("status", ["active", "cancelled", "past_due"])
    .lte("started_at", cutoff.toISOString())
    .gte("current_period_end", cutoff.toISOString());
  return data ?? [];
}

export type PayoutRunResult = {
  linesCreated: number;
  skippedExisting: number;
  partners: { partnerId: string; partnerName: string; amountCents: number; lines: number }[];
  error?: string;
};

/**
 * The partner payout run for one month. Per benefit: count qualifying
 * active members (per_active_member_per_month) or the month's redemptions
 * (per_redemption), apply the month's rate, one line per partner per
 * benefit. Re-running skips lines that already exist for the period and
 * source, so pressing the button twice cannot double a partner's money.
 */
export async function runPartnerPayout(period: string): Promise<PayoutRunResult> {
  const db = createSvcClient();
  const { start, end } = monthBounds(period);

  const [{ data: benefits }, subs] = await Promise.all([
    db.from("benefit").select("id, name, partner_id, benefit_type").eq("active", true),
    activeSubscriptionsForMonth(period),
  ]);
  if (!benefits) return { linesCreated: 0, skippedExisting: 0, partners: [], error: "benefits" };

  // Which benefits each active member actually held that month comes from
  // the ledger itself: an issue row for the period is the proof.
  const { data: periodIssues } = await db
    .from("benefit_issue")
    .select("benefit_id, member_id, status, redeemed_at")
    .eq("period", period);

  const { data: existingLines } = await db
    .from("payout_line")
    .select("id, source, partner_id")
    .eq("period", period)
    .eq("payee_type", "partner");
  const existingSources = new Set((existingLines ?? []).map((l) => `${l.partner_id}:${l.source}`));

  const activeMemberIds = new Set(subs.map((s) => s.member_id));
  let linesCreated = 0;
  let skippedExisting = 0;
  const partnerTotals = new Map<string, { amountCents: number; lines: number }>();

  for (const benefit of benefits) {
    const rate = await rateForBenefit(benefit.id, period);
    if (!rate || rate.cost_model === "zero_cost" || rate.cost_model === "revenue_share_percent") {
      // zero_cost owes nothing by definition; revenue share needs the
      // commercials MiFuel has not supplied and is reported as absent in
      // the admin screen rather than guessed here.
      continue;
    }

    const issuesForBenefit = (periodIssues ?? []).filter((i) => i.benefit_id === benefit.id);
    let count = 0;
    if (rate.cost_model === "per_active_member_per_month") {
      count = issuesForBenefit.filter((i) => activeMemberIds.has(i.member_id)).length;
    } else if (rate.cost_model === "per_redemption") {
      count = issuesForBenefit.filter(
        (i) =>
          i.status === "redeemed" &&
          i.redeemed_at &&
          i.redeemed_at >= start &&
          i.redeemed_at < end
      ).length;
    }
    if (count === 0) continue;

    const source = `benefit:${benefit.id}`;
    if (existingSources.has(`${benefit.partner_id}:${source}`)) {
      skippedExisting++;
      continue;
    }

    const amountCents = count * (rate.rate_cents ?? 0);
    const { error } = await db.from("payout_line").insert({
      payee_type: "partner",
      partner_id: benefit.partner_id,
      period,
      source,
      item_count: count,
      rate_cents: rate.rate_cents,
      amount_cents: amountCents,
    });
    if (error) {
      console.error("SVC payout line insert failed", error);
      continue;
    }
    linesCreated++;
    const t = partnerTotals.get(benefit.partner_id) ?? { amountCents: 0, lines: 0 };
    t.amountCents += amountCents;
    t.lines++;
    partnerTotals.set(benefit.partner_id, t);
  }

  const { data: partners } = await db.from("partner").select("id, name");
  const partnerSummaries = [...partnerTotals.entries()].map(([partnerId, t]) => ({
    partnerId,
    partnerName: (partners ?? []).find((p) => p.id === partnerId)?.name ?? "Partner",
    amountCents: t.amountCents,
    lines: t.lines,
  }));

  return { linesCreated, skippedExisting, partners: partnerSummaries };
}

export type ReferralRunResult = {
  earningsCreated: number;
  skippedExisting: number;
  memberLinesCreated: number;
  totalCents: number;
  error?: string;
};

/**
 * The monthly referral run: one referral_earning per active referral
 * whose referred member was paid-active for the month, at the referred
 * member's package rate for the referrer's level, then one payout_line
 * per referrer with a balance. Idempotent via the (referral, period)
 * unique key and the per-period member line check.
 */
export async function runReferralRun(period: string): Promise<ReferralRunResult> {
  const db = createSvcClient();

  const subs = await activeSubscriptionsForMonth(period);
  const paidMembers = new Map(subs.map((s) => [s.member_id, s.package_id]));

  const { data: referrals } = await db
    .from("referral")
    .select("id, referrer_member_id, referred_member_id, level")
    .eq("status", "active");

  const { data: rates } = await db
    .from("referral_rate")
    .select("package_id, level, monthly_amount_cents");
  const rateFor = (packageId: string, level: number) =>
    (rates ?? []).find((r) => r.package_id === packageId && r.level === level)?.monthly_amount_cents ?? 0;

  let earningsCreated = 0;
  let skippedExisting = 0;
  let totalCents = 0;
  const perReferrer = new Map<string, number>();

  for (const r of referrals ?? []) {
    const packageId = paidMembers.get(r.referred_member_id);
    if (!packageId) continue;
    const amount = rateFor(packageId, r.level);
    if (amount <= 0) continue;

    const { error } = await db
      .from("referral_earning")
      .insert({ referral_id: r.id, period, amount_cents: amount });
    if (error) {
      // 23505 is the unique (referral, period) key: already run.
      if (error.code === "23505") skippedExisting++;
      else console.error("SVC referral earning insert failed", error);
      continue;
    }
    earningsCreated++;
    totalCents += amount;
    perReferrer.set(r.referrer_member_id, (perReferrer.get(r.referrer_member_id) ?? 0) + amount);
  }

  // One member payout line per referrer with new earnings this period.
  let memberLinesCreated = 0;
  const { data: existingMemberLines } = await db
    .from("payout_line")
    .select("member_id")
    .eq("period", period)
    .eq("payee_type", "member")
    .eq("source", "referral");
  const alreadyLined = new Set((existingMemberLines ?? []).map((l) => l.member_id));

  for (const [memberId, amountCents] of perReferrer) {
    if (alreadyLined.has(memberId)) continue;
    const { error } = await db.from("payout_line").insert({
      payee_type: "member",
      member_id: memberId,
      period,
      source: "referral",
      item_count: 1,
      amount_cents: amountCents,
    });
    if (!error) memberLinesCreated++;
    else console.error("SVC member payout line failed", error);
  }

  return { earningsCreated, skippedExisting, memberLinesCreated, totalCents };
}

/** Marks a payout line paid, with the date and reference the handoff asks for. */
export async function markPayoutLinePaid(lineId: string, reference: string): Promise<boolean> {
  const db = createSvcClient();
  const { data } = await db
    .from("payout_line")
    .update({ paid_at: new Date().toISOString(), paid_reference: reference })
    .eq("id", lineId)
    .is("paid_at", null)
    .select("id");
  return (data ?? []).length > 0;
}

export type PartnerReportData = {
  partnerName: string;
  period: string;
  benefits: {
    name: string;
    received: number;
    opened: number;
    claimed: number;
    redeemed: number;
    redemptionRatePercent: number;
    realisedCents: number;
    selfReported: number;
  }[];
  totals: { received: number; redeemed: number; redemptionRatePercent: number; realisedCents: number };
  selfReportedShare: number;
};

/**
 * The partner report (handoff 7.3): members who received, opened, claimed
 * and redeemed, with the redemption rate, from the ledger. This is the
 * document that turns "give our members a free voucher" into "here is
 * what happened to the last five hundred". Where redemptions are
 * self-reported, the report says so plainly rather than presenting them
 * as verified (handoff 10.2).
 */
export async function partnerReportData(partnerId: string, period: string): Promise<PartnerReportData | null> {
  const db = createSvcClient();

  const [{ data: partner }, { data: benefits }] = await Promise.all([
    db.from("partner").select("name").eq("id", partnerId).maybeSingle(),
    db.from("benefit").select("id, name").eq("partner_id", partnerId),
  ]);
  if (!partner) return null;

  const benefitIds = (benefits ?? []).map((b) => b.id);
  const { data: issues } = benefitIds.length
    ? await db
        .from("benefit_issue")
        .select("benefit_id, status, realised_value_cents, verification_source")
        .eq("period", period)
        .in("benefit_id", benefitIds)
    : { data: [] as never[] };

  const rows = (benefits ?? []).map((b) => {
    const mine = (issues ?? []).filter((i) => i.benefit_id === b.id);
    const received = mine.length;
    const opened = mine.filter((i) => i.status !== "issued").length;
    const claimed = mine.filter((i) => ["claimed", "redeemed"].includes(i.status)).length;
    const redeemedRows = mine.filter((i) => i.status === "redeemed");
    const redeemed = redeemedRows.length;
    return {
      name: b.name,
      received,
      opened,
      claimed,
      redeemed,
      redemptionRatePercent: received > 0 ? (redeemed / received) * 100 : 0,
      realisedCents: redeemedRows.reduce((s, i) => s + (i.realised_value_cents ?? 0), 0),
      selfReported: redeemedRows.filter((i) => i.verification_source === "self_reported").length,
    };
  });

  const received = rows.reduce((s, r) => s + r.received, 0);
  const redeemed = rows.reduce((s, r) => s + r.redeemed, 0);
  const selfReportedTotal = rows.reduce((s, r) => s + r.selfReported, 0);

  return {
    partnerName: partner.name,
    period,
    benefits: rows,
    totals: {
      received,
      redeemed,
      redemptionRatePercent: received > 0 ? (redeemed / received) * 100 : 0,
      realisedCents: rows.reduce((s, r) => s + r.realisedCents, 0),
    },
    selfReportedShare: redeemed > 0 ? (selfReportedTotal / redeemed) * 100 : 0,
  };
}
