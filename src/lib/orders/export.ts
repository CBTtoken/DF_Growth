import { toCsv, csvAmount } from "@/lib/bizup/csv";

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
// One row per order, not per book. A courier ships a parcel to an address
// and a printer reads the quantity from a column.
//
// Address parts stay in separate columns. Every courier import format wants
// them apart, joining them later is trivial, and splitting a joined one
// again is guesswork.

export type ExportableOrder = {
  created_at: string;
  buyer_name: string;
  email: string;
  phone: string | null;
  edition: string;
  quantity: number;
  amount: number;
  payment_status: string;
  fulfilment_status: string;
  batch_number: number | null;
  recipient_name: string | null;
  gift_message: string | null;
  delivery_address: {
    street?: string;
    suburb?: string;
    city?: string;
    postalCode?: string;
  } | null;
};

const HEADERS = [
  "Order date",
  "Buyer",
  "Email",
  "Phone",
  "Edition",
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
  "Postal code",
];

export function ordersToCsv(orders: ExportableOrder[]): string {
  const rows = orders.map((o) => {
    const a = o.delivery_address ?? {};
    return [
      // Date only. A courier does not care what time it was placed, and a
      // full timestamp invites Excel to reformat it into something else.
      o.created_at.slice(0, 10),
      o.buyer_name?.trim() ?? "",
      o.email ?? "",
      o.phone ?? "",
      o.edition === "personalised" ? "Personalised" : "Standard",
      o.quantity,
      csvAmount(o.amount),
      o.payment_status,
      o.fulfilment_status,
      o.batch_number ?? "",
      // Empty on a standard copy, which is correct: there is nothing to
      // print on the cover, and an invented value would get printed.
      o.recipient_name ?? "",
      o.gift_message ?? "",
      a.street ?? "",
      a.suburb ?? "",
      a.city ?? "",
      a.postalCode ?? "",
    ];
  });

  return toCsv(HEADERS, rows);
}
