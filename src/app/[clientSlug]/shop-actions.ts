"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { shopCheckoutSchema } from "@/lib/schemas/shop";
import { isRateLimited, clientIpFromHeaders } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email/resend";
import {
  getBobGoCredentials,
  getCheckoutRates,
  recordBobGoError,
  clearBobGoError,
  type BobGoAddress,
} from "@/lib/bobgo/client";

export type CartLine = { productId: string; quantity: number };

type CheckoutState =
  | { error?: Record<string, string[]> & { _form?: string[] }; success?: boolean }
  | null;

// docs/GROWTH_BOOKING_SHOP_MODULES_CLAUDE.md Sec 4.7: "Stock quantity
// updates run as atomic transactions during checkout to prevent overselling
// during concurrent purchases." Sprint 3 stub (payment lands Sprint 4, same
// reasoning as Booking's createBookingHold): an order confirms immediately
// as unpaid rather than waiting for a Paystack webhook that doesn't exist
// yet, but the atomic decrement is real today, not deferred — this is the
// actually hard, correctness-critical part, worth building now rather than
// twice.
export async function createShopOrder(
  growthClientId: string,
  ownerEmail: string | null,
  businessName: string,
  cart: CartLine[],
  _prevState: CheckoutState,
  formData: FormData
): Promise<CheckoutState> {
  const ip = clientIpFromHeaders(await headers());
  if (isRateLimited(`shop-checkout:${ip}`, 5, 10 * 60 * 1000)) {
    return { error: { _form: ["Too many attempts, please wait a few minutes and try again."] } };
  }

  if (cart.length === 0) {
    return { error: { _form: ["Your cart is empty."] } };
  }

  const parsed = shopCheckoutSchema.safeParse({
    customerName: formData.get("customerName"),
    customerEmail: formData.get("customerEmail"),
    customerPhone: formData.get("customerPhone") || undefined,
    line1: formData.get("line1"),
    line2: formData.get("line2") || undefined,
    suburb: formData.get("suburb") || undefined,
    city: formData.get("city"),
    province: formData.get("province") || undefined,
    postalCode: formData.get("postalCode"),
    couponCode: formData.get("couponCode") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const admin = createAdminClient();

  const productIds = cart.map((c) => c.productId);
  const { data: products } = await admin
    .from("shop_products")
    .select("id, title, sku, base_price_cents, status, weight_kg, length_cm, width_cm, height_cm, shop_product_variants(id, stock_quantity)")
    .in("id", productIds)
    .eq("growth_client_id", growthClientId);

  if (!products || products.length === 0) {
    return { error: { _form: ["These items are no longer available."] } };
  }

  type ProductRow = {
    id: string;
    title: string;
    sku: string;
    base_price_cents: number;
    status: string;
    weight_kg: number | null;
    length_cm: number | null;
    width_cm: number | null;
    height_cm: number | null;
    shop_product_variants: { id: string; stock_quantity: number }[];
  };

  const lineItems: {
    product_id: string;
    variant_id: string;
    sku: string;
    title: string;
    quantity: number;
    unit_price_cents: number;
  }[] = [];
  let subtotalCents = 0;

  for (const line of cart) {
    const product = (products as ProductRow[]).find((p) => p.id === line.productId);
    const variant = product?.shop_product_variants?.[0];
    if (!product || product.status !== "active" || !variant) {
      return { error: { _form: ["One of your items is no longer available."] } };
    }
    lineItems.push({
      product_id: product.id,
      variant_id: variant.id,
      sku: product.sku,
      title: product.title,
      quantity: line.quantity,
      unit_price_cents: product.base_price_cents,
    });
    subtotalCents += product.base_price_cents * line.quantity;
  }

  let discountCents = 0;
  let couponCode: string | null = null;
  if (parsed.data.couponCode) {
    const code = parsed.data.couponCode.toUpperCase();
    const { data: coupon } = await admin
      .from("shop_coupons")
      .select("id, code, discount_type, discount_value, max_uses, uses_count, is_active, starts_at, expires_at")
      .eq("growth_client_id", growthClientId)
      .eq("code", code)
      .eq("is_active", true)
      .maybeSingle();

    const now = new Date();
    const validWindow =
      coupon && (!coupon.starts_at || new Date(coupon.starts_at) <= now) && (!coupon.expires_at || new Date(coupon.expires_at) >= now);
    const validUses = coupon && (coupon.max_uses == null || coupon.uses_count < coupon.max_uses);

    if (coupon && validWindow && validUses) {
      discountCents =
        coupon.discount_type === "percentage"
          ? Math.round((subtotalCents * coupon.discount_value) / 100)
          : coupon.discount_value * 100;
      discountCents = Math.min(discountCents, subtotalCents);
      couponCode = coupon.code;
    } else {
      return { error: { _form: ["That coupon code isn't valid."] } };
    }
  }

  // The member's own delivery settings, which are the fallback whenever a
  // live courier quote is not available.
  //
  // Read from the database at checkout, never from the browser, for the
  // obvious reason that a delivery fee posted by the client is a delivery
  // fee the buyer can set to nothing.
  const { data: shopSettings } = await admin
    .from("growth_clients")
    .select("shop_flat_delivery_cents, shop_free_delivery_over_cents, shop_collection_address")
    .eq("id", growthClientId)
    .maybeSingle();

  const flatDelivery = shopSettings?.shop_flat_delivery_cents ?? 0;
  const freeOver = shopSettings?.shop_free_delivery_over_cents ?? null;

  // The threshold is judged on the discounted subtotal, which is what the
  // buyer actually pays. Judging it on the pre-discount figure would let a
  // coupon buy its way past a free-delivery line the member never offered.
  const payableGoods = subtotalCents - discountCents;
  const flatShipping = freeOver != null && payableGoods >= freeOver ? 0 : flatDelivery;

  // A live quote from the member's own courier account beats the flat rate,
  // because it is the real price to this buyer's actual address rather than
  // one number averaged across the country.
  //
  // The flat rate stays as the fallback and is never removed. A courier API
  // is a third party that can be slow, unhappy, or holding a token that
  // expired last week, and none of that is a reason to stop somebody buying
  // something. Quoting the member's own stated amount is a worse price than
  // the live one and a far better outcome than a broken checkout.
  const liveShipping = await liveShippingCents({
    growthClientId,
    collectionAddress: shopSettings?.shop_collection_address as CollectionAddress,
    deliveryAddress: {
      street_address: parsed.data.line1,
      local_area: parsed.data.suburb || undefined,
      city: parsed.data.city,
      zone: parsed.data.province || undefined,
      country: "ZA",
      code: parsed.data.postalCode,
    },
    // Items rather than parcels, which is what rates-at-checkout takes.
    // Bob Go work the packing out themselves from these dimensions, so
    // there is no box-fitting problem to solve at checkout.
    items: cart.map((line) => {
      const product = (products as ProductRow[]).find((p) => p.id === line.productId)!;
      return {
        description: product.title,
        price: product.base_price_cents / 100,
        quantity: line.quantity,
        length_cm: product.length_cm ?? 0,
        width_cm: product.width_cm ?? 0,
        height_cm: product.height_cm ?? 0,
        weight_kg: product.weight_kg ?? 0,
      };
    }),
    declaredValue: payableGoods / 100,
  });

  const shippingCents = liveShipping ?? flatShipping;
  const totalCents = payableGoods + shippingCents;

  const { data: order, error: orderError } = await admin
    .from("shop_orders")
    .insert({
      growth_client_id: growthClientId,
      line_items: lineItems,
      coupon_code: couponCode,
      discount_cents: discountCents,
      subtotal_cents: subtotalCents,
      shipping_cents: shippingCents,
      total_cents: totalCents,
      customer_name: parsed.data.customerName,
      customer_email: parsed.data.customerEmail,
      customer_phone: parsed.data.customerPhone || null,
      delivery_address: {
        line1: parsed.data.line1,
        line2: parsed.data.line2 || null,
        suburb: parsed.data.suburb || null,
        city: parsed.data.city,
        province: parsed.data.province || null,
        postal_code: parsed.data.postalCode,
      },
      payment_status: "unpaid",
    })
    .select("id")
    .single();

  if (orderError || !order) {
    console.error("Failed to create shop order", orderError);
    return { error: { _form: ["Could not complete your order, please try again."] } };
  }

  // The atomic part (Sec 4.7): supabase-js's `.update()` can't reference a
  // column's own current value, so a real conditional decrement needs the
  // decrement_variant_stock() Postgres function (migration
  // 20260718120000_add_shop_stock_functions.sql) — an empty result means
  // that variant didn't have enough stock left, run per line item.
  let oversold = false;
  for (const item of lineItems) {
    const { data: decremented } = await admin.rpc("decrement_variant_stock", {
      p_variant_id: item.variant_id,
      p_quantity: item.quantity,
    });
    if (!decremented || decremented.length === 0) {
      oversold = true;
    }
  }

  if (oversold) {
    await admin.from("shop_orders").update({ payment_status: "oversold" }).eq("id", order.id);
  } else {
    for (const item of lineItems) {
      await admin.rpc("increment_product_sale_count", { p_product_id: item.product_id, p_quantity: item.quantity });
    }
  }

  revalidatePath(`/[clientSlug]`, "page");

  if (ownerEmail) {
    try {
      await sendEmail({
        to: ownerEmail,
        subject: `New order: ${parsed.data.customerName}`,
        html: `
          <p>Good day ${businessName},</p>
          <p>You've got a new order from your DigitalFlyer SA page. Payment isn't collected automatically yet. Please arrange payment directly with the customer before shipping.</p>
          <p><strong>Items:</strong></p>
          <ul>${lineItems.map((i) => `<li>${i.quantity} × ${i.title} (${i.sku})</li>`).join("")}</ul>
          <p><strong>Total:</strong> R${(totalCents / 100).toFixed(2)}</p>
          <p><strong>Deliver to:</strong> ${parsed.data.line1}, ${parsed.data.city}, ${parsed.data.postalCode}</p>
          <p><strong>Customer:</strong> ${parsed.data.customerName} · ${parsed.data.customerEmail}${parsed.data.customerPhone ? ` · ${parsed.data.customerPhone}` : ""}</p>
          <p>View it in your <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard">dashboard</a>.</p>
        `,
      });
    } catch (err) {
      console.error("Order notification email failed", err);
    }
  }

  return { success: true };
}

type CollectionAddress = { line1?: string; city?: string; postalCode?: string } | null;

/**
 * A live delivery price from the member's own courier account, or null.
 *
 * Null means "use the flat rate", and there are several honest reasons to
 * get one: the member has not connected Bob Go, they have not set a
 * collection address, their products have no dimensions, or Bob Go did not
 * answer. Every one of those returns null rather than throwing, because the
 * person on the other end of this is trying to buy something and a courier
 * API is not a good enough reason to stop them.
 *
 * Dewald, 2026-07-30: "we will just need to ensure the member is well aware
 * of this part and why it is important." The dimensions check below is the
 * enforcement of that. A product with no size would be quoted as if it were
 * nothing, and the member would eat the difference on every sale.
 */
async function liveShippingCents({
  growthClientId,
  collectionAddress,
  deliveryAddress,
  items,
  declaredValue,
}: {
  growthClientId: string;
  collectionAddress: CollectionAddress;
  deliveryAddress: BobGoAddress;
  items: { description: string; price: number; quantity: number; length_cm: number; width_cm: number; height_cm: number; weight_kg: number }[];
  declaredValue: number;
}): Promise<number | null> {
  const credentials = await getBobGoCredentials(growthClientId);
  if (!credentials) return null;

  if (!collectionAddress?.line1 || !collectionAddress.city || !collectionAddress.postalCode) {
    await recordBobGoError(growthClientId, "No collection address is set, so no courier can be quoted.");
    return null;
  }

  // A courier prices by size and weight. Quoting a parcel with neither is
  // not a quote, it is a number that will be corrected later at the
  // member's expense, so it is not attempted.
  if (items.some((i) => i.weight_kg <= 0 || i.length_cm <= 0 || i.width_cm <= 0 || i.height_cm <= 0)) {
    await recordBobGoError(
      growthClientId,
      "Some products have no size or weight set, so a courier cannot price them."
    );
    return null;
  }

  const result = await getCheckoutRates({
    token: credentials.token,
    sandbox: credentials.sandbox,
    collectionAddress: {
      street_address: collectionAddress.line1,
      city: collectionAddress.city,
      country: "ZA",
      code: collectionAddress.postalCode,
    },
    deliveryAddress,
    items,
    declaredValue,
  });

  if (!result.ok) {
    await recordBobGoError(growthClientId, result.error);
    return null;
  }

  // Bob Go can legitimately return nothing, which is how a member says "I do
  // not deliver there" through their own rules. Falling back to the flat
  // rate is the wrong answer to that, but refusing the sale outright is a
  // bigger change than this slice should make, so it falls back and the
  // member is told their rules produced no option.
  const rates = result.data.filter((r) => typeof r.rate === "number" && r.rate >= 0);
  if (rates.length === 0) {
    await recordBobGoError(growthClientId, "Bob Go returned no delivery options for that address.");
    return null;
  }

  // The cheapest, until the buyer is offered a choice of service levels.
  // Picking the cheapest is the option a buyer would pick for themselves far
  // more often than not, and it never surprises them upward.
  const cheapest = rates.reduce((low, r) => (r.rate < low.rate ? r : low), rates[0]);

  await clearBobGoError(growthClientId);
  return Math.round(cheapest.rate * 100);
}
