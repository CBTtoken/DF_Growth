import "server-only";

import { createSvcClient } from "@/lib/svc/db";
import { currentDraw, type Draw } from "@/lib/svc/draw";

/**
 * Purchased draw entries, behind the gate (handoff 10.1). Every condition
 * is enforced HERE, server side, never only in the interface:
 *
 *  1. The draw's purchase_enabled flag is on (default off; it goes on
 *     only when Dewald's legal clearance exists in writing).
 *  2. The member's subscription is active and paid, on a package priced
 *     at or above the configured floor (R49 default).
 *  3. The member's first payment has actually cleared: a payment event
 *     exists for them. A comped member is active but has never paid, so
 *     a comp cannot buy entries.
 *  4. The draw is still open. Frozen means frozen.
 *
 * Purchases run through the same payment interface as memberships and
 * every one creates an entry_purchase row, reportable separately, because
 * purchased entry income is its own revenue line.
 */

export type PurchaseEligibility =
  | { eligible: true; draw: Draw; packagePriceCents: number }
  | { eligible: false; reason: "no_draw" | "flag_off" | "frozen" | "no_subscription" | "package_below_floor" | "no_cleared_payment" };

export async function drawPurchaseEligibility(memberId: string): Promise<PurchaseEligibility> {
  const draw = await currentDraw();
  if (!draw) return { eligible: false, reason: "no_draw" };
  if (!draw.purchase_enabled || !draw.ticket_price_cents) return { eligible: false, reason: "flag_off" };
  if (draw.status !== "open") return { eligible: false, reason: "frozen" };

  const db = createSvcClient();
  const [{ data: sub }, { data: floorSetting }, { data: payment }] = await Promise.all([
    db
      .from("subscription")
      .select("id, provider, package:package_id (monthly_price_cents)")
      .eq("member_id", memberId)
      .eq("status", "active")
      .gte("current_period_end", new Date().toISOString())
      .limit(1)
      .maybeSingle(),
    db.from("setting").select("value").eq("key", "draw_purchase_min_package_cents").maybeSingle(),
    db.from("payment_event").select("id").eq("member_id", memberId).limit(1).maybeSingle(),
  ]);

  if (!sub) return { eligible: false, reason: "no_subscription" };

  const floor = Number(floorSetting?.value ?? 4900);
  const price = (sub.package as unknown as { monthly_price_cents: number } | null)?.monthly_price_cents ?? 0;
  if (price < floor) return { eligible: false, reason: "package_below_floor" };

  if (!payment) return { eligible: false, reason: "no_cleared_payment" };

  return { eligible: true, draw, packagePriceCents: price };
}

/**
 * Records a completed ticket purchase and its entries. Deduplicated on
 * the provider reference (entry_purchase.provider_reference is unique),
 * so the callback-verify and webhook paths cannot double-record. If the
 * draw froze between payment and recording, the purchase row is written
 * for the money trail but no entries are minted, and the mismatch is
 * loudly logged for a manual refund: frozen means frozen.
 */
export async function recordTicketPurchase({
  drawId,
  memberId,
  count,
  amountCents,
  reference,
}: {
  drawId: string;
  memberId: string;
  count: number;
  amountCents: number;
  reference: string;
}): Promise<{ ok: boolean; duplicate?: boolean; entriesMinted?: boolean }> {
  const db = createSvcClient();

  const { data: purchase, error } = await db
    .from("entry_purchase")
    .insert({
      draw_id: drawId,
      member_id: memberId,
      amount_cents: amountCents,
      entry_count: count,
      provider_reference: reference,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return { ok: true, duplicate: true };
    console.error("SVC ticket purchase insert failed", error);
    return { ok: false };
  }

  const { data: draw } = await db.from("draw").select("status").eq("id", drawId).maybeSingle();
  if (draw?.status !== "open") {
    console.error(
      `SVC ticket purchase ${reference} completed after freeze of draw ${drawId}: no entries minted, refund manually`
    );
    return { ok: true, entriesMinted: false };
  }

  const { error: entryError } = await db.from("draw_entry").insert({
    draw_id: drawId,
    member_id: memberId,
    source: "purchased",
    entry_count: count,
    entry_purchase_id: purchase!.id,
  });
  if (entryError) {
    console.error("SVC ticket entry insert failed", entryError);
    return { ok: false };
  }
  return { ok: true, entriesMinted: true };
}
