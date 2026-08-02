import { toCsv, csvAmount } from "@/lib/bizup/csv";
import {
  addressParts,
  describeOrder,
  personalisedLines,
  totalItems,
  variantLabel,
  type DeliveryAddress,
  type OrderLine,
} from "@/lib/orders/line-items";

// The spreadsheet a printer and a courier actually need.
//
// Dewald, 31 July, on the first real paid order: "for the printer and
// couriers I will require a spreadsheet with all the information, delivery
// address, personalised fields and so on". Until now the only way to get an
// order out of the system was to read it off the screen and retype it,
// which is fine for one and a disaster for fifty. A mistyped address on a
// personalised book is not a small mistake.
//
// Reuses KatisoBiz's CSV writer rather than growing a second one. That
// helper already carries the two things that matter here and are easy to
// forget: a UTF-8 BOM so an Afrikaans name is not mangled when Excel opens
// it, and a guard on any field starting with a formula character so a buyer
// called "=Smith" displays rather than executes.
//
// One row per order, not per item. A courier ships one parcel to one
// address, and a second row for the same address is a second delivery
// somebody has to pay for. Where an order holds more than one item the
// Items column carries all of them.
//
// Address parts stay in separate columns. Every courier import format wants
// them apart, joining them later is trivial, and splitting a joined one
// again is guesswork.

export type ExportableOrder = {
  created_at: string;
  customer_name: string;
  /** Optional since the storefront sprint: a buyer may leave only a number. */
  customer_email: string | null;
  customer_phone: string | null;
  line_items: OrderLine[];
  total_cents: number;
  payment_status: string;
  fulfilment_status: string;
  batch_number: number | null;
  delivery_address: DeliveryAddress;
};

const HEADERS = [
  "Order date",
  "Buyer",
  "Email",
  "Phone",
  "Items",
  "Variant",
  "Quantity",
  "Amount (R)",
  "Payment",
  "Fulfilment",
  "Batch",
  "Print on cover",
  "Gift message",
  "Street",
  "Suburb",
  "City",
  "Province",
  "Postal code",
];

export function ordersToCsv(orders: ExportableOrder[]): string {
  const rows = orders.map((o) => {
    const lines = o.line_items ?? [];
    const a = addressParts(o.delivery_address);
    const personalised = personalisedLines(lines);

    // Almost always one. Joined rather than truncated when it is not,
    // because a name that gets printed on a cover must not be the one the
    // export decided to drop.
    const joinPersonalisation = (pick: (p: NonNullable<OrderLine["personalisation"]>) => string | null) =>
      personalised
        .map(({ line }) => pick(line.personalisation!) ?? "")
        .filter(Boolean)
        .join(" | ");

    return [
      // Date only. A courier does not care what time it was placed, and a
      // full timestamp invites Excel to reformat it into something else.
      o.created_at.slice(0, 10),
      o.customer_name?.trim() ?? "",
      o.customer_email ?? "",
      o.customer_phone ?? "",
      describeOrder(lines),
      lines.map(variantLabel).filter(Boolean).join(" | "),
      totalItems(lines),
      csvAmount(o.total_cents),
      o.payment_status,
      o.fulfilment_status,
      o.batch_number ?? "",
      // Empty on an ordinary order, which is correct: there is nothing to
      // print on the cover, and an invented value would get printed.
      joinPersonalisation((p) => p.recipient_name),
      joinPersonalisation((p) => p.gift_message),
      a.line1 + (a.line2 ? `, ${a.line2}` : ""),
      a.suburb,
      a.city,
      a.province,
      a.postalCode,
    ];
  });

  return toCsv(HEADERS, rows);
}
