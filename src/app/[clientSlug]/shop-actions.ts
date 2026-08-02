"use server";

import crypto from "crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { shopCheckoutSchema } from "@/lib/schemas/shop";
import { isRateLimited, clientIpFromHeaders } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { addressLineOf, notifyOrderPlaced } from "@/lib/shop/notify";
import { sendOrderLookupEmail } from "@/lib/email/shop-order";
import { getShopOwner, type ShopOwner } from "@/lib/shop/queries";
import { deliveryChargeCents, needsDeliveryAddress } from "@/lib/shop/delivery";
import { startMemberPayment } from "@/lib/shop/gateway";
import type { OrderLine } from "@/lib/orders/line-items";
import {
  getBobGoCredentials,
  getCheckoutRates,
  recordBobGoError,
  clearBobGoError,
  type BobGoAddress,
} from "@/lib/bobgo/client";

export type CartLine = { productId: string; variantId: string | null; quantity: number };

export type CheckoutState =
  | {
      error?: Record<string, string[]> & { _form?: string[] };
      /** Where the browser goes next: this site's confirmation, or Paystack. */
      redirectTo?: string;
      external?: boolean;
    }
  | null;

/**
 * A guest checkout, and the two ways it can end.
 *
 * Handoff Sec 1.3. No account, ever: "Requiring a buyer to register is the
 * single biggest conversion killer for this market." So there is no user
 * here, no session, and nothing to log into. The only things collected are
 * the ones needed to fulfil the order.
 *
 * Which of the two paths runs is decided by whether the member has connected
 * a gateway, and the one without is the normal case rather than the
 * fallback. Both have to feel finished: an order on the unpaid path is a
 * real order, recorded, emailed and visible in the dashboard, and the buyer
 * is told plainly what happens next rather than being left looking at a page
 * that reads as half built.
 *
 * Every price, every stock number and every delivery charge below is read
 * from the database, never from the submitted form. The cart in the buyer's
 * browser is a note about what they want, not a claim about what it costs.
 */
