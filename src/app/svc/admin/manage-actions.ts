"use server";

import { redirect } from "next/navigation";
import { svcPath } from "@/lib/svc/host";
import { getSvcAdmin } from "@/lib/svc/admin";
import { createSvcClient } from "@/lib/svc/db";
import { issueManually, periodFor } from "@/lib/svc/ledger";
import { runPartnerPayout, runReferralRun, markPayoutLinePaid } from "@/lib/svc/payouts";

/**
 * Sprint 3's admin actions: members (comp, suspend, manual issue),
 * partners (rates, voucher batches), and the two monthly runs. Every one
 * re-checks the admin gate; nothing trusts a form field for authority.
 */

async function requireAdmin() {
  const admin = await getSvcAdmin();
  if (!admin) redirect(await svcPath("/login"));
  return admin!;
}

/**
 * Comp a member: an active subscription with no payment behind it,
 * provider "comp", one month at a time. How gifted memberships and
 * testers get benefits without pretending a payment happened.
 */
export async function compMember(formData: FormData) {
  await requireAdmin();
  const memberId = String(formData.get("member") ?? "");
  const packageId = String(formData.get("package") ?? "");
  if (!memberId || !packageId) redirect(`${await svcPath("/admin")}?error=comp`);

  const db = createSvcClient();
  const now = new Date();
  const end = new Date(now);
  end.setMonth(end.getMonth() + 1);

  const { error } = await db.from("subscription").insert({
    member_id: memberId,
    package_id: packageId,
    status: "active",
    billing_interval: "monthly",
    provider: "comp",
    started_at: now.toISOString(),
    current_period_end: end.toISOString(),
  });
  if (error) console.error("SVC comp failed", error);

  await db
    .from("member")
    .update({ status: "active", updated_at: now.toISOString() })
    .eq("id", memberId);

  redirect(`${await svcPath(`/admin/member/${memberId}`)}`);
}

/** Suspend or lift: a suspended member is skipped by every issue run. */
export async function setMemberSuspension(formData: FormData) {
  await requireAdmin();
  const memberId = String(formData.get("member") ?? "");
  const suspend = formData.get("suspend") === "1";
  if (!memberId) redirect(`${await svcPath("/admin")}?error=member`);

  const db = createSvcClient();
  const { error } = await db
    .from("member")
    .update({ status: suspend ? "suspended" : "active", updated_at: new Date().toISOString() })
    .eq("id", memberId);
  if (error) console.error("SVC suspension change failed", error);

  // Best effort mirror to the coupon platform (their statuses: 3
  // Suspended, 2 Active); never blocks the local action.
  const { syncMifuelStatus } = await import("@/lib/svc/mifuel");
  await syncMifuelStatus(memberId, suspend ? 3 : 2, suspend ? "Suspended by SVC admin" : "Reactivated by SVC admin");

  redirect(`${await svcPath(`/admin/member/${memberId}`)}`);
}

/** Manual issue to one member (the giveaway path, single). */
export async function issueBenefitToMember(formData: FormData) {
  await requireAdmin();
  const memberId = String(formData.get("member") ?? "");
  const benefitId = String(formData.get("benefit") ?? "");
  const faceRand = Number(String(formData.get("face") ?? "0").replace(",", "."));
  if (!memberId || !benefitId) redirect(`${await svcPath("/admin")}?error=issue`);

  await issueManually({
    benefitId,
    memberIds: [memberId],
    faceValueCents: Number.isFinite(faceRand) && faceRand > 0 ? Math.round(faceRand * 100) : 0,
  });
  redirect(`${await svcPath(`/admin/member/${memberId}`)}`);
}

/**
 * Manual issue to a filtered group: every member matching the status
 * filter (the giveaway path, bulk). The voucher batch stock cap inside
 * issueManually is what keeps a 500 batch from issuing 501.
 */
export async function issueBenefitToGroup(formData: FormData) {
  await requireAdmin();
  const benefitId = String(formData.get("benefit") ?? "");
  const statusFilter = String(formData.get("status") ?? "active");
  const faceRand = Number(String(formData.get("face") ?? "0").replace(",", "."));
  if (!benefitId) redirect(`${await svcPath("/admin/members")}?error=benefit`);

  const db = createSvcClient();
  const { data: members } = await db.from("member").select("id").eq("status", statusFilter);
  const ids = (members ?? []).map((m) => m.id);
  if (ids.length === 0) redirect(`${await svcPath("/admin/members")}?error=nomembers`);

  const result = await issueManually({
    benefitId,
    memberIds: ids,
    faceValueCents: Number.isFinite(faceRand) && faceRand > 0 ? Math.round(faceRand * 100) : 0,
  });
  redirect(
    `${await svcPath("/admin/members")}?issued=${result.issued}&skipped=${result.skipped}&blocked=${result.blocked}`
  );
}

