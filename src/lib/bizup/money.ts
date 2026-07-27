// KatisoBiz money handling (BizUp/docs/bizup-phase1-spec.md).
//
// Every amount in KatisoBiz is an integer number of cents, matching the
// existing convention in bookable_units.base_price_cents and
// shop_products. The spec does not name a numeric type; integer cents is
// the right one for a tax document because it makes every rounding
// decision explicit and happen exactly once, in a named function, rather
// than accumulating invisibly through floating point.
//
// The rounding rule this file fixes, and which the PDF, the totals bar and
// the reports all share:
//
//   1. each line total  = round(quantity x unit price excl)
//   2. subtotal excl    = sum of line totals   (no further rounding)
//   3. VAT              = round(subtotal excl x rate)   -- once, on the total
//   4. total incl       = subtotal excl + VAT           (exact, never rounded)
//
// VAT is calculated once on the subtotal rather than per line. Per-line VAT
// then summed can differ from the total by a cent or two on a long invoice,
// and a document whose own numbers do not add up is the kind of thing a
// customer queries and a member cannot explain.

/** Everything is ZAR. Sec 13 puts multi-currency out of Phase 1. */
export const CURRENCY = "ZAR" as const;

/**
 * Rounds to whole cents, half away from zero.
 *
 * Math.round is half-up, which biases negatives the wrong way (it rounds
 * -0.5 to 0, not to -1). Credit notes are negative amounts, so that bias
 * would land on exactly the documents that get scrutinised.
 */
export function roundCents(value: number): number {
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

/**
 * One line's total, excluding VAT.
 *
 * Quantity is deliberately a float: hours, kilometres and part-days are
 * all real units in this product (Sec 11). The multiplication can land a
 * hair off a whole cent in binary floating point, which roundCents
 * absorbs. At invoice magnitudes there is no case where that error is
 * anywhere near half a cent.
 */
export function lineTotalCents(quantity: number, unitPriceExclCents: number): number {
  return roundCents(quantity * unitPriceExclCents);
}

/** Formats cents for display and for the PDF. No currency symbol variants, no locale switching. */
export function formatZar(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const rands = Math.floor(abs / 100);
  const remainder = String(abs % 100).padStart(2, "0");
  // Thousands separated by a space, which is the South African convention
  // and, unlike a comma, cannot be misread as a decimal separator by a
  // customer used to European formatting.
  const grouped = String(rands).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${negative ? "-" : ""}R${grouped}.${remainder}`;
}

/**
 * Parses what a member types into a price field.
 *
 * Accepts "1234.50", "1 234,50", "R1,234.50" and similar, because a phone
 * keyboard and a South African member will produce all of them. Returns
 * null for anything it cannot read confidently, so the caller shows a
 * validation message rather than silently invoicing a wrong amount.
 */
export function parseAmountToCents(input: string): number | null {
  const cleaned = input.trim().replace(/[Rr\s ]/g, "");
  if (cleaned === "") return null;

  // A comma is a decimal separator in South African usage, but is also
  // used as a thousands separator by anyone typing out of habit. Treat it
  // as decimal only when it is followed by one or two digits and is the
  // last separator present.
  const normalised = /,\d{1,2}$/.test(cleaned)
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned.replace(/,/g, "");

  if (!/^-?\d*\.?\d*$/.test(normalised) || normalised === "." || normalised === "-") return null;

  const value = Number(normalised);
  if (!Number.isFinite(value)) return null;

  return roundCents(value * 100);
}
