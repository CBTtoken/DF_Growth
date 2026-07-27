import Link from "next/link";
import { formatZar } from "@/lib/bizup/money";
import { createQuote } from "@/app/bizup/quotes/actions";
import { capWarning } from "@/lib/bizup/cap";
import type { HomeSummary } from "@/lib/bizup/home";

// The signed-in home screen. Three numbers, one big button, and what you
// were last working on.
//
// Dewald's brief: "1 max 2 clicks to do their job they want to do". From
// here, creating a quote is one tap. Seeing who owes money is one tap.
// Everything else is deliberately further away.

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
  converted: "Invoiced",
  issued: "Unpaid",
  partially_paid: "Part paid",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
  credited: "Replaced",
  corrected: "Corrected",
};

function Stat({
  label,
  value,
  sub,
  href,
  tone = "normal",
}: {
  label: string;
  value: string;
  sub: string;
  href: string;
  tone?: "normal" | "alert";
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col rounded-2xl border p-4 shadow-sm transition hover:border-brand ${
        tone === "alert" ? "border-red-200 bg-red-50" : "border-gray-100 bg-white"
      }`}
    >
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
      <span className={`mt-1 text-2xl font-extrabold ${tone === "alert" ? "text-red-700" : "text-ink"}`}>
        {value}
      </span>
      <span className="text-xs text-gray-500">{sub}</span>
    </Link>
  );
}

export function BizUpHome({
  businessName,
  summary,
}: {
  businessName: string;
  summary: HomeSummary;
}) {
  const warning = capWarning(summary.cap);
  const { cap } = summary;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-baseline justify-between gap-3">
        <span className="text-2xl font-bold tracking-tight text-ink">BizUp</span>
        <span className="truncate text-sm text-gray-500">{businessName}</span>
      </header>

      {/* The job. Deliberately the largest thing on the screen, because it
          is what the member opened the app to do.

          A form rather than a link, because this creates a draft. Next
          prefetches links on hover and on viewport entry, so a link here
          would quietly create an empty quote every time the home screen
          loaded. */}
      <form action={createQuote}>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-5 text-lg font-bold text-white shadow-sm transition hover:bg-brand-dark"
        >
          <span aria-hidden className="text-2xl leading-none">+</span>
          New quote
        </button>
      </form>

      <div className="grid grid-cols-2 gap-3">
        <Stat
          label="Owed to you"
          value={formatZar(summary.owedCents)}
          sub={summary.owedCount === 1 ? "1 unpaid invoice" : `${summary.owedCount} unpaid invoices`}
          href="/bizup/invoices"
        />
        <Stat
          label="Waiting on a reply"
          value={formatZar(summary.awaitingReplyCents)}
          sub={
            summary.awaitingReplyCount === 1
              ? "1 quote sent"
              : `${summary.awaitingReplyCount} quotes sent`
          }
          href="/bizup/quotes"
        />
      </div>

      {/* Only when there is something to chase. An "Overdue: R0" tile every
          day trains the member to ignore the row it lives in. */}
      {summary.overdueCount > 0 && (
        <Stat
          label="Needs chasing"
          value={formatZar(summary.overdueCents)}
          sub={
            summary.overdueCount === 1
              ? "1 invoice is past its due date"
              : `${summary.overdueCount} invoices are past their due date`
          }
          href="/bizup/invoices"
          tone="alert"
        />
      )}

      {/* Sec 15: "A permanently visible counter is the primary defence, not
          the warnings. The member should never be able to be surprised by
          the cap at any point in the month." */}
      {cap.allowance !== null && (
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-semibold text-ink">
              {cap.used} of {cap.allowance} documents used this month
            </span>
            {cap.topupBalance > 0 && (
              <span className="text-xs text-gray-500">+{cap.topupBalance} topped up</span>
            )}
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full ${cap.remaining === 0 ? "bg-red-500" : "bg-brand"}`}
              style={{ width: `${Math.min(100, (cap.used / cap.allowance) * 100)}%` }}
            />
          </div>
          {warning && <p className="mt-2 text-xs font-medium text-amber-700">{warning}</p>}
          {cap.remaining === 0 && cap.topupBalance === 0 && (
            <p className="mt-2 text-xs font-medium text-red-700">
              You can still build quotes. You just cannot send them until you add more.
            </p>
          )}
        </div>
      )}

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-ink">Recent</h2>
          <Link href="/bizup/quotes" className="text-xs font-semibold text-brand hover:underline">
            See all
          </Link>
        </div>

        {summary.recent.length === 0 ? (
          <p className="mt-2 rounded-2xl border border-gray-100 bg-white p-5 text-center text-sm text-gray-500">
            Nothing yet. Tap New quote and build one in front of your customer.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {summary.recent.map((d) => (
              <li key={d.id}>
                <Link
                  href={d.href}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-brand"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-semibold text-ink">
                      {d.number ?? "Draft"}
                      {d.customerName ? ` · ${d.customerName}` : ""}
                    </span>
                    <span className="text-xs text-gray-500">
                      {d.docType === "quote" ? "Quote" : "Invoice"} ·{" "}
                      {STATUS_LABEL[d.status] ?? d.status}
                      {d.firstViewedAt ? " · Opened" : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-ink">
                    {formatZar(d.totalCents)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Settings deliberately lives down here, not in the navigation bar.
          A member touches these twice ever. */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-gray-100 pt-4 text-xs font-medium text-gray-500">
        <Link href="/bizup/price-list" className="hover:text-brand">Price list</Link>
        <Link href="/bizup/settings/business" className="hover:text-brand">Business details</Link>
        <Link href="/bizup/settings/banking" className="hover:text-brand">Banking details</Link>
      </div>
    </div>
  );
}
