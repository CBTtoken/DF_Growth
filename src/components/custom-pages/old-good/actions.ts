"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { OG_DELIVERY, OG_FREE_OVER_CENTS, OG_MARKETS } from "./og-data";

/**
 * The Old Good demo checkout. Records a real shop_orders row on the demo
 * member (so the rail, the dashboard and the stall view all tell one
 * story), and refuses clearly when a piece was taken first: every item is
 * one of one, and "someone beat you to it" said out loud beats an oversold
 * order flagged after the fact.
 *
 * Deliberately sends no email. Demo reservations are play, and the handoff
 * bans real customer data flows; the order list in the dashboard is the
 * record. No payment path exists here at all.
 */

export type OldGoodOrderState =
  | null
  | { ok: true; ref: string; market: string | null }
  | { ok: false; error?: string; beaten?: string[] };

export async function placeOldGoodOrder(
  clientId: string,
  _prev: OldGoodOrderState,
  formData: FormData
): Promise<OldGoodOrderState> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const turnstileOk = await verifyTurnstileToken(String(formData.get("turnstileToken") ?? ""), ip);
  if (!turnstileOk) {
    return { ok: false, error: "We could not confirm you are a person. Reload the page and try again." };
  }

  const buyerName = String(formData.get("buyerName") ?? "").trim().slice(0, 80);
  const buyerPhone = String(formData.get("buyerPhone") ?? "").trim().slice(0, 20);
  if (buyerName.length < 2) return { ok: false, error: "A name, so the stall knows who you are." };
  if (buyerPhone.length < 6) return { ok: false, error: "A number, so the stall can find your reservation." };

  let ids: string[] = [];
  try {
    ids = (JSON.parse(String(formData.get("items") ?? "[]")) as string[]).filter(
      (v) => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v)
    );
  } catch {
    return { ok: false, error: "Your bag did not come through. Try again." };
  }
  if (ids.length === 0 || ids.length > 12) return { ok: false, error: "Your bag is empty." };

  const deliveryId = String(formData.get("deliveryId") ?? "pudo");
  const option = OG_DELIVERY.find((d) => d.id === deliveryId) ?? OG_DELIVERY[0];
  const marketRaw = String(formData.get("market") ?? "").trim();
  const market = option.id === "market" ? (OG_MARKETS.find((m) => m.name === marketRaw)?.name ?? OG_MARKETS[0].name) : null;

  const admin = createAdminClient();
  const { data: products } = await admin
    .from("shop_products")
    .select("id, title, base_price_cents, track_stock, status, shop_product_variants(id, stock_quantity, is_active)")
    .eq("growth_client_id", clientId)
    .in("id", ids);

  const rows = products ?? [];
  if (rows.length !== ids.length) return { ok: false, error: "Something in your bag is no longer on the rail." };

  // One of one: anything already gone fails the whole reservation, named.
  const beaten = rows
    .filter((p) => {
      const v = (p.shop_product_variants ?? []).filter((x) => x.is_active)[0];
      return p.status !== "active" || (p.track_stock && (v?.stock_quantity ?? 0) <= 0);
    })
    .map((p) => p.title);
  if (beaten.length > 0) return { ok: false, beaten };

  const subtotal = rows.reduce((s, p) => s + p.base_price_cents, 0);
  const shipping = option.id === "market" ? 0 : subtotal >= OG_FREE_OVER_CENTS ? 0 : option.priceCents;

  const lineItems = rows.map((p) => ({
    product_id: p.id,
    variant_id: (p.shop_product_variants ?? []).filter((x) => x.is_active)[0]?.id,
    title: p.title,
    quantity: 1,
    unit_price_cents: p.base_price_cents,
  }));

  const { data: order, error: insertError } = await admin
    .from("shop_orders")
    .insert({
      growth_client_id: clientId,
      line_items: lineItems,
      subtotal_cents: subtotal,
      discount_cents: 0,
      shipping_cents: shipping,
      total_cents: subtotal + shipping,
      customer_name: buyerName,
      customer_phone: buyerPhone,
      customer_email: null,
      delivery_method: option.id === "market" ? "collection" : "delivery",
      // The column is NOT NULL; a collection order records where it is
      // collected rather than a street address.
      delivery_address:
        option.id === "market"
          ? { line1: `Collect at: ${market}`, city: "", postalCode: "" }
          : { line1: `Demo reservation, ${option.label}`, city: "", postalCode: "" },
      payment_status: "unpaid",
      member_note: market ? `DEMO. ${option.label}. Collect at: ${market}` : `DEMO. ${option.label}`,
      marketing_consent: false,
    })
    .select("id")
    .single();

  if (insertError || !order) return { ok: false, error: "Could not save the reservation. Try again." };

  // The same conditional decrement the real shop uses: if a race is lost
  // here, the reservation is rolled back and the loser is told, rather
  // than two people leaving with one jacket.
  const trackedIds = new Set(rows.filter((p) => p.track_stock).map((p) => p.id));
  const lost: string[] = [];
  for (const line of lineItems) {
    // Only tracked products decrement — an untracked product's stock number
    // is meaningless and the conditional decrement would fail every time.
    if (!line.variant_id || !trackedIds.has(line.product_id)) continue;
    const { data } = await admin.rpc("decrement_variant_stock", {
      p_variant_id: line.variant_id,
      p_quantity: 1,
    });
    if (!data || data.length === 0) lost.push(line.title);
  }
  if (lost.length > 0) {
    await admin.from("shop_orders").delete().eq("id", order.id);
    return { ok: false, beaten: lost };
  }

  return { ok: true, ref: order.id.split("-").pop()?.toUpperCase() ?? order.id, market };
}
