import "server-only";

import { createSvcClient } from "@/lib/svc/db";

/**
 * Effective-dated rates and the package builder's arithmetic (handoff
 * 7.2). Every function that touches money for a month asks "which rate
 * was in effect THAT month", never "what is the rate now", which is what
 * makes a September renegotiation leave an August payout run untouched.
 */

export type BenefitRate = {
  id: string;
  benefit_id: string;
  cost_model: "per_active_member_per_month" | "per_redemption" | "revenue_share_percent" | "zero_cost";
  rate_cents: number | null;
  revenue_share_percent: number | null;
  effective_from: string;
  effective_to: string | null;
};

/**
 * The rate in effect for a benefit in a given period (first-of-month
 * date). A rate applies when effective_from <= period and (effective_to
 * is null or effective_to >= period).
 */
export async function rateForBenefit(benefitId: string, period: string): Promise<BenefitRate | null> {
  const db = createSvcClient();
  const { data } = await db
    .from("benefit_rate")
    .select("id, benefit_id, cost_model, rate_cents, revenue_share_percent, effective_from, effective_to")
    .eq("benefit_id", benefitId)
    .lte("effective_from", period)
    .or(`effective_to.is.null,effective_to.gte.${period}`)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as BenefitRate | null) ?? null;
}

export type RedemptionRateInfo = {
  rate: number;
  source: "observed" | "assumed" | "none";
  issued: number;
  redeemed: number;
};

// Below this many issues the observed rate is noise, so the manual
// assumption stays in charge and the panel says so.
const OBSERVATION_FLOOR = 50;

/**
 * The redemption rate for a benefit: observed from the ledger over the
 * trailing 90 days once there is enough data, otherwise the manual
 * assumption on the benefit row, and the caller is told which one it got
 * so the builder can label it (handoff 7.2).
 */
export async function redemptionRate(benefitId: string): Promise<RedemptionRateInfo> {
  const db = createSvcClient();
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const [{ count: issued }, { count: redeemed }, { data: benefit }] = await Promise.all([
    db
      .from("benefit_issue")
      .select("id", { count: "exact", head: true })
      .eq("benefit_id", benefitId)
      .gte("issued_at", since),
    db
      .from("benefit_issue")
      .select("id", { count: "exact", head: true })
      .eq("benefit_id", benefitId)
      .eq("status", "redeemed")
      .gte("issued_at", since),
    db.from("benefit").select("assumed_redemption_rate").eq("id", benefitId).maybeSingle(),
  ]);

  if ((issued ?? 0) >= OBSERVATION_FLOOR) {
    return {
      rate: (redeemed ?? 0) / (issued ?? 1),
      source: "observed",
      issued: issued ?? 0,
      redeemed: redeemed ?? 0,
    };
  }
  const assumed = benefit?.assumed_redemption_rate;
  if (assumed != null) {
    return { rate: Number(assumed), source: "assumed", issued: issued ?? 0, redeemed: redeemed ?? 0 };
  }
  return { rate: 0, source: "none", issued: issued ?? 0, redeemed: redeemed ?? 0 };
}

export type BenefitCostLine = {
  benefitId: string;
  name: string;
  benefitType: string;
  faceValueCents: number;
  costModel: BenefitRate["cost_model"] | "no_rate";
  rateCents: number | null;
  fixedCents: number;
  variableCents: number;
  redemption: RedemptionRateInfo | null;
};

export type PackageCosts = {
  lines: BenefitCostLine[];
  fixedCents: number;
  variableCents: number;
  referralCents: number;
  totalCostCents: number;
  marginCents: number;
  marginPercent: number;
  faceValueCents: number;
  monthlyPriceCents: number;
  warnings: string[];
};

/**
 * The live panel's numbers for a hypothetical or real package: fixed cost
 * per member per month, variable cost (per_redemption rate times the
 * redemption rate), the FULL three-level referral exposure inside the
 * margin (handoff 7.2: it must appear in the margin, not beside it),
 * gross margin in Rand and percent, the face value total the public page
 * renders, and the two warnings the handoff names.
 */
