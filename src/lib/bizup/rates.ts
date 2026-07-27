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

export interface PricedCatalogueItem {
  unit_price_excl_cents: number;
  insurance_price_excl_cents: number | null;
  default_markup_pct?: number | string | null;
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
 * The price including the item's default markup, which is what actually
 * lands on the document. Markup is applied after the rate is chosen, so a
 * markup set on an item applies to whichever of its two prices was used.
 */
export function priceForRate(item: PricedCatalogueItem, rate: RateType): number {
  const base = basePriceForRate(item, rate);
  const markup = Number(item.default_markup_pct ?? 0);
  return markup ? Math.round(base * (1 + markup / 100)) : base;
}
