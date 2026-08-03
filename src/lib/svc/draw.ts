import "server-only";

import crypto from "crypto";
import { createSvcClient } from "@/lib/svc/db";
import { sendEmail } from "@/lib/email/resend";
import { SVC_ORIGIN } from "@/lib/svc/host";
import { periodFor } from "@/lib/svc/ledger";

/**
 * The draw (handoff section 10). The rules that matter most:
 *
 *  - Earned entries come only from VERIFIED redeemed value, weighted by
 *    where the redemption record came from (10.2): provider_redeemed in
 *    full, provider_checkout at an admin-set weight (default half), and
 *    self_reported capped per member per period (default 10 entries).
 *    Selecting a basket is not redemption.
 *  - Entries freeze at the published cutoff. After the freeze nothing is
 *    added, altered or deleted, including by admin: every write path in
 *    this file refuses a frozen draw, and the admin screen shows only
 *    per-source totals once frozen.
 *  - Selection is seeded and reproducible: the same seed over the same
 *    entry set always lands on the same winner, and the seed plus total
 *    entry count are published with the result.
 */

export type Draw = {
  id: string;
  period: string;
  prize_description: string;
  prize_value_cents: number | null;
  cutoff_at: string;
  frozen_at: string | null;
  free_entries_per_member: number;
  earn_threshold_cents: number;
  ticket_price_cents: number | null;
  purchase_enabled: boolean;
  seed: string | null;
  total_entries: number | null;
  winner_member_id: string | null;
  status: "open" | "frozen" | "drawn" | "published";
  prize_issue_id: string | null;
};

const DRAW_SELECT =
  "id, period, prize_description, prize_value_cents, cutoff_at, frozen_at, free_entries_per_member, " +
  "earn_threshold_cents, ticket_price_cents, purchase_enabled, seed, total_entries, winner_member_id, status, prize_issue_id";

export async function getDraw(period: string): Promise<Draw | null> {
  const db = createSvcClient();
  const { data } = await db.from("draw").select(DRAW_SELECT).eq("period", period).maybeSingle();
  return (data as Draw | null) ?? null;
}

export async function currentDraw(): Promise<Draw | null> {
  return getDraw(periodFor());
}

export async function listPublishedDraws(): Promise<Draw[]> {
  const db = createSvcClient();
  const { data } = await db
    .from("draw")
    .select(DRAW_SELECT)
    .eq("status", "published")
    .order("period", { ascending: false });
  return (data ?? []) as unknown as Draw[];
}

async function settingNumber(key: string, fallback: number): Promise<number> {
  const db = createSvcClient();
  const { data } = await db.from("setting").select("value").eq("key", key).maybeSingle();
  const n = Number(data?.value);
  return Number.isFinite(n) ? n : fallback;
}

export type EarnedBreakdown = {
  providerValueCents: number;
  checkoutValueCents: number;
  selfValueCents: number;
  checkoutWeight: number;
  selfCap: number;
  thresholdCents: number;
  weightedEntries: number;
  selfEntries: number;
  selfEntriesUncapped: number;
  earnedTotal: number;
  centsToNextEntry: number;
};

/**
 * The earned-entry mathematics for one member in one period, shared by
 * the live dashboard counter and the freeze so the number a member
 * watched all month is the number the freeze writes.
 */
export async function earnedEntries(
  memberId: string,
  period: string,
  thresholdCents: number
): Promise<EarnedBreakdown> {
  const db = createSvcClient();
  const [checkoutWeight, selfCap, { data: issues }] = await Promise.all([
    settingNumber("checkout_weight", 0.5),
    settingNumber("self_report_entry_cap", 10),
    db
      .from("benefit_issue")
      .select("realised_value_cents, verification_source")
      .eq("member_id", memberId)
      .eq("period", period)
      .eq("status", "redeemed")
      .not("realised_value_cents", "is", null),
  ]);

  let providerValueCents = 0;
  let checkoutValueCents = 0;
  let selfValueCents = 0;
  for (const i of issues ?? []) {
    const v = i.realised_value_cents ?? 0;
    if (i.verification_source === "provider_redeemed") providerValueCents += v;
    else if (i.verification_source === "provider_checkout") checkoutValueCents += v;
    else if (i.verification_source === "self_reported") selfValueCents += v;
  }

  const weightedValue = providerValueCents + Math.floor(checkoutValueCents * checkoutWeight);
  const weightedEntries = thresholdCents > 0 ? Math.floor(weightedValue / thresholdCents) : 0;
  const selfEntriesUncapped = thresholdCents > 0 ? Math.floor(selfValueCents / thresholdCents) : 0;
  const selfEntries = Math.min(selfEntriesUncapped, selfCap);

  return {
    providerValueCents,
    checkoutValueCents,
    selfValueCents,
    checkoutWeight,
    selfCap,
    thresholdCents,
    weightedEntries,
    selfEntries,
    selfEntriesUncapped,
    earnedTotal: weightedEntries + selfEntries,
    centsToNextEntry:
      thresholdCents > 0 ? thresholdCents - (weightedValue % thresholdCents) : 0,
  };
}

