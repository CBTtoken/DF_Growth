"use client";

import { useState, useTransition } from "react";
import { assignBatchNumber, markOrderShipped } from "@/app/dashboard/orders-actions";
import { Card } from "@/components/ui/Card";

export type BookOrder = {
  id: string;
  created_at: string;
  edition: "standard" | "personalised";
  quantity: number;
  buyer_name: string;
  email: string;
  phone: string;
  delivery_address: { street?: string; suburb?: string; city?: string; postalCode?: string } | null;
  recipient_name: string | null;
  gift_message: string | null;
  amount: number;
  payment_status: string;
  batch_number: number | null;
  fulfilment_status: string;
};

// STANDING365_LANDING_BUILD_SPEC_CLAUDE.md Sprint 3: the one piece missing
// entirely until now — orders were being paid for and written to
// book_orders with no way for Dewald to ever see them, assign a batch, or
// find the personalisation details (recipient name, gift message) needed
// to actually print a cover. Lives in the dashboard rather than admin-only
// deliberately: this is scoped to the signed-in client's own
// growth_client_id, so it works exactly the same way the day a real member
// requests their own custom order-taking page, not just for Dewald.
export function OrdersSection({ orders }: { orders: BookOrder[] }) {
  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-ink">Book orders</h2>
        <p className="text-sm text-gray-500">Standing 365 paperback orders, including personalisation details.</p>
      </div>

      {orders.length === 0 ? (
        <p className="text-sm text-gray-400">No orders yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function OrderRow({ order }: { order: BookOrder }) {
  const [batchInput, setBatchInput] = useState(order.batch_number?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const address = order.delivery_address;
  const addressLine = address
    ? [address.street, address.suburb, address.city, address.postalCode].filter(Boolean).join(", ")
    : "—";

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
          <p className="font-semibold text-gray-900">
            {order.buyer_name}
            <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-500">
              {order.edition === "personalised" ? "Personalised" : `Standard × ${order.quantity}`}
            </span>
          </p>
          <p className="text-gray-500">
            <a href={`mailto:${order.email}`} className="text-brand underline-offset-2 hover:underline">
              {order.email}
            </a>{" "}
            · {order.phone}
          </p>
        </div>
        <span className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString()}</span>
      </div>

      <p className="text-gray-600">
        <span className="font-medium text-gray-700">Deliver to:</span> {addressLine}
      </p>

      {order.edition === "personalised" && (
        <div className="rounded-lg border border-brand/20 bg-brand/5 p-3">
          <p className="font-medium text-gray-800">Print on cover: {order.recipient_name}</p>
          <p className="mt-1 whitespace-pre-wrap text-gray-600">&ldquo;{order.gift_message}&rdquo;</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 border-t border-gray-200 pt-2 text-xs text-gray-500">
        <span>
          R{(order.amount / 100).toFixed(2)} ·{" "}
          <span
            className={order.payment_status === "paid" ? "font-semibold text-green-700" : "font-semibold text-amber-700"}
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
            placeholder="—"
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