/** A new effective-dated rate; the previous open rate closes the day before. */
export async function addBenefitRate(formData: FormData) {
  await requireAdmin();
  const benefitId = String(formData.get("benefit") ?? "");
  const partnerId = String(formData.get("partner") ?? "");
  const costModel = String(formData.get("costModel") ?? "");
  const rateRand = Number(String(formData.get("rate") ?? "0").replace(",", "."));
  const revShare = Number(String(formData.get("revShare") ?? "0").replace(",", "."));
  const effectiveFrom = String(formData.get("effectiveFrom") ?? "").trim();

  const backHref = `${await svcPath(`/admin/partners/${partnerId}`)}`;
  if (!benefitId || !/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) redirect(`${backHref}?error=rate`);
  if (!["per_active_member_per_month", "per_redemption", "revenue_share_percent", "zero_cost"].includes(costModel)) {
    redirect(`${backHref}?error=model`);
  }

  const db = createSvcClient();

  // Close the currently open rate the day before the new one starts, so
  // history keeps exactly one applicable rate per period.
  const dayBefore = new Date(new Date(`${effectiveFrom}T00:00:00Z`).getTime() - 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  await db
    .from("benefit_rate")
    .update({ effective_to: dayBefore })
    .eq("benefit_id", benefitId)
    .is("effective_to", null)
    .lt("effective_from", effectiveFrom);

  const { error } = await db.from("benefit_rate").insert({
    benefit_id: benefitId,
    cost_model: costModel,
    rate_cents:
      costModel === "per_active_member_per_month" || costModel === "per_redemption"
        ? Math.round((Number.isFinite(rateRand) ? rateRand : 0) * 100)
        : null,
    revenue_share_percent: costModel === "revenue_share_percent" ? revShare : null,
    effective_from: effectiveFrom,
  });
  if (error) console.error("SVC rate insert failed", error);

  redirect(backHref);
}

/** A new voucher batch for a benefit. */
export async function addVoucherBatch(formData: FormData) {
  await requireAdmin();
  const partnerId = String(formData.get("partner") ?? "");
  const benefitId = String(formData.get("benefit") ?? "");
  const quantity = Number(formData.get("quantity") ?? 0);
  const expiry = String(formData.get("expiry") ?? "").trim();
  const codeSource = String(formData.get("codeSource") ?? "").trim();

  const backHref = `${await svcPath(`/admin/partners/${partnerId}`)}`;
  if (!benefitId || !Number.isInteger(quantity) || quantity <= 0) redirect(`${backHref}?error=batch`);

  const db = createSvcClient();
  const { error } = await db.from("voucher_batch").insert({
    partner_id: partnerId,
    benefit_id: benefitId,
    quantity_supplied: quantity,
    expiry: /^\d{4}-\d{2}-\d{2}$/.test(expiry) ? expiry : null,
    code_source: codeSource || null,
  });
  if (error) console.error("SVC voucher batch insert failed", error);

  redirect(backHref);
}

/** The partner payout run for a chosen month. */
export async function runPayoutForMonth(formData: FormData) {
  await requireAdmin();
  const period = String(formData.get("period") ?? periodFor());
  if (!/^\d{4}-\d{2}-01$/.test(period)) redirect(`${await svcPath("/admin/payouts")}?error=period`);

  const result = await runPartnerPayout(period);
  redirect(
    `${await svcPath("/admin/payouts")}?period=${period}&lines=${result.linesCreated}&skipped=${result.skippedExisting}`
  );
}

/** The referral run for a chosen month. */
export async function runReferralsForMonth(formData: FormData) {
  await requireAdmin();
  const period = String(formData.get("period") ?? periodFor());
  if (!/^\d{4}-\d{2}-01$/.test(period)) redirect(`${await svcPath("/admin/payouts")}?error=period`);

  const result = await runReferralRun(period);
  redirect(
    `${await svcPath("/admin/payouts")}?period=${period}&earnings=${result.earningsCreated}&memberLines=${result.memberLinesCreated}`
  );
}

/** Marks one payout line paid, with the reference the handoff requires. */
export async function markLinePaid(formData: FormData) {
  await requireAdmin();
  const lineId = String(formData.get("line") ?? "");
  const reference = String(formData.get("reference") ?? "").trim();
  const period = String(formData.get("period") ?? periodFor());

  if (!lineId || !reference) {
    redirect(`${await svcPath("/admin/payouts")}?period=${period}&error=reference`);
  }
  await markPayoutLinePaid(lineId, reference);
  redirect(`${await svcPath("/admin/payouts")}?period=${period}`);
}
