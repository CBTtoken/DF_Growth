import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { memberBobPayCreds, validateBobPayNotification, verifyBobPayPayment } from "@/lib/shop/bobpay";
import { addressLineOf, notifyOrderPlaced } from "@/lib/shop/notify";
import { addressParts, type DeliveryAddress, type OrderLine } from "@/lib/orders/line-items";
import type { ShopOwner } from "@/lib/shop/queries";

/**
 * Bob Pay's payment notification (Handoff Sec 2.1). A notification body on
 * its own proves nothing — anyone can POST JSON at a public URL — so
 * nothing here is believed until two independent checks pass, both made
 * with the member's own credentials:
 *
 *  1. The payload is sent back to Bob Pay's validate endpoint, which
 *     confirms this exact notification is genuine.
 *  2. The payment status is then read from Bob Pay's own query API,
 *     which is the answer that actually moves the order to paid.
 *
 * The order is found by custom_payment_id, which is our own order
 * reference, and the paid transition is guarded on current status so a
 * replayed notification changes nothing and sends no second email. The
 * buyer's return page runs the same settle logic; whichever arrives first
 * wins and the other finds the work already done.
 */
export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const reference = String(payload.custom_payment_id ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(reference)) {
    // Not one of ours. Acknowledged so Bob Pay stops retrying; nothing
    // matched, nothing changed.
    return NextResponse.json({ received: true });
  }

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("shop_orders")
    .select(
      "id, growth_client_id, line_items, total_cents, shipping_cents, customer_name, customer_email, customer_phone, delivery_address, delivery_method, payment_status, gateway, paystack_reference"
    )
    .eq("paystack_reference", reference)
    .eq("gateway", "bobpay")
    .maybeSingle();

  if (!order) return NextResponse.json({ received: true });

  const creds = await memberBobPayCreds(order.growth_client_id);
  if (!creds) return NextResponse.json({ received: true });

  // The notification must name the member's own recipient account. A
  // mismatch means this payload is about somebody else's money at best.
  if (String(payload.recipient_account_code ?? "") !== creds.accountCode) {
    console.error("Bob Pay notify: account code mismatch for order", order.id);
    return NextResponse.json({ received: true });
  }

  const genuine = await validateBobPayNotification(creds, payload);
  if (!genuine) {
    console.error("Bob Pay notify: validate rejected payload for order", order.id);
    return NextResponse.json({ received: true });
  }

  const verdict = await verifyBobPayPayment(creds, reference);
  if (!verdict.paid) return NextResponse.json({ received: true });

  const { data: transitioned } = await admin
    .from("shop_orders")
    .update({
      payment_status: "paid",
      updated_at: new Date().toISOString(),
      ...(verdict.paymentId != null ? { bobpay_payment_id: verdict.paymentId } : {}),
    })
    .eq("id", order.id)
    .eq("payment_status", "unpaid")
    .select("id");

  if (transitioned && transitioned.length > 0) {
    const { data: client } = await admin
      .from("growth_clients")
      .select("slug, business_name, contact_email")
      .eq("id", order.growth_client_id)
      .single();

    if (client) {
      const parts = addressParts(order.delivery_address as DeliveryAddress);
      const method = order.delivery_method === "collection" ? "collection" : "delivery";
      await notifyOrderPlaced({
        // notifyOrderPlaced reads business_name and contact_email only; the
        // rest of ShopOwner is render plumbing a webhook has no use for.
        owner: { business_name: client.business_name, contact_email: client.contact_email } as ShopOwner,
        orderPath: `/${client.slug}/shop/order/${order.id}`,
        lineItems: (order.line_items ?? []) as OrderLine[],
        totalCents: order.total_cents,
        shippingCents: order.shipping_cents,
        deliveryMethod: method,
        buyerName: order.customer_name,
        buyerPhone: order.customer_phone ?? "",
        buyerEmail: order.customer_email,
        addressLine: addressLineOf(method, {
          line1: parts.line1,
          suburb: parts.suburb,
          city: parts.city,
          postalCode: parts.postalCode,
        }),
        paid: true,
      });
    }
  }

  return NextResponse.json({ received: true });
}
