"use client";

import { useState, useTransition } from "react";
import {
  assignBatchNumber,
  markOrderShipped,
  markOrderPaid,
  cancelOrder,
  saveOrderNote,
  markBatchSentForPrinting,
  markBatchReadyForCollection,
} from "@/app/dashboard/orders-actions";
import { refundBobPayOrder } from "@/app/dashboard/shop-actions";
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
  /** Optional since the storefront sprint: a buyer may leave only a number. */
  customer_email: string | null;
  customer_phone: string | null;
  delivery_address: DeliveryAddress;
  delivery_method: string;
  member_note: string | null;
  total_cents: number;
  payment_status: string;
  fulfilment_status: string;
  batch_number: number | null;
  /** Which gateway the money moved on, when it moved online at all. */
  gateway?: string | null;
  bobpay_payment_id?: number | null;
};

/**
 * One word for where an order actually is.
 *
 * Handoff Sec 1.4 names five: new, paid, unpaid, fulfilled, cancelled.
 * Cancelled and fulfilled are endings and win over everything else, because
 * an order that has shipped is not usefully described as "paid" any more.
 * "New" is reserved for an order that arrived in the last day and has not
 * been touched, which is the one the seller has to act on today.
 */
function orderState(order: SellerOrder): { label: string; className: string } {
  if (order.fulfilment_status === "cancelled") {
    return { label: "Cancelled", className: "bg-gray-200 text-gray-600" };
  }
  if (order.fulfilment_status === "shipped" || order.fulfilment_status === "delivered") {
    return { label: "Fulfilled", className: "bg-green-100 text-green-700" };
  }
  if (order.payment_status === "oversold") {
    return { label: "Oversold", className: "bg-red-100 text-red-700" };
  }
  if (order.payment_status === "refunded") {
    return { label: "Refunded", className: "bg-gray-200 text-gray-600" };
  }
  if (order.payment_status === "paid") {
    return { label: "Paid", className: "bg-green-100 text-green-700" };
  }
  const hoursOld = (Date.now() - new Date(order.created_at).getTime()) / 3_600_000;
  return hoursOld < 24
    ? { label: "New", className: "bg-brand/10 text-brand" }
    : { label: "Unpaid", className: "bg-amber-100 text-amber-700" };
}

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
  // A cancelled order is not revenue, not work outstanding, and not an
  // unpaid one chasing anybody. Counting it anywhere here would leave the
  // seller looking at a number that never goes down.
  const live = orders.filter((o) => o.fulfilment_status !== "cancelled");
  const paid = live.filter((o) => o.payment_status === "paid");
  const unpaid = live.filter((o) => o.payment_status !== "paid");
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

/**
 * A batch moves through two steps, and only the second one knows a date.
 *
 * Dewald, 2026-07-30: the printer packs each book with its buyer's address,
 * the courier collects from the printer, and "we won't deliver ourselves or
 * know the exact delivery schedule until the printer has actioned that they
 * ready for collection."
 *
 * The date field therefore lives on the second step only. Before this it
 * sat next to "sent to the printer", where the honest answer is always "I
 * do not know yet", and an empty box next to a send button is an invitation
 * to guess.
 */
