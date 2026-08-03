"use server";

import { redirect } from "next/navigation";
import { svcPath } from "@/lib/svc/host";
import { getSvcAdmin } from "@/lib/svc/admin";
import { createSvcClient } from "@/lib/svc/db";
import { freezeDraw, drawWinner, publishDraw, fulfilPrize } from "@/lib/svc/draw";
import { periodFor } from "@/lib/svc/ledger";

async function requireAdmin() {
  const admin = await getSvcAdmin();
  if (!admin) redirect(await svcPath("/login"));
  return admin!;
}

async function back(query = "") {
  return `${await svcPath("/admin/draws")}${query}`;
}

/**
 * Creating or reconfiguring a draw. Configuration is open only while the
 * draw is: after the freeze the handoff forbids any alteration, and the
 * update below carries status checks that make the rule physical.
 */
export async function saveDraw(formData: FormData) {
  await requireAdmin();
  const period = String(formData.get("period") ?? "").trim() || periodFor();
  const prize = String(formData.get("prize") ?? "").trim();
  const prizeRand = Number(String(formData.get("prizeValue") ?? "0").replace(",", "."));
  const cutoff = String(formData.get("cutoff") ?? "").trim();
  const freeEntries = Number(formData.get("freeEntries") ?? 5);
  const thresholdRand = Number(String(formData.get("threshold") ?? "50").replace(",", "."));
  const ticketRand = Number(String(formData.get("ticketPrice") ?? "0").replace(",", "."));
  const purchaseEnabled = formData.get("purchaseEnabled") === "on";

  if (!/^\d{4}-\d{2}-01$/.test(period) || !prize || !cutoff) {
    redirect(await back("?error=fields"));
  }

  const cutoffDate = new Date(cutoff);
  if (Number.isNaN(cutoffDate.getTime())) redirect(await back("?error=cutoff"));

  const db = createSvcClient();
  const values = {
    period,
    prize_description: prize,
    prize_value_cents: prizeRand > 0 ? Math.round(prizeRand * 100) : null,
    cutoff_at: cutoffDate.toISOString(),
    free_entries_per_member: Number.isInteger(freeEntries) && freeEntries >= 0 ? freeEntries : 5,
    earn_threshold_cents: thresholdRand > 0 ? Math.round(thresholdRand * 100) : 5000,
    ticket_price_cents: ticketRand > 0 ? Math.round(ticketRand * 100) : null,
    purchase_enabled: purchaseEnabled,
  };

  const { data: existing } = await db.from("draw").select("id, status").eq("period", period).maybeSingle();
  if (existing) {
    if (existing.status !== "open") redirect(await back("?error=frozen"));
    const { error } = await db.from("draw").update(values).eq("id", existing.id).eq("status", "open");
    if (error) console.error("SVC draw update failed", error);
  } else {
    const { error } = await db.from("draw").insert(values);
    if (error) console.error("SVC draw insert failed", error);
  }
  redirect(await back("?saved=1"));
}

export async function freezeDrawNow(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("draw") ?? "");
  const result = await freezeDraw(id);
  redirect(await back(result.ok ? `?frozen=${result.total}` : `?error=${result.error}`));
}

export async function drawWinnerNow(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("draw") ?? "");
  const result = await drawWinner(id);
  redirect(await back(result.ok ? "?drawn=1" : `?error=${result.error}`));
}

export async function publishDrawNow(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("draw") ?? "");
  const result = await publishDraw(id);
  redirect(await back(result.ok ? "?published=1" : `?error=${result.error}`));
}

export async function fulfilPrizeNow(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("draw") ?? "");
  const result = await fulfilPrize(id);
  redirect(await back(result.ok ? "?fulfilled=1" : `?error=${result.error}`));
}
