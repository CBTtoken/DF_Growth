"use client";

import { useActionState } from "react";
import Link from "next/link";
import { setBuildOrderStatus } from "@/app/admin/build-queue/actions";

type Order = {
  id: string;
  business_name: string;
  slug: string | null;
  contact_email: string | null;
  call_phone: string | null;
  whatsapp_phone: string | null;
  industry: string | null;
  business_address: string | null;
  plan: string | null;
  billing_cycle: string | null;
  build_order_status: string | null;
  build_order_paid_at: string | null;
  build_order_due_at: string | null;
  build_order_brief: string | null;
  build_order_amount_cents: number | null;
};

// The clock, in the words that actually matter when you are looking at a
// queue: how long is left, not a raw timestamp to subtract in your head.
// Overdue is stated plainly rather than softened, because a promise was
// made to a paying customer.
function clock(dueAt: string | null): { label: string; tone: "overdue" | "today" | "fine" } {
  if (!dueAt) return { label: "No date set", tone: "fine" };

  const due = new Date(dueAt);
  const msLeft = due.getTime() - Date.now();
  const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));

  if (msLeft < 0) {
    const daysOver = Math.abs(Math.floor(msLeft / (24 * 60 * 60 * 1000)));
    return { label: daysOver === 0 ? "Due today, overdue" : `${daysOver} day${daysOver === 1 ? "" : "s"} overdue`, tone: "overdue" };
  }
  if (daysLeft <= 1) return { label: "Due today", tone: "today" };
  return { label: `${daysLeft} days left`, tone: "fine" };
}

export function BuildOrderRow({ order }: { order: Order }) {
  const [state, action, pending] = useActionState(setBuildOrderStatus, null);
  const { label, tone } = clock(order.build_order_due_at);

  const toneClass =
    tone === "overdue"
      ? "bg-red-100 text-red-700"
      : tone === "today"
        ? "bg-amber-100 text-amber-800"
        : "bg-green-100 text-green-700";

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold tracking-tight text-ink">{order.business_name}</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            {order.industry ?? "No trade given"} · {order.plan === "growth_engine" ? "Growth" : "Foundation"} ·{" "}
            {order.billing_cycle === "annual" ? "annual" : "monthly"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${toneClass}`}>{label}</span>
          {order.build_order_status === "in_progress" && (
            <span className="rounded-full bg-brand/10 px-2.5 py-1 text-xs font-bold text-brand">
              In progress
            </span>
          )}
        </div>
      </div>

      {order.build_order_brief && (
        <div className="rounded-xl bg-gray-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            In their own words
          </p>
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
            {order.build_order_brief}
          </p>
        </div>
      )}

      <dl className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
        <div className="flex gap-2">
          <dt className="text-gray-500">Email</dt>
          <dd className="font-medium text-ink">{order.contact_email ?? "not given"}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-gray-500">Call</dt>
          <dd className="font-medium text-ink">{order.call_phone ?? "not given"}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-gray-500">WhatsApp</dt>
          <dd className="font-medium text-ink">{order.whatsapp_phone ?? "not given"}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-gray-500">Where</dt>
          <dd className="font-medium text-ink">{order.business_address ?? "not given"}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-center gap-2">
        {order.slug && (
          <Link
            href={`/${order.slug}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-gray-200 px-3.5 py-1.5 text-xs font-semibold text-gray-600 hover:border-gray-300"
          >
            View page ↗
          </Link>
        )}
        <Link
          href={`/admin/clients/${order.id}`}
          className="rounded-full border border-gray-200 px-3.5 py-1.5 text-xs font-semibold text-gray-600 hover:border-gray-300"
        >
          Client record
        </Link>

        <form action={action} className="contents">
          <input type="hidden" name="clientId" value={order.id} />
          {order.build_order_status === "paid" ? (
            <button
              type="submit"
              name="status"
              value="in_progress"
              disabled={pending}
              className="rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
            >
              {pending ? "Saving..." : "Start this build"}
            </button>
          ) : (
            <button
              type="submit"
              name="status"
              value="delivered"
              disabled={pending}
              className="rounded-full bg-green-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
            >
              {pending ? "Saving..." : "Mark delivered"}
            </button>
          )}
        </form>
      </div>

      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </article>
  );
}
