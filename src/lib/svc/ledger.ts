import "server-only";

import { createSvcClient } from "@/lib/svc/db";
import { sendEmail } from "@/lib/email/resend";
import { SVC_ORIGIN } from "@/lib/svc/host";

/**
 * The benefit ledger engine. Everything the handoff calls the spine goes
 * through this file: issuing a period's benefits, moving one issue through
 * its states with a timestamp per transition, and computing the personal
 * savings number.
 *
 * The savings number is computed ONLY from redeemed rows with a recorded
 * realised Rand value (handoff 7.1). Nothing here ever projects,
 * estimates or sums face values into that number.
 */

/** First day of the month containing `date`, as YYYY-MM-DD. */
export function periodFor(date: Date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export type BenefitIssue = {
  id: string;
  benefit_id: string;
  period: string;
  status: "issued" | "opened" | "claimed" | "redeemed" | "expired";
  issued_at: string;
  opened_at: string | null;
  claimed_at: string | null;
  redeemed_at: string | null;
  face_value_cents: number;
  realised_value_cents: number | null;
  verification_source: string | null;
  unique_code: string | null;
  benefit: {
    name: string;
    description: string | null;
    benefit_type: string;
  } | null;
};

const ISSUE_SELECT =
  "id, benefit_id, period, status, issued_at, opened_at, claimed_at, redeemed_at, " +
  "face_value_cents, realised_value_cents, verification_source, unique_code, " +
  "benefit:benefit_id (name, description, benefit_type)";

/**
 * Issues the period's benefits to every member with an active, paid
 * subscription. Idempotent by construction: the unique
 * (member, benefit, period) constraint means a second run inserts nothing
 * for anyone already issued, so this can run daily and catch both the new
 * month and members who joined mid-month.
 *
 * A cancelled-but-paid-up subscription still issues until its period ends
 * (handoff Sprint 2: benefits stay live to the end of the paid period).
 * Where a coupon file with unassigned codes exists for a benefit and
 * period, each new issue takes one code; issuing continues without codes
 * when stock runs out, and the shortfall is reported for admin.
 */
export async function runMonthlyIssue(period: string = periodFor()): Promise<{
  issued: number;
  membersEmailed: number;
  codeShortfalls: { benefitId: string; missing: number }[];
  error?: string;
}> {
  const db = createSvcClient();

  // Subscriptions that are paid for this period: active, or cancelled with
  // time left on the clock.
  const { data: subs, error: subError } = await db
    .from("subscription")
    .select("id, member_id, package_id, status, current_period_end")
    .in("status", ["active", "cancelled"])
    .gte("current_period_end", `${period}T00:00:00Z`);

  if (subError) {
    console.error("SVC issue run: subscription query failed", subError);
    return { issued: 0, membersEmailed: 0, codeShortfalls: [], error: "subscriptions" };
  }
  if (!subs || subs.length === 0) return { issued: 0, membersEmailed: 0, codeShortfalls: [] };

  // A suspended member is issued nothing while suspended (Sprint 3 admin
  // action); their subscription record is untouched so lifting the
  // suspension lets the next daily run catch them up.
  const { data: suspended } = await db.from("member").select("id").eq("status", "suspended");
  const suspendedIds = new Set((suspended ?? []).map((m) => m.id));

  // The benefits each package carries, fetched once.
  const packageIds = [...new Set(subs.map((s) => s.package_id))];
  const { data: packageBenefits, error: pbError } = await db
    .from("package_benefit")
    .select("package_id, benefit_id, face_value_cents, benefit:benefit_id (active)")
    .in("package_id", packageIds);

  if (pbError || !packageBenefits) {
    console.error("SVC issue run: package benefits query failed", pbError);
    return { issued: 0, membersEmailed: 0, codeShortfalls: [], error: "package_benefits" };
  }

  const byPackage = new Map<string, { benefit_id: string; face_value_cents: number }[]>();
  for (const pb of packageBenefits) {
    const active = (pb.benefit as unknown as { active: boolean } | null)?.active;
    if (!active) continue;
    const list = byPackage.get(pb.package_id) ?? [];
    list.push({ benefit_id: pb.benefit_id, face_value_cents: pb.face_value_cents });
    byPackage.set(pb.package_id, list);
  }

  // What already exists for the period, so the insert below only carries
  // genuinely new rows and the run stays idempotent.
  const { data: existing } = await db
    .from("benefit_issue")
    .select("member_id, benefit_id")
    .eq("period", period);
  const existingKeys = new Set((existing ?? []).map((e) => `${e.member_id}:${e.benefit_id}`));

  const newRows: PendingIssueRow[] = [];
  const newlyIssuedMembers = new Set<string>();

  for (const sub of subs) {
    if (suspendedIds.has(sub.member_id)) continue;
    for (const b of byPackage.get(sub.package_id) ?? []) {
      const key = `${sub.member_id}:${b.benefit_id}`;
      if (existingKeys.has(key)) continue;
      existingKeys.add(key);
      newRows.push({
        member_id: sub.member_id,
        benefit_id: b.benefit_id,
        package_id: sub.package_id,
        period,
        face_value_cents: b.face_value_cents,
      });
      newlyIssuedMembers.add(sub.member_id);
    }
  }

  // Voucher batch stock control (handoff section 6): where a benefit draws
  // on a finite supplied batch, issuing blocks at the batch's remaining
  // stock. This is what stops five thousand vouchers going out when a
  // chain supplied five hundred.
  const capped = await capRowsToVoucherStock(newRows);
  newRows.length = 0;
  newRows.push(...capped.rows);

  if (newRows.length === 0) return { issued: 0, membersEmailed: 0, codeShortfalls: [] };

  const { data: inserted, error: insertError } = await db
    .from("benefit_issue")
    .insert(newRows)
    .select("id, member_id, benefit_id");

  if (insertError) {
    console.error("SVC issue run: insert failed", insertError);
    return { issued: 0, membersEmailed: 0, codeShortfalls: [], error: "insert" };
  }

  // Hand out imported coupon codes where stock exists for this period.
  const codeShortfalls: { benefitId: string; missing: number }[] = [];
  const benefitIds = [...new Set((inserted ?? []).map((r) => r.benefit_id))];
  for (const benefitId of benefitIds) {
    const issuesNeedingCodes = (inserted ?? []).filter((r) => r.benefit_id === benefitId);

    const { data: file } = await db
      .from("coupon_file")
      .select("id")
      .eq("benefit_id", benefitId)
      .eq("period", period)
      .maybeSingle();
    if (!file) continue;

    const { data: codes } = await db
      .from("coupon_code")
      .select("id, code")
      .eq("file_id", file.id)
      .is("benefit_issue_id", null)
      .limit(issuesNeedingCodes.length);

    const available = codes ?? [];
    for (let i = 0; i < issuesNeedingCodes.length; i++) {
      const code = available[i];
      if (!code) break;
      await db.from("coupon_code").update({ benefit_issue_id: issuesNeedingCodes[i].id }).eq("id", code.id);
      await db.from("benefit_issue").update({ unique_code: code.code }).eq("id", issuesNeedingCodes[i].id);
    }
    if (available.length < issuesNeedingCodes.length) {
      codeShortfalls.push({ benefitId, missing: issuesNeedingCodes.length - available.length });
    }
  }

  // One email per member whose issue just landed, best effort.
  let membersEmailed = 0;
  const { data: members } = await db
    .from("member")
    .select("id, email, first_name")
    .in("id", [...newlyIssuedMembers]);

  for (const m of members ?? []) {
    const { ok } = await sendEmail({
      to: m.email,
      subject: "Your Smart Value Club benefits are ready",
      fromName: "Smart Value Club",
      html: `
        <p style="font-size:15px;line-height:1.65;color:#1a1a1a;margin:0 0 16px;">Good day ${m.first_name},</p>
        <p style="font-size:15px;line-height:1.65;color:#1a1a1a;margin:0 0 16px;">
          This month's benefits are in your account: your coupons, your magazine and
          your education picks. Open your dashboard to start using them.
        </p>
        <p style="margin:24px 0;">
          <a href="${SVC_ORIGIN}/account" style="display:inline-block;background:#1a6b3c;color:#ffffff;font-size:15px;font-weight:700;padding:13px 26px;text-decoration:none;">Open my benefits</a>
        </p>
        <p style="font-size:15px;line-height:1.65;color:#1a1a1a;margin:0;">Smart Value Club</p>
      `,
    });
    if (ok) membersEmailed++;
  }

  return { issued: newRows.length, membersEmailed, codeShortfalls };
}

type PendingIssueRow = {
  member_id: string;
  benefit_id: string;
  package_id: string | null;
  period: string;
  face_value_cents: number;
};

/**
 * Caps a set of would-be issue rows to the remaining stock of any voucher
 * batch backing their benefit, and increments the batches' issued
 * counters for the rows that survive. A benefit with no batch passes
 * through untouched. The database check constraint
 * (quantity_issued <= quantity_supplied) is the last line of defence
 * behind this.
 */
async function capRowsToVoucherStock(
  rows: PendingIssueRow[]
): Promise<{ rows: PendingIssueRow[]; blocked: { benefitId: string; blocked: number }[] }> {
  const db = createSvcClient();
  const benefitIds = [...new Set(rows.map((r) => r.benefit_id))];
  if (benefitIds.length === 0) return { rows, blocked: [] };

  const { data: batches } = await db
    .from("voucher_batch")
    .select("id, benefit_id, quantity_supplied, quantity_issued, expiry")
    .in("benefit_id", benefitIds);

  const today = new Date().toISOString().slice(0, 10);
  const live = (batches ?? []).filter((b) => !b.expiry || b.expiry >= today);
  if (live.length === 0) return { rows, blocked: [] };

  const kept: PendingIssueRow[] = [];
  const blocked: { benefitId: string; blocked: number }[] = [];

  for (const benefitId of benefitIds) {
    const mine = rows.filter((r) => r.benefit_id === benefitId);
    const batch = live.find((b) => b.benefit_id === benefitId);
    if (!batch) {
      kept.push(...mine);
      continue;
    }
    const remaining = Math.max(0, batch.quantity_supplied - batch.quantity_issued);
    const taking = mine.slice(0, remaining);
    kept.push(...taking);
    if (mine.length > remaining) {
      blocked.push({ benefitId, blocked: mine.length - remaining });
      console.warn(
        `SVC voucher batch for benefit ${benefitId} exhausted: ${mine.length - remaining} issues blocked`
      );
    }
    if (taking.length > 0) {
      await db
        .from("voucher_batch")
        .update({ quantity_issued: batch.quantity_issued + taking.length })
        .eq("id", batch.id);
    }
  }

  return { rows: kept, blocked };
}

/**
 * Admin's manual issue: one benefit to a list of members for a period,
 * which is how giveaways run (handoff Sprint 3). Same idempotency (the
 * unique key skips members already holding the benefit this period) and
 * the same voucher batch stock cap as the monthly run.
 */
export async function issueManually({
  benefitId,
  memberIds,
  period = periodFor(),
  faceValueCents,
}: {
  benefitId: string;
  memberIds: string[];
  period?: string;
  faceValueCents: number;
}): Promise<{ issued: number; skipped: number; blocked: number }> {
  const db = createSvcClient();

  const { data: existing } = await db
    .from("benefit_issue")
    .select("member_id")
    .eq("benefit_id", benefitId)
    .eq("period", period)
    .in("member_id", memberIds);
  const already = new Set((existing ?? []).map((e) => e.member_id));

  const candidates: PendingIssueRow[] = memberIds
    .filter((id) => !already.has(id))
    .map((member_id) => ({
      member_id,
      benefit_id: benefitId,
      package_id: null,
      period,
      face_value_cents: faceValueCents,
    }));

  const { rows, blocked } = await capRowsToVoucherStock(candidates);
  if (rows.length > 0) {
    const { error } = await db.from("benefit_issue").insert(rows);
    if (error) {
      console.error("SVC manual issue failed", error);
      return { issued: 0, skipped: already.size, blocked: candidates.length };
    }
  }

  return {
    issued: rows.length,
    skipped: already.size,
    blocked: blocked.reduce((s, b) => s + b.blocked, 0),
  };
}

/** The member's issues for a period, benefit details included. */
export async function listMemberIssues(memberId: string, period: string = periodFor()): Promise<BenefitIssue[]> {
  const db = createSvcClient();
  const { data, error } = await db
    .from("benefit_issue")
    .select(ISSUE_SELECT)
    .eq("member_id", memberId)
    .eq("period", period)
    .order("issued_at");
  if (error) {
    console.error("SVC member issues query failed", error);
    return [];
  }
  return (data ?? []) as unknown as BenefitIssue[];
}

/** Every ledger row for a member, newest period first, for the admin view. */
export async function listMemberLedger(memberId: string): Promise<BenefitIssue[]> {
  const db = createSvcClient();
  const { data, error } = await db
    .from("benefit_issue")
    .select(ISSUE_SELECT)
    .eq("member_id", memberId)
    .order("period", { ascending: false })
    .order("issued_at");
  if (error) {
    console.error("SVC member ledger query failed", error);
    return [];
  }
  return (data ?? []) as unknown as BenefitIssue[];
}

/**
 * Marks an issue opened. First transition out of issued; safe to call on
 * every view, it only writes the first time.
 */
export async function markOpened(issueId: string, memberId: string): Promise<void> {
  const db = createSvcClient();
  await db
    .from("benefit_issue")
    .update({ status: "opened", opened_at: new Date().toISOString() })
    .eq("id", issueId)
    .eq("member_id", memberId)
    .eq("status", "issued");
}

/** Marks an issue claimed (the member selected or took the benefit). */
export async function markClaimed(issueId: string, memberId: string): Promise<boolean> {
  const db = createSvcClient();
  const { data } = await db
    .from("benefit_issue")
    .update({ status: "claimed", claimed_at: new Date().toISOString() })
    .eq("id", issueId)
    .eq("member_id", memberId)
    .in("status", ["issued", "opened"])
    .select("id");
  return (data ?? []).length > 0;
}

/**
 * The member's own "I used this" (handoff 10.2: self_reported source,
 * counted with a cap when draw entries are computed in Sprint 4). The
 * amount is optional; absent, the face value is recorded as realised,
 * which is the most honest available number for a coupon the member says
 * they used.
 */
export async function markSelfRedeemed(
  issueId: string,
  memberId: string,
  amountCents?: number | null
): Promise<boolean> {
  const db = createSvcClient();

  const { data: issue } = await db
    .from("benefit_issue")
    .select("id, face_value_cents, status")
    .eq("id", issueId)
    .eq("member_id", memberId)
    .maybeSingle();
  if (!issue || issue.status === "redeemed" || issue.status === "expired") return false;

  const realised =
    typeof amountCents === "number" && amountCents >= 0
      ? Math.min(amountCents, Math.max(issue.face_value_cents, amountCents))
      : issue.face_value_cents;

  const { data } = await db
    .from("benefit_issue")
    .update({
      status: "redeemed",
      redeemed_at: new Date().toISOString(),
      realised_value_cents: realised,
      verification_source: "self_reported",
    })
    .eq("id", issueId)
    .eq("member_id", memberId)
    .select("id");
  return (data ?? []).length > 0;
}

export type MonthlySavings = {
  period: string;
  totalCents: number;
  items: { name: string; realisedCents: number; redeemedAt: string }[];
};

/**
 * The member's savings month by month: every redeemed benefit with its
 * realised value, grouped by period, newest first. The show-a-friend
 * view (Dewald, 5 August): a member scrolling their own real history is
 * the referral programme's best advert, so it renders from the same
 * honest rows as the counter.
 */
export async function savingsByMonth(memberId: string): Promise<MonthlySavings[]> {
  const db = createSvcClient();
  const { data } = await db
    .from("benefit_issue")
    .select("period, realised_value_cents, redeemed_at, benefit:benefit_id (name)")
    .eq("member_id", memberId)
    .eq("status", "redeemed")
    .not("realised_value_cents", "is", null)
    .order("period", { ascending: false })
    .order("redeemed_at", { ascending: false });

  const months = new Map<string, MonthlySavings>();
  for (const row of data ?? []) {
    const entry = months.get(row.period) ?? { period: row.period, totalCents: 0, items: [] };
    entry.totalCents += row.realised_value_cents ?? 0;
    entry.items.push({
      name: (row.benefit as unknown as { name: string } | null)?.name ?? "Benefit",
      realisedCents: row.realised_value_cents ?? 0,
      redeemedAt: row.redeemed_at ?? "",
    });
    months.set(row.period, entry);
  }
  return [...months.values()];
}

/**
 * The personal savings number (handoff 7.1): the sum of realised Rand
 * value on redeemed rows, and nothing else. Zero for a member who has
 * redeemed nothing; the caller shows what is available instead.
 */
export async function savingsTotalCents(memberId: string): Promise<{ total: number; since: string | null }> {
  const db = createSvcClient();
  const { data } = await db
    .from("benefit_issue")
    .select("realised_value_cents, redeemed_at")
    .eq("member_id", memberId)
    .eq("status", "redeemed")
    .not("realised_value_cents", "is", null)
    .order("redeemed_at");
  const rows = data ?? [];
  return {
    total: rows.reduce((sum, r) => sum + (r.realised_value_cents ?? 0), 0),
    since: rows[0]?.redeemed_at ?? null,
  };
}