export type MemberDrawSummary = {
  draw: Draw;
  free: number;
  earned: EarnedBreakdown;
  purchased: number;
  total: number;
  frozen: boolean;
};

/** What the dashboard shows: the member's live entry picture. */
export async function memberDrawSummary(memberId: string): Promise<MemberDrawSummary | null> {
  const draw = await currentDraw();
  if (!draw) return null;
  const db = createSvcClient();

  if (draw.status !== "open") {
    // Frozen: the recorded rows are the truth, the live math is history.
    const { data: rows } = await db
      .from("draw_entry")
      .select("source, entry_count")
      .eq("draw_id", draw.id)
      .eq("member_id", memberId);
    const sum = (src: string) =>
      (rows ?? []).filter((r) => r.source === src).reduce((s, r) => s + r.entry_count, 0);
    const earned = await earnedEntries(memberId, draw.period, draw.earn_threshold_cents);
    return {
      draw,
      free: sum("free"),
      earned,
      purchased: sum("purchased"),
      total: sum("free") + sum("earned") + sum("purchased"),
      frozen: true,
    };
  }

  const [{ data: sub }, earned, { data: purchases }] = await Promise.all([
    db
      .from("subscription")
      .select("id, package:package_id (free_draw_entries)")
      .eq("member_id", memberId)
      .in("status", ["active", "cancelled"])
      .gte("current_period_end", new Date().toISOString())
      .limit(1)
      .maybeSingle(),
    earnedEntries(memberId, draw.period, draw.earn_threshold_cents),
    db
      .from("draw_entry")
      .select("entry_count")
      .eq("draw_id", draw.id)
      .eq("member_id", memberId)
      .eq("source", "purchased"),
  ]);

  const pkgFree = (sub?.package as unknown as { free_draw_entries: number } | null)?.free_draw_entries;
  const free = sub ? (pkgFree ?? draw.free_entries_per_member) : 0;
  const purchased = (purchases ?? []).reduce((s, r) => s + r.entry_count, 0);

  return { draw, free, earned, purchased, total: free + earned.earnedTotal + purchased, frozen: false };
}

/**
 * The freeze. Computes free entries per paid-up member (their package's
 * count, falling back to the draw's), earned entries from the ledger via
 * the shared mathematics, writes the rows, records the total, and flips
 * the status. Purchased entries were written at purchase time and are
 * simply counted. Nothing after this writes to the draw's entries: every
 * mutation path checks status.
 */
