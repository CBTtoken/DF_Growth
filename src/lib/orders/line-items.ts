// One shape for an order line, shared by everything that reads one.
//
// shop_orders.line_items is jsonb, which means nothing enforces its shape at
// the database. Before this file, the shape existed only as a comment in a
// migration and as whatever shop-actions.ts happened to write, and the
// dashboard, the CSV export and the webhook each re-guessed it. That is
// exactly how a field quietly stops being filled in and nobody notices until
// a printer asks why a cover is blank.
//
// The lines are snapshots on purpose. A line records what was bought at the
// price it was bought for, so editing a product later cannot rewrite history
// on an order that has already been paid and shipped.

export type Personalisation = {
  recipient_name: string | null;
  gift_message: string | null;
};

export type OrderLine = {
  product_id?: string;
  variant_id?: string;
  sku?: string;
  title: string;
  /** Free-form variant description, for example {edition: "Personalised Paperback"}. */
  descriptor?: Record<string, string> | null;
  quantity: number;
  unit_price_cents: number;
  /**
   * Something the buyer asked to have put on the item itself.
   *
   * Lives on the line rather than the order because it belongs to the item:
   * somebody can reasonably buy one plain copy and one inscribed to their
   * mother in a single checkout, and an order-level field could not express
   * that. Null on anything ordinary.
   */
  personalisation?: Personalisation | null;
};

/** Books, not orders. One order can be five copies. */
export function totalItems(lines: OrderLine[]): number {
  return lines.reduce((sum, l) => sum + (l.quantity ?? 0), 0);
}

/** Every personalised line in an order, in order, with its line number. */
export function personalisedLines(lines: OrderLine[]): { line: OrderLine; index: number }[] {
  return lines
    .map((line, index) => ({ line, index }))
    .filter(
      ({ line }) => line.personalisation?.recipient_name || line.personalisation?.gift_message
    );
}

export function hasPersonalisation(lines: OrderLine[]): boolean {
  return personalisedLines(lines).length > 0;
}

/**
 * What a variant is called, for a human.
 *
 * descriptor is free-form by design ({size: "M", colour: "Blue"}), so this
 * joins whatever is in it rather than expecting particular keys. Falls back
 * to nothing rather than printing "undefined" at a printer.
 */
export function variantLabel(line: OrderLine): string {
  const values = Object.values(line.descriptor ?? {}).filter(Boolean);
  return values.join(", ");
}

/** "2 × Standing 365 (Standard Paperback)", for a list or a spreadsheet cell. */
export function describeLine(line: OrderLine): string {
  const variant = variantLabel(line);
  return `${line.quantity} × ${line.title}${variant ? ` (${variant})` : ""}`;
}

export function describeOrder(lines: OrderLine[]): string {
  return lines.map(describeLine).join(", ");
}

/**
 * The address shape shop_orders stores.
 *
 * The book checkout used {street, postalCode} and the shop uses
 * {line1, postal_code}. Both spellings are read here, because orders written
 * under the old spelling are real, paid, and still have to reach someone.
 */
export type DeliveryAddress = {
  line1?: string | null;
  line2?: string | null;
  suburb?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
  /** Older book orders. */
  street?: string | null;
  postalCode?: string | null;
} | null;

/**
 * Tidies what a buyer typed, without changing what they meant.
 *
 * Real example from the first paid order: a street line entered as
 * "…Vyf Brakke Fonteinen, " and a city as "Mosselbay ". Harmless on screen,
 * but these go onto a courier label and into a spreadsheet, where a trailing
 * comma reads as a missing field somebody then goes looking for.
 *
 * Only whitespace and trailing separators are removed. Nothing is
 * corrected, reordered or guessed at: this is somebody's address, and the
 * only person who knows it is right is them.
 */
function tidy(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/[,;]+$/, "").trim();
}

export function addressParts(address: DeliveryAddress) {
  const a = address ?? {};
  return {
    line1: tidy(a.line1 ?? a.street),
    line2: tidy(a.line2),
    suburb: tidy(a.suburb),
    city: tidy(a.city),
    province: tidy(a.province),
    postalCode: tidy(a.postal_code ?? a.postalCode),
  };
}

export function formatAddress(address: DeliveryAddress): string {
  const a = addressParts(address);
  const parts = [a.line1, a.line2, a.suburb, a.city, a.province, a.postalCode].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "No delivery address";
}
