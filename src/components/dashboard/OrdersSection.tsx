"use client";

import { useState, useTransition } from "react";
import { assignBatchNumber, markOrderShipped, markBatchSentForPrinting } from "@/app/dashboard/orders-actions";
import { Card } from "@/components/ui/Card";
import {
  describeLine,
  formatAddress,
  hasPersonalisation,
  personalisedLines,
  totalItems,
  variantLabel,
  type DeliveryAddress,
  type OrderLine,
} from "@/lib/orders/line-items";

// STANDING365_LANDING_BUILD_SPEC_CLAUDE.md Sprint 3: the one piece missing
// entirely until now — orders were being paid for with no way for a seller
// to ever see them, assign a batch, or find the personalisation details
// (recipient name, gift message) needed to actually print a cover.
//
// Reads shop_orders, the same table any member's shop writes to. Dewald,
// 31 July: "can you bring the book in as if it is one of our own members
// without breaking our current page?" The book used to have a table of its
// own, which meant a second orders screen, a second export and a second set
// of emails, all of which would have had to be built twice forever. It is
// now a product with two variants like anything else, and this screen is
// the seller's orders module rather than the book's.
export type SellerOrder = {
  id: string;
  created_at: string;
  line_items: OrderLine[];
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  delivery_address: DeliveryAddress;
  total_cents: number;
  payment_status: string;
  fulfilment_status: string;
  batch_number: number | null;
};

/**
 * The numbers a seller wants before they want anything else.
 *
 * Dewald, 31 July: "as the seller, I have almost no admin functions,
 * reporting functions on this product?" He is right. There were two buttons
 * and a list.
 *
 * Deliberately four numbers rather than a dashboard. Paid revenue is the
 * one that matters, unshipped is the work outstanding, and the rest is
 * context. Anything more at one order is decoration.
 *
 * Unpaid is only shown when it is not zero, on the same reasoning as the
 * overdue row in KatisoBiz: a permanent "Unpaid: R0" teaches the eye to
 * skip the line it lives on.
 */
