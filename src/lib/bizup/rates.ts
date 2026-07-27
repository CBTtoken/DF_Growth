// Insurance versus private pricing.
//
// From a plumber testing the product: insurance work is quoted at a
// different rate to his own private jobs, and the same is true of
// electricians. Painters, tilers and gardeners have one price list, so this
// is behind an account switch and stays completely invisible while it is
// off.
//
// The rate belongs to the document, not the customer. Dewald's point, and
// he is right: the same customer can be an insurance job one week and a
// private job the next, so defaulting it from the customer record would
// guess wrong often enough to put wrong prices in front of a client.

export type RateType = "private" | "insurance";

export const RATE_TYPES: RateType[] = ["private", "insurance"];

/** Member-facing wording. "Own work" is the plumber's own term for it. */
export function rateLabel(rate: RateType): string {
  return rate === "insurance" ? "Insurance" : "Private (own work)";
}

/** The short form, for the line under a document number and on the PDF. */
export function rateShortLabel(rate: RateType): string {
  return rate === "insurance" ? "Insurance rates" : "Private rates";
}

/** Narrows whatever came out of the database or a form to a known value. */
export function asRateType(value: unknown): RateType {
  return value === "insurance" ? "insurance" : "private";
}

export type MarkupType = "percent" | "amount";

export function asMarkupType(value: unknown): MarkupType {
  return value === "amount" ? "amount" : "percent";
}

export interface PricedCatalogueItem {
  unit_price_excl_cents: number;
  insurance_price_excl_cents: number | null;
  default_markup_pct?: number | string | null;
  markup_type?: string | null;
  default_markup_amount_cents?: number | null;
}

/**
 * The price to put on a line, before markup.
 *
 * A null insurance price falls back to the private one rather than to zero.
 * That fallback is the whole reason the column is nullable: switching the
 * feature on must never blank out a price or send a customer a quote with
 * R0.00 on it. A member fills in only the items that actually differ.
 */
export function basePriceForRate(item: PricedCatalogueItem, rate: RateType): number {
  if (rate === "insurance" && item.insurance_price_excl_cents !== null) {
    return item.insurance_price_excl_cents;
  }
  return item.unit_price_excl_cents;
}

/**
 * The item's markup applied to a base price.
 *
 * Two shapes, one in force at a time, decided by markup_type. A percentage
 * suits a part bought at cost and sold on at a margin; a flat rand amount
 * suits a fixed handling fee, where making the member work out the
 * equivalent percentage on a phone is where wrong prices come from.
 */
export function applyMarkup(base: number, item: PricedCatalogueItem): number {
  if (asMarkupType(item.markup_type) === "amount") {
    return base + (item.default_markup_amount_cents ?? 0);
  }
  const pct = Number(item.default_markup_pct ?? 0);
  return pct ? Math.round(base * (1 + pct / 100)) : base;
}

/**
 * The price including the item's default markup, which is what actually
 * lands on the document. Markup is applied after the rate is chosen, so a
 * markup set on an item applies to whichever of its two prices was used.
 */
export function priceForRate(item: PricedCatalogueItem, rate: RateType): number {
  return applyMarkup(basePriceForRate(item, rate), item);
}
