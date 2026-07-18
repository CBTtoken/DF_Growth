"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { shopCheckoutSchema } from "@/lib/schemas/shop";
import { isRateLimited, clientIpFromHeaders } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email/resend";

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
    return { error: { _form: ["Too many attempts — please wait a few minutes and try again."] } };
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
    .select("id, title, sku, base_price_cents, status, shop_product_variants(id, stock_quantity)")
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

  // Sec 4.4: "shipping tiers... before payment" — Sprint 3 has no live Bob
  // Go rates yet (Sprint 5), so this stays 0 rather than guessing a number.
  const shippingCents = 0;
  const totalCents = subtotalCents - discountCents + shippingCents;

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
          <p>You've got a new order from your DigitalFlyer SA page. Payment isn't collected automatically yet — please arrange payment directly with the customer before shipping.</p>
          <p><strong>Items:</strong></p>
          <ul>${lineItems.map((i) => `<li>${i.quantity} × ${i.title} (${i.sku})</li>`).join("")}</ul>
          <p><strong>Total:</strong> R${(totalCents / 100).toFixed(2)}</p>
          <p><strong>Deliver to:</strong> ${parsed.data.line1}, ${parsed.data.city}, ${parsed.data.postalCode}</p>
          <p><strong>Customer:</strong> ${parsed.data.customerName} — ${parsed.data.customerEmail}${parsed.data.customerPhone ? ` — ${parsed.data.customerPhone}` : ""}</p>
          <p>View it in your <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard">dashboard</a>.</p>
        `,
      });
    } catch (err) {
      console.error("Order notification email failed", err);
    }
  }

  return { success: true };
}