export async function freezeDraw(drawId: string): Promise<{ ok: boolean; total?: number; error?: string }> {
  const db = createSvcClient();
  const { data: drawRow } = await db.from("draw").select(DRAW_SELECT).eq("id", drawId).maybeSingle();
  const draw = drawRow as unknown as Draw | null;
  if (!draw) return { ok: false, error: "not_found" };
  if (draw.status !== "open") return { ok: false, error: "already_frozen" };

  const cutoff = new Date(draw.cutoff_at);

  // Paid-up members at the freeze: same definition as everywhere else.
  const { data: subs } = await db
    .from("subscription")
    .select("member_id, package:package_id (free_draw_entries)")
    .in("status", ["active", "cancelled"])
    .gte("current_period_end", cutoff.toISOString());

  const { data: suspended } = await db.from("member").select("id").eq("status", "suspended");
  const suspendedIds = new Set((suspended ?? []).map((m) => m.id));

  const seenMembers = new Set<string>();
  const rows: { draw_id: string; member_id: string; source: string; entry_count: number }[] = [];

  for (const sub of subs ?? []) {
    if (suspendedIds.has(sub.member_id) || seenMembers.has(sub.member_id)) continue;
    seenMembers.add(sub.member_id);

    const pkgFree = (sub.package as unknown as { free_draw_entries: number } | null)?.free_draw_entries;
    const free = pkgFree ?? draw.free_entries_per_member;
    if (free > 0) rows.push({ draw_id: draw.id, member_id: sub.member_id, source: "free", entry_count: free });

    const earned = await earnedEntries(sub.member_id, draw.period, draw.earn_threshold_cents);
    if (earned.earnedTotal > 0) {
      rows.push({ draw_id: draw.id, member_id: sub.member_id, source: "earned", entry_count: earned.earnedTotal });
    }
  }

  if (rows.length > 0) {
    const { error } = await db.from("draw_entry").insert(rows);
    if (error) {
      console.error("SVC draw freeze insert failed", error);
      return { ok: false, error: "insert" };
    }
  }

  const { data: allRows } = await db
    .from("draw_entry")
    .select("entry_count")
    .eq("draw_id", draw.id);
  const total = (allRows ?? []).reduce((s, r) => s + r.entry_count, 0);

  const { error: updateError } = await db
    .from("draw")
    .update({ status: "frozen", frozen_at: new Date().toISOString(), total_entries: total })
    .eq("id", draw.id)
    .eq("status", "open");
  if (updateError) {
    console.error("SVC draw freeze status update failed", updateError);
    return { ok: false, error: "status" };
  }

  return { ok: true, total };
}

/** Freezes every open draw whose cutoff has passed; the daily cron calls this. */
export async function freezeDueDraws(): Promise<number> {
  const db = createSvcClient();
  const { data: due } = await db
    .from("draw")
    .select("id")
    .eq("status", "open")
    .lte("cutoff_at", new Date().toISOString());
  let frozen = 0;
  for (const d of due ?? []) {
    const result = await freezeDraw(d.id);
    if (result.ok) frozen++;
  }
  return frozen;
}

/**
 * The seeded selection. Entries are read in a canonical order
 * (created_at, then id), the seed's SHA-256 taken as a big integer picks
 * an index modulo the total, and the cumulative walk finds whose entry
 * that index lands on. Same seed, same entry set, same winner, every
 * time, on anyone's machine.
 */
export function pickWinnerIndex(seed: string, totalEntries: number): number {
  const digest = crypto.createHash("sha256").update(seed).digest("hex");
  return Number(BigInt("0x" + digest) % BigInt(totalEntries));
}

export async function drawWinner(drawId: string): Promise<{ ok: boolean; error?: string }> {
  const db = createSvcClient();
  const { data: drawRow } = await db.from("draw").select(DRAW_SELECT).eq("id", drawId).maybeSingle();
  const draw = drawRow as unknown as Draw | null;
  if (!draw) return { ok: false, error: "not_found" };
  if (draw.status !== "frozen") return { ok: false, error: "not_frozen" };
  if (!draw.total_entries || draw.total_entries <= 0) return { ok: false, error: "no_entries" };

  const seed = draw.seed ?? crypto.randomBytes(16).toString("hex");
  const winnerIndex = pickWinnerIndex(seed, draw.total_entries);

  const { data: entries } = await db
    .from("draw_entry")
    .select("member_id, entry_count, created_at, id")
    .eq("draw_id", draw.id)
    .order("created_at")
    .order("id");

  let cumulative = 0;
  let winner: string | null = null;
  for (const e of entries ?? []) {
    cumulative += e.entry_count;
    if (winnerIndex < cumulative) {
      winner = e.member_id;
      break;
    }
  }
  if (!winner) return { ok: false, error: "walk_failed" };

  const { error } = await db
    .from("draw")
    .update({ seed, winner_member_id: winner, status: "drawn" })
    .eq("id", draw.id)
    .eq("status", "frozen");
  if (error) {
    console.error("SVC draw winner update failed", error);
    return { ok: false, error: "update" };
  }
  return { ok: true };
}

/**
 * Publish: the result goes public and the winner gets the email. The
 * public page shows the seed and total entry count, which is the cheapest
 * trust the platform can buy (handoff 10.3).
 */
