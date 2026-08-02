// What a member offers at checkout, said in words a buyer understands.
//
// Handoff Sec 1.5: "Member sets, per shop: collection only, flat rate
// delivery, free over a threshold, or quote on request. Applied at
// checkout." Before this there was only one answer available, a flat rate,
// which meant a member who does collection only had to set it to zero and
// hope nobody read that as free nationwide delivery.
//
// The wording matters more than it looks. This is the paragraph that
// decides whether a buyer who has never bought from this seller believes
// the thing will actually turn up, and it is read on a phone by somebody
// who is already half deciding not to bother.

export type DeliveryMode = "collection_only" | "flat" | "quote_on_request";

export type ShopDeliverySettings = {
  mode: DeliveryMode;
  flatCents: number;
  freeOverCents: number | null;
  collectionAddress: { line1?: string; city?: string; postalCode?: string } | null;
};

export function deliveryModeOf(value: string | null | undefined): DeliveryMode {
  return value === "collection_only" || value === "quote_on_request" ? value : "flat";
}

/** Whether checkout should ask for an address at all. */
export function needsDeliveryAddress(mode: DeliveryMode): boolean {
  return mode !== "collection_only";
}

const rands = (cents: number) => `R${(cents / 100).toFixed(2)}`;

/**
 * The delivery line on a product page, before a buyer has typed anything.
 *
 * Deliberately one or two short sentences. This sits under the price on a
 * page whose only job is to answer "is this real and will it arrive", and a
 * paragraph of conditions there does the opposite of reassure.
 */
export function deliverySummary(settings: ShopDeliverySettings): string {
  switch (settings.mode) {
    case "collection_only": {
      const where = settings.collectionAddress?.city;
      return where
        ? `Collection only, from ${where}. The seller confirms a time with you after you order.`
        : "Collection only. The seller confirms a time and place with you after you order.";
    }
    case "quote_on_request":
      return "Delivery is quoted per order. Place the order and the seller confirms the delivery cost with you before you pay.";
    case "flat": {
      if (settings.freeOverCents != null && settings.flatCents > 0) {
        return `Delivery ${rands(settings.flatCents)}, free on orders over ${rands(settings.freeOverCents)}.`;
      }
      if (settings.flatCents > 0) {
        return `Delivery ${rands(settings.flatCents)} anywhere in South Africa.`;
      }
      return "Delivery included in the price.";
    }
  }
}

/**
 * What delivery costs on this order, given the goods total after discount.
 *
 * Judged on the discounted figure because that is what the buyer actually
 * pays. Judging a free-delivery threshold on the pre-discount figure would
 * let a coupon buy its way past a line the member never offered.
 *
 * Returns null for quote on request, which is not zero: zero would print
 * "Delivery: included" on a confirmation for an order whose delivery cost
 * nobody has worked out yet.
 */
export function deliveryChargeCents(
  settings: ShopDeliverySettings,
  payableGoodsCents: number,
  method: "delivery" | "collection"
): number | null {
  if (method === "collection") return 0;
  switch (settings.mode) {
    case "collection_only":
      return 0;
    case "quote_on_request":
      return null;
    case "flat":
      return settings.freeOverCents != null && payableGoodsCents >= settings.freeOverCents
        ? 0
        : settings.flatCents;
  }
}

/** How a delivery charge reads on a total, including the two non-numbers. */
export function deliveryChargeLabel(cents: number | null): string {
  if (cents === null) return "Quoted by the seller";
  if (cents === 0) return "Included";
  return rands(cents);
}