export async function packageCosts({
  monthlyPriceCents,
  benefitIds,
  faceValues,
  referralExposureCents,
  period,
}: {
  monthlyPriceCents: number;
  benefitIds: string[];
  faceValues: Record<string, number>;
  referralExposureCents: number;
  period: string;
}): Promise<PackageCosts> {
  const db = createSvcClient();
  const { data: benefits } = await db
    .from("benefit")
    .select("id, name, benefit_type")
    .in("id", benefitIds.length > 0 ? benefitIds : ["00000000-0000-0000-0000-000000000000"]);

  const lines: BenefitCostLine[] = [];
  for (const b of benefits ?? []) {
    const rate = await rateForBenefit(b.id, period);
    const face = faceValues[b.id] ?? 0;

    let fixedCents = 0;
    let variableCents = 0;
    let redemption: RedemptionRateInfo | null = null;

    if (rate?.cost_model === "per_active_member_per_month") {
      fixedCents = rate.rate_cents ?? 0;
    } else if (rate?.cost_model === "per_redemption") {
      redemption = await redemptionRate(b.id);
      variableCents = Math.round((rate.rate_cents ?? 0) * redemption.rate);
    } else if (rate?.cost_model === "revenue_share_percent") {
      variableCents = Math.round(
        (monthlyPriceCents * Number(rate.revenue_share_percent ?? 0)) / 100
      );
    }
    // zero_cost and no rate at all both cost nothing; the difference is
    // reported through the warnings below.

    lines.push({
      benefitId: b.id,
      name: b.name,
      benefitType: b.benefit_type,
      faceValueCents: face,
      costModel: rate?.cost_model ?? "no_rate",
      rateCents: rate?.rate_cents ?? null,
      fixedCents,
      variableCents,
      redemption,
    });
  }

  const fixedCents = lines.reduce((s, l) => s + l.fixedCents, 0);
  const variableCents = lines.reduce((s, l) => s + l.variableCents, 0);
  const faceValueCents = lines.reduce((s, l) => s + l.faceValueCents, 0);
  const totalCostCents = fixedCents + variableCents + referralExposureCents;
  const marginCents = monthlyPriceCents - totalCostCents;
  const marginPercent = monthlyPriceCents > 0 ? (marginCents / monthlyPriceCents) * 100 : 0;

  const warnings: string[] = [];
  if (marginCents < 0) {
    warnings.push("This package loses money on every fully referred member. The margin is negative.");
  }
  // The hard warning: a zero_cost (or unrated) benefit carrying the
  // headline value claim.
  const headline = [...lines].sort((a, b) => b.faceValueCents - a.faceValueCents)[0];
  if (
    headline &&
    faceValueCents > 0 &&
    headline.faceValueCents >= faceValueCents / 2 &&
    (headline.costModel === "zero_cost" || headline.costModel === "no_rate")
  ) {
    warnings.push(
      `The headline value claim leans on "${headline.name}", which ${
        headline.costModel === "zero_cost"
          ? "a partner supplies at zero cost and can withdraw"
          : "has no agreed rate on record"
      }. If it goes, the public claim goes with it.`
    );
  }
  for (const l of lines) {
    if (l.costModel === "no_rate" && l.benefitType !== "magazine_access") {
      warnings.push(`"${l.name}" has no rate on record for this period; its cost shows as zero.`);
    }
    if (l.redemption?.source === "none" && l.costModel === "per_redemption") {
      warnings.push(
        `"${l.name}" is per-redemption but has no observed data and no manual assumption; its variable cost shows as zero.`
      );
    }
  }

  return {
    lines,
    fixedCents,
    variableCents,
    referralCents: referralExposureCents,
    totalCostCents,
    marginCents,
    marginPercent,
    faceValueCents,
    monthlyPriceCents,
    warnings,
  };
}

/** The full three-level referral exposure for a package, from its rates. */
export async function referralExposureCents(packageId: string): Promise<number> {
  const db = createSvcClient();
  const { data } = await db
    .from("referral_rate")
    .select("monthly_amount_cents")
    .eq("package_id", packageId);
  return (data ?? []).reduce((s, r) => s + r.monthly_amount_cents, 0);
}
