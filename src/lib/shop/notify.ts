import { sendShopOrderToBuyer, sendShopOrderToMember } from "@/lib/email/shop-order";
import type { OrderLine } from "@/lib/orders/line-items";
import type { ShopOwner } from "@/lib/shop/queries";

/**
 * Telling both sides an order happened.
 *
 * Lives here rather than in the checkout action next door for one specific
 * reason: everything exported from a "use server" file is a callable
 * endpoint, so a helper exported from there would be a public button that
 * sends emails on demand to whoever asks. It is called from the checkout
 * action and from the payment return route, both of which are server code.
 */
export type OrderNotification = {
  owner: ShopOwner;
  orderPath: string;
  lineItems: OrderLine[];
  totalCents: number;
  /** Null means quote on request, which is not the same as zero. */
  shippingCents: number | null;
  deliveryMethod: "delivery" | "collection";
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string | null;
  addressLine: string | null;
  paid: boolean;
};

/**
 * The delivery address as one readable line, or null for a collection.
 *
 * Null rather than an empty string on purpose: an email that prints
 * "Deliver to:" followed by nothing looks like a field that went missing,
 * and somebody goes looking for it.
 */
export function addressLineOf(
  method: "delivery" | "collection",
  parts: { line1?: string | null; suburb?: string | null; city?: string | null; postalCode?: string | null }
): string | null {
  if (method !== "delivery") return null;
  const line = [parts.line1, parts.suburb, parts.city, parts.postalCode].filter(Boolean).join(", ");
  return line || null;
}

export async function notifyOrderPlaced(input: OrderNotification): Promise<void> {
  const payload = {
    businessName: input.owner.business_name,
    ownerEmail: input.owner.contact_email,
    buyerName: input.buyerName,
    buyerPhone: input.buyerPhone,
    buyerEmail: input.buyerEmail,
    lines: input.lineItems,
    totalCents: input.totalCents,
    deliveryCents: input.shippingCents,
    deliveryMethod: input.deliveryMethod,
    addressLine: input.addressLine,
    paid: input.paid,
    orderUrl: `${process.env.NEXT_PUBLIC_SITE_URL}${input.orderPath}`,
    dashboardUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
  };

  // Neither email is allowed to stop the other, and neither is allowed to
  // stop the order. A bounced address is not a reason for a sale to fail.
  await Promise.allSettled([sendShopOrderToMember(payload), sendShopOrderToBuyer(payload)]);
}