function BatchRow({ batchNumber, orders }: { batchNumber: number; orders: SellerOrder[] }) {
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sentToPrinter, setSentToPrinter] = useState(false);
  const [readyForCollection, setReadyForCollection] = useState(false);
  const [isPending, startTransition] = useTransition();

  const paid = orders.filter((o) => o.payment_status === "paid");
  const items = paid.reduce((s, o) => s + totalItems(o.line_items ?? []), 0);
  const personalised = paid.filter((o) => hasPersonalisation(o.line_items ?? [])).length;
  const buyers = `${paid.length} paid ${paid.length === 1 ? "buyer" : "buyers"}`;

  function handleSend() {
    setError(null);
    startTransition(async () => {
      const result = await markBatchSentForPrinting(batchNumber);
      if (result.error) setError(result.error);
      else setSentToPrinter(true);
    });
  }

  function handleReady() {
    setError(null);
    startTransition(async () => {
      const result = await markBatchReadyForCollection(batchNumber, date || null);
      if (result.error) setError(result.error);
      else setReadyForCollection(true);
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

      {/* Step one. No date here on purpose: the run has only just left and
          how long it takes is the printer's business, not yours. */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {/* Same reasoning as the downloads above: a route handler returning
            a file, so a plain anchor rather than next/link. */}
        <a
          href={`/dashboard/orders/export?batch=${batchNumber}`}
          download
          className="rounded-full border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:border-brand hover:text-brand"
        >
          Download for printer
        </a>

        {sentToPrinter ? (
          <span className="text-sm font-semibold text-green-700">
            ✓ {buyers} told it is at the printer
          </span>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            disabled={isPending}
            className="rounded-full border border-gray-300 px-4 py-1.5 text-sm font-semibold text-gray-700 transition hover:border-brand hover:text-brand disabled:opacity-60"
          >
            {isPending ? "Telling buyers..." : "1. I have sent this to the printer"}
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-gray-500">
        Emails {buyers} in this batch to say it is being printed. No delivery date is given, because
        there is not an honest one yet.
      </p>

      {/* Step two, the one the seller learns about from the printer. */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
        <label className="flex items-center gap-1.5 text-sm text-gray-600">
          Expected delivery
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-gray-200 px-2 py-1 text-sm"
          />
        </label>

        {readyForCollection ? (
          <span className="text-sm font-semibold text-green-700">✓ {buyers} given a date</span>
        ) : (
          <button
            type="button"
            onClick={handleReady}
            disabled={isPending}
            className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {isPending ? "Telling buyers..." : "2. The printer says it is ready for collection"}
          </button>
        )}
      </div>

      {/* Said plainly, because pressing it emails real customers a date they
          will hold you to. */}
      <p className="mt-1 text-xs text-gray-500">
        {date
          ? `Emails ${buyers} to say their copy is printed, packed and waiting for the courier, and to expect it around that date.`
          : `Emails ${buyers} to say their copy is printed and waiting for the courier. Add a date first if you want them to be given one.`}
      </p>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function OrderRow({ order }: { order: SellerOrder }) {
  const [batchInput, setBatchInput] = useState(order.batch_number?.toString() ?? "");
  const [note, setNote] = useState(order.member_note ?? "");
  const [noteSaved, setNoteSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const lines = order.line_items ?? [];
  const personalised = personalisedLines(lines);
  const state = orderState(order);
  const collecting = order.delivery_method === "collection";
  const cancelled = order.fulfilment_status === "cancelled";

  function run(action: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
    });
  }

  function handleAssignBatch() {
    run(() => assignBatchNumber(order.id, Number(batchInput)));
  }

  return (
    <li
      className={`flex flex-col gap-2 rounded-xl border border-gray-100 p-4 text-sm ${
        cancelled ? "bg-gray-100 opacity-70" : "bg-gray-50"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">{order.customer_name?.trim()}</p>
          {/* The phone number leads. On the path where the seller has no
              gateway, which is the common one, ringing this number is how
              the sale actually completes, so it is a tap target rather than
              a line of grey text after the email. */}
          <p className="text-gray-600">
            {order.customer_phone ? (
              <a href={`tel:${order.customer_phone}`} className="font-medium text-brand underline-offset-2 hover:underline">
                {order.customer_phone}
              </a>
            ) : (
              <span className="text-gray-400">No phone number</span>
            )}
            {order.customer_email ? (
              <>
                {" · "}
                <a href={`mailto:${order.customer_email}`} className="text-gray-500 underline-offset-2 hover:underline">
                  {order.customer_email}
                </a>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${state.className}`}>
            {state.label}
          </span>
          <span className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString()}</span>
        </div>
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
        {collecting ? (
          <span className="font-medium text-gray-700">Buyer is collecting</span>
        ) : (
          <>
            <span className="font-medium text-gray-700">Deliver to:</span>{" "}
            {formatAddress(order.delivery_address)}
          </>
        )}
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

      {/* The seller's own note. The unpaid path runs on a phone call, and
          "paying Friday, doing an EFT" is the state of that sale: without
          somewhere to write it down it exists only in the seller's head
          until it does not. Never shown to the buyer. */}
      <div className="flex flex-col gap-1 border-t border-gray-200 pt-2">
        <label className="text-xs font-medium text-gray-600" htmlFor={`note-${order.id}`}>
          Your note (only you see this)
        </label>
        <div className="flex gap-2">
          <input
            id={`note-${order.id}`}
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setNoteSaved(false);
            }}
            placeholder="Paying Friday by EFT"
            className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-900"
          />
          <button
            type="button"
            onClick={() =>
              startTransition(async () => {
                const result = await saveOrderNote(order.id, note);
                if (result.error) setError(result.error);
                else setNoteSaved(true);
              })
            }
            disabled={isPending || note === (order.member_note ?? "")}
            className="shrink-0 rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-gray-400 disabled:opacity-50"
          >
            {noteSaved ? "Saved" : "Save note"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-gray-200 pt-2 text-xs">
        <span className="font-semibold text-gray-900">R{(order.total_cents / 100).toFixed(2)}</span>

        {/* The single most important button on the unpaid path. Until it is
            pressed the order looks exactly like one nobody has dealt with,
            and the seller's own revenue figure stays wrong. */}
        {!cancelled &&
          (order.payment_status === "paid" ? (
            <button
              type="button"
              onClick={() => run(() => markOrderPaid(order.id, false))}
              disabled={isPending}
              className="rounded-full border border-gray-300 px-3 py-1 font-semibold text-gray-600 hover:border-gray-400 disabled:opacity-50"
            >
              Not paid after all
            </button>
          ) : (
            <button
              type="button"
              onClick={() => run(() => markOrderPaid(order.id, true))}
              disabled={isPending}
              className="rounded-full bg-green-600 px-3 py-1 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              Mark as paid
            </button>
          ))}

        {!cancelled && order.fulfilment_status !== "shipped" && (
          <button
            type="button"
            onClick={() => run(() => markOrderShipped(order.id))}
            disabled={isPending}
            className="rounded-full bg-brand px-3 py-1 font-semibold text-white disabled:opacity-50"
          >
            {collecting ? "Mark as collected" : "Mark as sent"}
          </button>
        )}

        {/* Sprint 2: money back the way it came, from the member's own Bob
            Pay account. Only offered where Bob Pay's own payment record is
            on file, because that id is what their refund endpoint wants. */}
        {order.payment_status === "paid" && order.gateway === "bobpay" && order.bobpay_payment_id != null && (
          <button
            type="button"
            onClick={() => {
              if (!window.confirm(`Refund R${(order.total_cents / 100).toFixed(2)} to ${order.customer_name} through Bob Pay? This cannot be undone here.`)) return;
              run(() => refundBobPayOrder(order.id));
            }}
            disabled={isPending}
            className="rounded-full border border-red-300 px-3 py-1 font-semibold text-red-700 hover:border-red-400 disabled:opacity-50"
          >
            Refund via Bob Pay
          </button>
        )}

        <span className="flex items-center gap-1.5 text-gray-500">
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

        {/* Cancelled rather than deleted. A buyer who changed their mind is
            still a real thing that happened, and the figures need it to
            have an ending rather than a gap. */}
        {!cancelled && (
          <button
            type="button"
            onClick={() => {
              if (confirm(`Cancel ${order.customer_name}'s order?`)) run(() => cancelOrder(order.id));
            }}
            disabled={isPending}
            className="ml-auto font-semibold text-red-600 underline-offset-2 hover:underline disabled:opacity-50"
          >
            Cancel order
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </li>
  );
}