function Summary({ orders }: { orders: SellerOrder[] }) {
  const paid = orders.filter((o) => o.payment_status === "paid");
  const unpaid = orders.filter((o) => o.payment_status !== "paid");
  const unshipped = paid.filter((o) => o.fulfilment_status !== "shipped");

  const revenue = paid.reduce((sum, o) => sum + o.total_cents, 0);
  const items = paid.reduce((sum, o) => sum + totalItems(o.line_items ?? []), 0);
  const rands = (cents: number) =>
    `R${(cents / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const stats: [string, string, string][] = [
    ["Paid revenue", rands(revenue), `${paid.length} ${paid.length === 1 ? "order" : "orders"}`],
    ["Items sold", String(items), "paid items"],
    [
      "Still to ship",
      String(unshipped.length),
      unshipped.length === 1 ? "order waiting" : "orders waiting",
    ],
  ];

  if (unpaid.length > 0) {
    stats.push(["Not paid", String(unpaid.length), "never printed or shipped"]);
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map(([label, value, sub]) => (
        <div key={label} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
          <p className="mt-0.5 text-xl font-extrabold text-ink">{value}</p>
          <p className="text-xs text-gray-500">{sub}</p>
        </div>
      ))}
    </div>
  );
}

export function OrdersSection({ orders }: { orders: SellerOrder[] }) {
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-ink">Orders</h2>
          <p className="text-sm text-gray-500">
            Everything bought through your page, including delivery and personalisation details.
          </p>
        </div>

        {/* The spreadsheet for the printer and the courier. Plain links
            rather than buttons, because a download is a navigation and a
            link is what a browser already knows how to do with one.

            Only paid orders are included, and that is decided server side
            rather than here: nothing should be printed or couriered for
            money that has not arrived. */}
        {orders.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {/* Plain anchors carrying `download`, not next/link. These
                point at a route handler that returns a file with a
                Content-Disposition header, and Link would client-side
                navigate to it and try to render a CSV as a page, which
                downloads nothing. */}
            <a
              href="/dashboard/orders/export?unfulfilled=1"
              download
              className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              Download unshipped
            </a>
            <a
              href="/dashboard/orders/export"
              download
              className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-brand hover:text-brand"
            >
              Download all
            </a>
          </div>
        )}
      </div>

      {orders.length === 0 ? (
        <p className="text-sm text-gray-400">No orders yet.</p>
      ) : (
        <>
          <Summary orders={orders} />
          <BatchPanel orders={orders} />
          <ul className="flex flex-col gap-3">
            {orders.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

/**
 * Batch controls, one row per batch that actually has orders in it.
 *
 * The per order Assign button stays where it is, because that is how an
 * order joins a batch. This is what you do once a batch is full: download
 * it for the printer, then record that you have sent it and what date
 * buyers should expect.
 *
 * Dewald's instruction on the sending itself: "leave that as a manual task
 * for the seller, you can add a button to indicate whether it was completed
 * or not?" So nothing here talks to a printer. It records that he did.
 */
function BatchPanel({ orders }: { orders: SellerOrder[] }) {
  const batches = Array.from(
    new Set(orders.filter((o) => o.batch_number != null).map((o) => o.batch_number as number))
  ).sort((a, b) => a - b);

  const unbatched = orders.filter((o) => o.batch_number == null && o.payment_status === "paid");

  if (batches.length === 0) {
    return (
      <p className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm text-gray-500">
        {unbatched.length === 0
          ? "No paid orders waiting for a batch."
          : `${unbatched.length} paid ${unbatched.length === 1 ? "order is" : "orders are"} not in a batch yet. Assign a batch number below, then come back here to send it to the printer.`}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {unbatched.length > 0 && (
        <p className="text-sm text-gray-500">
          {unbatched.length} paid {unbatched.length === 1 ? "order is" : "orders are"} not in a batch
          yet.
        </p>
      )}
      {batches.map((n) => (
        <BatchRow key={n} batchNumber={n} orders={orders.filter((o) => o.batch_number === n)} />
      ))}
    </div>
  );
}

function BatchRow({ batchNumber, orders }: { batchNumber: number; orders: SellerOrder[] }) {
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  const paid = orders.filter((o) => o.payment_status === "paid");
  const items = paid.reduce((s, o) => s + totalItems(o.line_items ?? []), 0);
  const personalised = paid.filter((o) => hasPersonalisation(o.line_items ?? [])).length;

  function handleSend() {
    setError(null);
    startTransition(async () => {
      const result = await markBatchSentForPrinting(batchNumber, date || null);
      if (result.error) setError(result.error);
      else setDone(true);
    });
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold text-ink">Batch {batchNumber}</p>
        <p className="text-sm text-gray-500">
          {paid.length} paid {paid.length === 1 ? "order" : "orders"}, {items}{" "}
          {items === 1 ? "item" : "items"}
          {personalised > 0 ? `, ${personalised} personalised` : ""}
        </p>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {/* Same reasoning as the downloads above: a route handler returning
            a file, so a plain anchor rather than next/link. */}
        <a
          href={`/dashboard/orders/export?batch=${batchNumber}`}
          download
          className="rounded-full border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:border-brand hover:text-brand"
        >
          Download for printer
        </a>

        <label className="flex items-center gap-1.5 text-sm text-gray-600">
          Expected delivery
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-gray-200 px-2 py-1 text-sm"
          />
        </label>

        {done ? (
          <span className="text-sm font-semibold text-green-700">
            Buyers told it is at the printer
          </span>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            disabled={isPending}
            className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {isPending ? "Telling buyers..." : "I have sent this to the printer"}
          </button>
        )}
      </div>

      {/* Said plainly, because pressing it emails real customers a date they
          will hold you to. */}
      <p className="mt-1.5 text-xs text-gray-500">
        {date
          ? `Emails all ${paid.length} paid ${paid.length === 1 ? "buyer" : "buyers"} in this batch, telling them to expect delivery around that date.`
          : `Emails all ${paid.length} paid ${paid.length === 1 ? "buyer" : "buyers"} in this batch. Add a date first if you want them to be given one.`}
      </p>

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function OrderRow({ order }: { order: SellerOrder }) {
  const [batchInput, setBatchInput] = useState(order.batch_number?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const lines = order.line_items ?? [];
  const personalised = personalisedLines(lines);

  function handleAssignBatch() {
    const n = Number(batchInput);
    setError(null);
    startTransition(async () => {
      const result = await assignBatchNumber(order.id, n);
      if (result.error) setError(result.error);
    });
  }

  function handleMarkShipped() {
    setError(null);
    startTransition(async () => {
      const result = await markOrderShipped(order.id);
      if (result.error) setError(result.error);
    });
  }

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">{order.customer_name?.trim()}</p>
          <p className="text-gray-500">
            <a
              href={`mailto:${order.customer_email}`}
              className="text-brand underline-offset-2 hover:underline"
            >
              {order.customer_email}
            </a>
            {order.customer_phone ? ` · ${order.customer_phone}` : ""}
          </p>
        </div>
        <span className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString()}</span>
      </div>

      {/* What was actually bought. A list rather than a single badge,
          because an order can hold more than one thing and the person
          packing the parcel needs all of it. */}
      <ul className="flex flex-col gap-0.5 text-gray-700">
        {lines.map((line, i) => (
          <li key={line.variant_id ?? line.sku ?? i}>
            {describeLine(line)}
            <span className="ml-2 text-xs text-gray-500">
              R{((line.unit_price_cents * line.quantity) / 100).toFixed(2)}
            </span>
          </li>
        ))}
      </ul>

      <p className="text-gray-600">
        <span className="font-medium text-gray-700">Deliver to:</span>{" "}
        {formatAddress(order.delivery_address)}
      </p>

      {/* One block per personalised item. The whole reason this screen
          exists: without it, nobody knows what to print on the cover. */}
      {personalised.map(({ line, index }) => (
        <div key={index} className="rounded-lg border border-brand/20 bg-brand/5 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">
            {line.title}
            {variantLabel(line) ? ` · ${variantLabel(line)}` : ""}
          </p>
          <p className="mt-1 font-medium text-gray-800">
            Print on cover: {line.personalisation?.recipient_name}
          </p>
          {line.personalisation?.gift_message && (
            <p className="mt-1 whitespace-pre-wrap text-gray-600">
              &ldquo;{line.personalisation.gift_message}&rdquo;
            </p>
          )}
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-4 border-t border-gray-200 pt-2 text-xs text-gray-500">
        <span>
          R{(order.total_cents / 100).toFixed(2)} ·{" "}
          <span
            className={
              order.payment_status === "paid"
                ? "font-semibold text-green-700"
                : "font-semibold text-amber-700"
            }
          >
            {order.payment_status}
          </span>
        </span>

        <span className="flex items-center gap-1.5">
          Batch:
          <input
            type="number"
            min={1}
            value={batchInput}
            onChange={(e) => setBatchInput(e.target.value)}
            placeholder="1"
            className="w-14 rounded border border-gray-300 px-1.5 py-0.5 text-xs text-gray-900"
          />
          <button
            type="button"
            onClick={handleAssignBatch}
            disabled={isPending || !batchInput}
            className="rounded-full border border-gray-300 px-2.5 py-0.5 font-semibold text-gray-700 hover:border-gray-400 disabled:opacity-50"
          >
            Assign
          </button>
        </span>

        {order.fulfilment_status === "shipped" ? (
          <span className="font-semibold text-green-700">Shipped</span>
        ) : (
          <button
            type="button"
            onClick={handleMarkShipped}
            disabled={isPending}
            className="rounded-full bg-brand px-2.5 py-0.5 font-semibold text-white disabled:opacity-50"
          >
            Mark as shipped
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </li>
  );
}