export async function placeShopOrder(
  clientSlug: string,
  cart: CartLine[],
  _prevState: CheckoutState,
  formData: FormData
): Promise<CheckoutState> {
  const ip = clientIpFromHeaders(await headers());
  if (isRateLimited(`shop-checkout:${ip}`, 8, 10 * 60 * 1000)) {
    return { error: { _form: ["Too many attempts, please wait a few minutes and try again."] } };
  }

  // The actual bot gate. Checkout was the only public form in this codebase
  // without one, while reviews, board posts, events, agent applications and
  // the KatisoBiz signup all had it. It was also the most worth abusing: a
  // scripted flood of orders on the no-gateway path costs the member a
  // morning of phoning numbers that do not answer, and holds stock on any
  // product that counts it.
  //
  // Verified against Cloudflare rather than trusted for being present,
  // because a token nobody checks is a hidden field anyone can type into.
  const turnstileOk = await verifyTurnstileToken(String(formData.get("turnstileToken") ?? ""), ip);
  if (!turnstileOk) {
    return {
      error: { _form: ["We could not confirm you are a person. Please reload the page and try again."] },
    };
  }

  if (cart.length === 0) return { error: { _form: ["Your basket is empty."] } };
  if (cart.some((line) => !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 999)) {
    return { error: { _form: ["Check the quantities in your basket."] } };
  }

  const owner = await getShopOwner(clientSlug);
  if (!owner) return { error: { _form: ["This shop is not taking orders at the moment."] } };

  const parsed = shopCheckoutSchema.safeParse({
    customerName: formData.get("customerName"),
    customerPhone: formData.get("customerPhone"),
    customerEmail: formData.get("customerEmail") || "",
    deliveryMethod: formData.get("deliveryMethod") || "delivery",
    line1: formData.get("line1") || "",
    line2: formData.get("line2") || "",
    suburb: formData.get("suburb") || "",
    city: formData.get("city") || "",
    province: formData.get("province") || "",
    postalCode: formData.get("postalCode") || "",
    couponCode: formData.get("couponCode") || "",
    marketingConsent: formData.get("marketingConsent") ?? false,
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  // A shop that only does collection cannot be talked into delivering by a
  // posted form field, and one that delivers cannot be talked out of
  // charging for it.
  const deliveryMethod = needsDeliveryAddress(owner.delivery.mode) ? parsed.data.deliveryMethod : "collection";
  const buyerEmail = parsed.data.customerEmail?.trim() || null;

  // Paystack will not open a transaction without an email address, and the
  // receipt it sends goes there. So the one case where email stops being
  // optional is the one where the buyer is about to pay online, and they
  // are told why rather than just being refused.
  if (owner.hasGateway && !buyerEmail) {
    return {
      error: {
        customerEmail: ["We need an email address to send your payment receipt to."],
      },
    };
  }

  // A durable check on top of the in-memory limiter above, which lives in
  // one serverless instance's memory and resets on every cold start, so it
  // cannot see a flood spread across instances or across an hour. This one
  // asks the database.
  //
  // Keyed on the phone number rather than the address, because the abuse
  // that actually costs a member their morning is one number ordering
  // fifteen times, and because an office or a mobile network puts a lot of
  // real buyers behind a single IP. Only unpaid orders count, so a genuine
  // repeat customer who keeps paying is never blocked.
  const waiting = await unpaidOrdersFromPhone(owner.id, parsed.data.customerPhone);
  if (waiting >= 5) {
    return {
      error: {
        _form: [
          "You already have several orders waiting with this seller. Please speak to them before placing another.",
        ],
      },
    };
  }

  const priced = await priceCart(owner, cart);
  if ("error" in priced) return { error: { _form: [priced.error] } };

  const { lineItems, subtotalCents, trackedLines } = priced;

  const coupon = await applyCoupon(owner.id, parsed.data.couponCode, subtotalCents);
  if ("error" in coupon) return { error: { couponCode: [coupon.error] } };

  const payableGoods = subtotalCents - coupon.discountCents;

  // The member's own settings decide the charge, and a live courier quote
  // beats a flat rate when there is one. Null means quote on request, which
  // is not zero: zero would print "Delivery: included" on a confirmation for
  // an order whose delivery cost nobody has worked out yet.
  let shippingCents = deliveryChargeCents(owner.delivery, payableGoods, deliveryMethod);

  if (shippingCents !== null && shippingCents > 0 && deliveryMethod === "delivery") {
    const live = await liveShippingCents({
      growthClientId: owner.id,
      collectionAddress: owner.delivery.collectionAddress,
      deliveryAddress: {
        street_address: parsed.data.line1 ?? "",
        local_area: parsed.data.suburb || undefined,
        city: parsed.data.city ?? "",
        zone: parsed.data.province || undefined,
        country: "ZA",
        code: parsed.data.postalCode ?? "",
      },
      items: priced.courierItems,
      declaredValue: payableGoods / 100,
    });
    if (live !== null) shippingCents = live;
  }

  const totalCents = payableGoods + (shippingCents ?? 0);

  // Ours, not Paystack's, and generated before the order is written so the
  // row can be found again on the way back from a hosted checkout without
  // matching on anything a person typed. Keying that lookup on a name or an
  // email would be a bug waiting for two buyers called the same thing.
  const reference = `dfshop_${crypto.randomUUID().replace(/-/g, "")}`;

  const admin = createAdminClient();
  const { data: order, error: orderError } = await admin
    .from("shop_orders")
    .insert({
      growth_client_id: owner.id,
      line_items: lineItems,
      coupon_code: coupon.code,
      discount_cents: coupon.discountCents,
      subtotal_cents: subtotalCents,
      shipping_cents: shippingCents ?? 0,
      total_cents: totalCents,
      customer_name: parsed.data.customerName,
      customer_email: buyerEmail,
      customer_phone: parsed.data.customerPhone,
      delivery_method: deliveryMethod,
      delivery_address:
        deliveryMethod === "delivery"
          ? {
              line1: parsed.data.line1,
              line2: parsed.data.line2 || null,
              suburb: parsed.data.suburb || null,
              city: parsed.data.city,
              province: parsed.data.province || null,
              postal_code: parsed.data.postalCode,
            }
          : {},
      marketing_consent: parsed.data.marketingConsent,
      payment_status: "unpaid",
      paystack_reference: reference,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    console.error("Failed to create shop order", orderError);
    return { error: { _form: ["Could not complete your order, please try again."] } };
  }

  await decrementTrackedStock(trackedLines, order.id);

  if (coupon.id) {
    await admin.rpc("increment_coupon_use", { p_coupon_id: coupon.id }).then(
      () => undefined,
      // The coupon counter is bookkeeping. A failure here must never undo a
      // real order that has already been written.
      (err) => console.error("Could not record coupon use", err)
    );
  }

  const orderPath = `/${clientSlug}/shop/order/${order.id}`;

  // The paying path. If Paystack will not open a transaction, the order is
  // already recorded and the buyer is not sent into a dead end: it falls
  // through to the unpaid path below, the member is emailed, and the buyer
  // is told the seller will be in touch. A sale that completes awkwardly
  // beats a sale that vanishes.
  if (owner.hasGateway && buyerEmail) {
    const payment = await startMemberPayment({
      growthClientId: owner.id,
      email: buyerEmail,
      amountCents: totalCents,
      reference,
      callbackUrl: `${process.env.NEXT_PUBLIC_SITE_URL}${orderPath}`,
      metadata: { order_id: order.id, growth_client_id: owner.id },
    });

    if ("authorizationUrl" in payment) {
      return { redirectTo: payment.authorizationUrl, external: true };
    }
  }

  await notifyOrderPlaced({
    owner,
    orderPath,
    lineItems,
    totalCents,
    shippingCents,
    deliveryMethod,
    buyerName: parsed.data.customerName,
    buyerPhone: parsed.data.customerPhone,
    buyerEmail,
    addressLine: addressLineOf(deliveryMethod, parsed.data),
    paid: false,
  });

  revalidatePath("/dashboard");
  return { redirectTo: orderPath };
}

type LookupState = { error?: string; sent?: boolean } | null;

/**
 * "Where is my order", answered without an account.
 *
 * Every order already has its own unguessable status page. All this does is
 * post those links back to the email address that placed the orders, which
 * is why it needs no password: knowing an address gets a stranger nothing
 * unless they can also read that inbox.
 *
 * The reply is deliberately the same whether or not anything was found.
 * Telling somebody "no orders for that address" turns this into a way to
 * ask a stranger's shop whether a particular person has bought from them,
 * which is exactly the kind of disclosure POPIA is about.
 */
export async function emailMyOrders(
  clientSlug: string,
  _prevState: LookupState,
  formData: FormData
): Promise<LookupState> {
  const ip = clientIpFromHeaders(await headers());
  if (isRateLimited(`shop-lookup:${ip}`, 5, 15 * 60 * 1000)) {
    return { error: "Too many attempts, please wait a few minutes and try again." };
  }

  const turnstileOk = await verifyTurnstileToken(String(formData.get("turnstileToken") ?? ""), ip);
  if (!turnstileOk) {
    return { error: "We could not confirm you are a person. Please reload the page and try again." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) return { error: "Enter the email address you used." };

  const owner = await getShopOwner(clientSlug);
  if (!owner) return { error: "This shop is not available at the moment." };

  const admin = createAdminClient();
  // Twelve months, matching the retention policy for Growth data generally.
  // Anything older has been kept long enough.
  const since = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();

  const { data: orders } = await admin
    .from("shop_orders")
    .select("id, created_at, total_cents, payment_status, fulfilment_status")
    .eq("growth_client_id", owner.id)
    .ilike("customer_email", email)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(25);

  if (orders && orders.length > 0) {
    await sendOrderLookupEmail({
      to: email,
      businessName: owner.business_name,
      orders: orders.map((order) => ({
        reference: order.id.split("-").pop()?.toUpperCase() ?? order.id,
        placedOn: new Date(order.created_at).toLocaleDateString("en-ZA", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        totalCents: order.total_cents,
        status: describeStatus(order.payment_status, order.fulfilment_status),
        url: `${process.env.NEXT_PUBLIC_SITE_URL}/${clientSlug}/shop/order/${order.id}`,
      })),
    });
  }

  // Same answer either way. See the note above.
  return { sent: true };
}

function describeStatus(paymentStatus: string, fulfilmentStatus: string): string {
  if (fulfilmentStatus === "cancelled") return "Cancelled";
  if (fulfilmentStatus === "shipped" || fulfilmentStatus === "delivered") return "Sent";
  return paymentStatus === "paid" ? "Paid, not sent yet" : "Waiting for payment";
}

/** How many orders this number already has waiting, unpaid, in the last hour. */
async function unpaidOrdersFromPhone(growthClientId: string, phone: string): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("shop_orders")
    .select("id", { count: "exact", head: true })
    .eq("growth_client_id", growthClientId)
    .eq("customer_phone", phone)
    .eq("payment_status", "unpaid")
    .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

  return count ?? 0;
}

// ============================================================
// Pricing
// ============================================================

type PricedCart =
  | { error: string }
  | {
      lineItems: OrderLine[];
      subtotalCents: number;
      /** Only the lines whose product actually counts its stock. */
      trackedLines: { variantId: string; quantity: number; productId: string }[];
      courierItems: {
        description: string;
        price: number;
        quantity: number;
        length_cm: number;
        width_cm: number;
        height_cm: number;
        weight_kg: number;
      }[];
    };

async function priceCart(owner: ShopOwner, cart: CartLine[]): Promise<PricedCart> {
  const admin = createAdminClient();
  const { data: products } = await admin
    .from("shop_products")
    .select(
      "id, title, sku, base_price_cents, status, track_stock, weight_kg, length_cm, width_cm, height_cm, shop_product_variants(id, sku, descriptor, price_cents, stock_quantity, is_active)"
    )
    .in("id", cart.map((line) => line.productId))
    .eq("growth_client_id", owner.id);

  if (!products || products.length === 0) {
    return { error: "These items are no longer available." };
  }

  type Row = {
    id: string;
    title: string;
    sku: string;
    base_price_cents: number;
    status: string;
    track_stock: boolean;
    weight_kg: number | null;
    length_cm: number | null;
    width_cm: number | null;
    height_cm: number | null;
    shop_product_variants: {
      id: string;
      sku: string;
      descriptor: Record<string, string> | null;
      price_cents: number | null;
      stock_quantity: number;
      is_active: boolean;
    }[];
  };

  const lineItems: OrderLine[] = [];
  const trackedLines: { variantId: string; quantity: number; productId: string }[] = [];
  const courierItems: Extract<PricedCart, { courierItems: unknown }>["courierItems"] = [];
  let subtotalCents = 0;

  for (const line of cart) {
    const product = (products as Row[]).find((p) => p.id === line.productId);
    if (!product || product.status !== "active") {
      return { error: "One of your items is no longer available." };
    }

    const active = product.shop_product_variants.filter((v) => v.is_active);
    // A variant id from the browser is only ever used to pick from this
    // product's own list. It is never trusted as a key on its own, which is
    // what stops somebody pairing a cheap product with another product's
    // variant price.
    const variant = (line.variantId && active.find((v) => v.id === line.variantId)) || active[0];
    if (!variant) return { error: "One of your items is no longer available." };

    if (product.track_stock && variant.stock_quantity < line.quantity) {
      return {
        error:
          variant.stock_quantity <= 0
            ? `${product.title} has just sold out.`
            : `Only ${variant.stock_quantity} of ${product.title} left. Please lower the quantity.`,
      };
    }

    const unitPriceCents = variant.price_cents ?? product.base_price_cents;

    lineItems.push({
      product_id: product.id,
      variant_id: variant.id,
      sku: variant.sku || product.sku,
      title: product.title,
      descriptor: variant.descriptor ?? null,
      quantity: line.quantity,
      unit_price_cents: unitPriceCents,
    });

    if (product.track_stock) {
      trackedLines.push({ variantId: variant.id, quantity: line.quantity, productId: product.id });
    }

    courierItems.push({
      description: product.title,
      price: unitPriceCents / 100,
      quantity: line.quantity,
      length_cm: product.length_cm ?? 0,
      width_cm: product.width_cm ?? 0,
      height_cm: product.height_cm ?? 0,
      weight_kg: product.weight_kg ?? 0,
    });

    subtotalCents += unitPriceCents * line.quantity;
  }

  return { lineItems, subtotalCents, trackedLines, courierItems };
}

async function applyCoupon(
  growthClientId: string,
  code: string | undefined,
  subtotalCents: number
): Promise<{ error: string } | { code: string | null; discountCents: number; id: string | null }> {
  if (!code) return { code: null, discountCents: 0, id: null };

  const admin = createAdminClient();
  const { data: coupon } = await admin
    .from("shop_coupons")
    .select("id, code, discount_type, discount_value, max_uses, uses_count, is_active, starts_at, expires_at")
    .eq("growth_client_id", growthClientId)
    .eq("code", code.toUpperCase())
    .eq("is_active", true)
    .maybeSingle();

  const now = new Date();
  const inWindow =
    coupon && (!coupon.starts_at || new Date(coupon.starts_at) <= now) && (!coupon.expires_at || new Date(coupon.expires_at) >= now);
  const hasUsesLeft = coupon && (coupon.max_uses == null || coupon.uses_count < coupon.max_uses);

  if (!coupon || !inWindow || !hasUsesLeft) return { error: "That code is not valid." };

  const raw =
    coupon.discount_type === "percentage"
      ? Math.round((subtotalCents * coupon.discount_value) / 100)
      : coupon.discount_value * 100;

  return { code: coupon.code, discountCents: Math.min(raw, subtotalCents), id: coupon.id };
}

/**
 * Takes stock off the products that actually count it.
 *
 * Only those. A product with track_stock off sits at whatever number it was
 * created with, usually zero, and running the conditional decrement against
 * it would fail every time and flag every order as oversold. That is not a
 * hypothetical: track_stock defaults to off, which makes it the common case.
 */
async function decrementTrackedStock(
  lines: { variantId: string; quantity: number; productId: string }[],
  orderId: string
): Promise<void> {
  if (lines.length === 0) return;
  const admin = createAdminClient();

  let oversold = false;
  for (const line of lines) {
    const { data } = await admin.rpc("decrement_variant_stock", {
      p_variant_id: line.variantId,
      p_quantity: line.quantity,
    });
    // An empty result means somebody else got the last one between the
    // check above and this write. The order stands and is flagged, because
    // the money may already have moved and a seller needs to know.
    if (!data || data.length === 0) oversold = true;
  }

  if (oversold) {
    await admin.from("shop_orders").update({ payment_status: "oversold" }).eq("id", orderId);
  }
}

// ============================================================
// Live courier rates, unchanged from what was already here
// ============================================================

type CollectionAddress = { line1?: string; city?: string; postalCode?: string } | null;

/**
 * A live delivery price from the member's own courier account, or null.
 *
 * Null means "use the member's own rate", and there are several honest
 * reasons to get one: they have not connected Bob Go, they have not set a
 * collection address, their products have no dimensions, or Bob Go did not
 * answer. Every one of those returns null rather than throwing, because the
 * person on the other end of this is trying to buy something and a courier
 * API is not a good enough reason to stop them.
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

  const rates = result.data.filter((r) => typeof r.rate === "number" && r.rate >= 0);
  if (rates.length === 0) {
    await recordBobGoError(growthClientId, "Bob Go returned no delivery options for that address.");
    return null;
  }

  // The cheapest, until the buyer is offered a choice of service levels.
  // It is the option a buyer would pick for themselves far more often than
  // not, and it never surprises them upward.
  const cheapest = rates.reduce((low, r) => (r.rate < low.rate ? r : low), rates[0]);

  await clearBobGoError(growthClientId);
  return Math.round(cheapest.rate * 100);
}