export async function publishDraw(drawId: string): Promise<{ ok: boolean; error?: string }> {
  const db = createSvcClient();
  const { data: drawRow } = await db.from("draw").select(DRAW_SELECT).eq("id", drawId).maybeSingle();
  const draw = drawRow as unknown as Draw | null;
  if (!draw) return { ok: false, error: "not_found" };
  if (draw.status !== "drawn" || !draw.winner_member_id) return { ok: false, error: "not_drawn" };

  const { error } = await db
    .from("draw")
    .update({ status: "published" })
    .eq("id", draw.id)
    .eq("status", "drawn");
  if (error) return { ok: false, error: "update" };

  const { data: winner } = await db
    .from("member")
    .select("email, first_name")
    .eq("id", draw.winner_member_id)
    .maybeSingle();
  if (winner?.email) {
    const { ok } = await sendEmail({
      to: winner.email,
      subject: "You won the Smart Value Club monthly draw",
      fromName: "Smart Value Club",
      html: `
        <p style="font-size:15px;line-height:1.65;color:#1a1a1a;margin:0 0 16px;">Good day ${winner.first_name},</p>
        <p style="font-size:15px;line-height:1.65;color:#1a1a1a;margin:0 0 16px;">
          Wonderful news: your entry won this month's members draw. The prize is
          ${draw.prize_description}. We will be in touch on this address to arrange it.
        </p>
        <p style="margin:24px 0;">
          <a href="${SVC_ORIGIN}/draw" style="display:inline-block;background:#1a6b3c;color:#ffffff;font-size:15px;font-weight:700;padding:13px 26px;text-decoration:none;">See the published result</a>
        </p>
        <p style="font-size:15px;line-height:1.65;color:#1a1a1a;margin:0;">Smart Value Club</p>
      `,
    });
    if (!ok) console.error("SVC winner email failed");
  }
  return { ok: true };
}

/**
 * Prize fulfilment as a ledger row like any other benefit (handoff 10.3),
 * under an internal "Smart Value Club" partner benefit created on first
 * use. Recorded as redeemed with the prize's value, provider-verified,
 * because SVC itself is the provider of this one.
 */
export async function fulfilPrize(drawId: string): Promise<{ ok: boolean; error?: string }> {
  const db = createSvcClient();
  const { data: drawRow } = await db.from("draw").select(DRAW_SELECT).eq("id", drawId).maybeSingle();
  const draw = drawRow as unknown as Draw | null;
  if (!draw?.winner_member_id) return { ok: false, error: "no_winner" };
  if (draw.prize_issue_id) return { ok: false, error: "already_fulfilled" };

  let { data: benefit } = await db
    .from("benefit")
    .select("id")
    .eq("name", "Monthly draw prize")
    .maybeSingle();
  if (!benefit) {
    let { data: partner } = await db
      .from("partner")
      .select("id")
      .eq("name", "Smart Value Club")
      .maybeSingle();
    if (!partner) {
      const { data: created } = await db
        .from("partner")
        .insert({ name: "Smart Value Club", notes: "Internal: prizes and own benefits." })
        .select("id")
        .single();
      partner = created;
    }
    if (!partner) return { ok: false, error: "partner" };
    const { data: createdBenefit } = await db
      .from("benefit")
      .insert({
        partner_id: partner.id,
        name: "Monthly draw prize",
        description: "The monthly members draw prize, fulfilled to the winner.",
        benefit_type: "voucher_batch",
      })
      .select("id")
      .single();
    benefit = createdBenefit;
  }
  if (!benefit) return { ok: false, error: "benefit" };

  const now = new Date().toISOString();
  const { data: issue, error } = await db
    .from("benefit_issue")
    .insert({
      member_id: draw.winner_member_id,
      benefit_id: benefit.id,
      period: draw.period,
      status: "redeemed",
      redeemed_at: now,
      face_value_cents: draw.prize_value_cents ?? 0,
      realised_value_cents: draw.prize_value_cents ?? 0,
      verification_source: "provider_redeemed",
    })
    .select("id")
    .single();
  if (error || !issue) {
    console.error("SVC prize fulfilment failed", error);
    return { ok: false, error: "insert" };
  }

  await db.from("draw").update({ prize_issue_id: issue.id }).eq("id", draw.id);
  return { ok: true };
}
