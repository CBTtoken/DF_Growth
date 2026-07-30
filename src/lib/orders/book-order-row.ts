import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrderLine } from "@/lib/orders/line-items";

// Turns a paid Standing 365 checkout into an ordinary shop order.
//
// The book's checkout predates the shop and sends its own metadata shape
// through Paystack: edition, quantity, a {street, postalCode} address, and
// the personalisation fields. Rewriting that checkout would mean changing
// the live page that is currently taking money, so instead the shape is
// translated here, at the one point where an order is written.
//
// Split out of the webhook so it can be exercised directly. A webhook is
// the worst place to discover a mistake: it runs once, after the customer
// has already paid, and nobody is watching.

const STANDARD_UNIT_PRICE = 299 * 100;
const PERSONALISED_UNIT_PRICE = 385 * 100;

export const BOOK_SKUS = {
  standard: "STANDING365-STD",
  personalised: "STANDING365-PER",
} as const;

export type BookOrderMetadata = {
  growth_client_id?: string;
  edition?: string;
  buyer_name?: string;
  phone?: string;
  delivery_address?: string;
  recipient_name?: string;
  gift_message?: string;
  quantity?: string;
  marketing_consent?: string;
};

export type BuiltBookOrder = {
  row: Record<string, unknown>;
  buyerName: string;
  email: string;
  edition: string;
};

/**
 * Splits what was paid into goods and delivery.
 *
 * Derived from the amount that actually cleared rather than recalculated
 * from a price list, so the parts always add up to the total even if a
 * price changes between someone opening the page and paying on it.
 */
export function splitAmount(edition: string, quantity: number, amount: number) {
  const unit = edition === "personalised" ? PERSONALISED_UNIT_PRICE : STANDARD_UNIT_PRICE;
  const goods = unit * quantity;
  return { unit, goods, shipping: Math.max(0, amount - goods) };
}

/** The shop's address spelling, from the book checkout's. */
export function normaliseAddress(raw: unknown) {
  const a = (raw ?? {}) as Record<string, string | null | undefined>;
  return {
    line1: a.street ?? a.line1 ?? null,
    line2: a.line2 ?? null,
    suburb: a.suburb ?? null,
    city: a.city ?? null,
    province: a.province ?? null,
    postal_code: a.postalCode ?? a.postal_code ?? null,
  };
}

export async function buildBookShopOrder({
  admin,
  metadata,
  customerEmail,
  amount,
  reference,
}: {
  admin: SupabaseClient;
  metadata: BookOrderMetadata;
  customerEmail: string | undefined;
  amount: number;
  reference: string;
}): Promise<BuiltBookOrder> {
  const edition = metadata.edition === "personalised" ? "personalised" : "standard";
  const quantity = metadata.quantity ? Number(metadata.quantity) : 1;
  const sku = BOOK_SKUS[edition];
  const { unit, goods, shipping } = splitAmount(edition, quantity, amount);

  // Catalogue ids, so the order joins back to the product it came from.
  // Looked up rather than hardcoded, and the order is still written if the
  // lookup fails: a missing id is a broken link in a report, while a
  // discarded order is a customer who paid and got nothing.
  let productId: string | undefined;
  let variantId: string | undefined;
  try {
    const { data: variant } = await admin
      .from("shop_product_variants")
      .select("id, shop_product_id")
      .eq("sku", sku)
      .maybeSingle();
    if (variant) {
      variantId = variant.id as string;
      productId = variant.shop_product_id as string;
    }
  } catch {
    // Deliberately swallowed, see above.
  }

  const line: OrderLine = {
    product_id: productId,
    variant_id: variantId,
    sku,
    title: "Standing 365",
    descriptor: {
      edition: edition === "personalised" ? "Personalised Paperback" : "Standard Paperback",
    },
    quantity,
    unit_price_cents: unit,
    personalisation:
      edition === "personalised"
        ? {
            recipient_name: metadata.recipient_name ?? null,
            gift_message: metadata.gift_message ?? null,
          }
        : null,
  };

  let address: unknown = {};
  try {
    address = JSON.parse(metadata.delivery_address ?? "{}");
  } catch {
    // A malformed address must not cost us the order. It is recoverable
    // from the buyer by email; a discarded order is not.
    console.error("Could not parse delivery_address on", reference);
  }

  return {
    row: {
      growth_client_id: metadata.growth_client_id,
      line_items: [line],
      subtotal_cents: goods,
      shipping_cents: shipping,
      total_cents: amount,
      customer_name: metadata.buyer_name,
      customer_email: customerEmail,
      customer_phone: metadata.phone ?? null,
      delivery_address: normaliseAddress(address),
      payment_status: "paid",
      fulfilment_status: "unfulfilled",
      paystack_reference: reference,
      marketing_consent: metadata.marketing_consent === "true",
    },
    buyerName: metadata.buyer_name ?? "",
    email: customerEmail ?? "",
    edition,
  };
}
