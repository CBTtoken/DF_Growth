import Link from "next/link";
import { formatZar } from "@/lib/bizup/money";
import { createQuote } from "@/app/bizup/quotes/actions";
import { createInvoice } from "@/app/bizup/invoices/actions";
import { setQuoteOutcome } from "@/app/bizup/quotes/convert-actions";
import { markInvoicePaid } from "@/app/bizup/invoices/actions";
import { capWarning } from "@/lib/bizup/cap";
import { remindAboutInvoice } from "@/app/bizup/invoices/reminder-actions";
import { daysOverdue, overdueLabel, remindedAgoLabel } from "@/lib/bizup/reminders";
import { ShareBizUp } from "@/components/bizup/ShareBizUp";
import { InstallApp } from "@/components/bizup/InstallApp";
import type { HomeSummary } from "@/lib/bizup/home";

// Rebuilt to Dewald's own running order, which is better than mine was:
//   1. Owed to you, and waiting on a reply
//   2. Documents used this month
//   3. The four things they actually do: new client, quote, invoice, prices
//   4. Everything else
//
// The order matters. The first screen answers "where do I stand", then
// tells them what they have left, then gets out of the way and lets them
// work. My previous version led with the New quote button, which is the
// right button but the wrong first question.

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  issued: "Unpaid",
  partially_paid: "Part paid",
  overdue: "Overdue",
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
  summary,
  hasSentDocument,
  setup,
}: {
  summary: HomeSummary;
  /** Already computed on the account, so this is not queried twice. */
  hasSentDocument: boolean;
  /**
   * The setup checklist, rendered by the page and placed here rather than
   * above, so it sits below the action buttons instead of filling the whole
   * first screen. Null once there is nothing left to set up, or before the
   * member has sent anything, when the first-run screen covers it instead.
   */
  setup: React.ReactNode;
}) {
  const warning = capWarning(summary.cap);
  const { cap } = summary;
  // Read from the summary rather than the clock: a component body must stay pure.
  const now = summary.nowMs;
  const today = summary.today;

  // A member who has never issued anything was opening this to three cards
  // reading R0.00 and a counter at zero: four pieces of nothing, and no
  // instruction. Eleven members signed up and none of them got past it.
  //
  // They get one screen with one thing on it instead. The money comes back
  // the moment there is any, which is the point at which it starts being
  // information rather than discouragement.
  if (!hasSentDocument) {
    return (
      <div className="flex flex-col gap-6">
        <section className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-extrabold tracking-tight text-ink">
            Let us get your first quote out
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray-600">
            Enter what you are charging for, add the customer, and send it on WhatsApp from your own
            number. It takes about a minute and there is nothing to set up first.
          </p>

          <form action={createQuote} className="mt-5 block">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-brand px-6 py-7 text-lg font-bold text-white shadow-sm transition hover:bg-brand-dark"
            >
              <span aria-hidden className="text-2xl leading-none">+</span>
              Start a quote
            </button>
          </form>

          <p className="mt-4 text-xs text-gray-500">
            Already did the job and just need to invoice?{" "}
            <Link href="/bizup/invoices" className="font-semibold text-brand hover:underline">
              Start an invoice instead
            </Link>
          </p>
        </section>

        {/* The two things worth doing once, offered rather than demanded.
            Neither blocks a quote, and saying so stops a member believing
            they have to fill in forms before they can work. */}
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-ink">When you have a minute</h2>
          <p className="mt-1 text-sm text-gray-600">
            Neither is needed to send a quote. Both take a minute and then never again.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Link
              href="/bizup/settings/business"
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-ink transition hover:border-brand hover:text-brand"
            >
              Your business details, which print at the top of every document
            </Link>
            <Link
              href="/bizup/settings/banking"
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-ink transition hover:border-brand hover:text-brand"
            >
              Your banking details, so customers can actually pay your invoices
            </Link>
          </div>
        </section>

        <InstallApp />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 3. What do you want to do.
          Dewald, 29 July 2026: "this guy is at a client, hands dirty,
          normally thick fingers, so fiddling around on a small menu to find
          what he wants to do?" He is right, and the live data settled the
          shape of the answer: of every document members have ever created,
          ten out of ten were quotes and not one was an invoice started on
          its own.

          So this is not four equal tiles. Quote is full width and tall
          because it is, so far, the only thing anyone does. The rest sit
          underneath at a size that still takes a thumb in sunlight but does
          not compete for the decision.

          Reports and Settings are deliberately absent. They are office
          tasks done sitting down, they already live in the menu, and a man
          standing in someone's kitchen does not want them here.

          Both quote and invoice create a record, so they are forms rather
          than links: Next prefetches links and would silently create empty
          drafts against the member's monthly count. */}
      <section>
        <h2 className="text-sm font-semibold text-ink">What do you want to do?</h2>

        <form action={createQuote} className="mt-2 block">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-brand px-6 py-7 text-lg font-bold text-white shadow-sm transition hover:bg-brand-dark"
          >
            <span aria-hidden className="text-2xl leading-none">+</span>
            Start a quote
          </button>
        </form>

        <div className="mt-3 grid grid-cols-3 gap-3">
          <form action={createInvoice} className="contents">
            <button
              type="submit"
              className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border border-gray-200 bg-white px-3 py-4 text-sm font-bold text-ink shadow-sm transition hover:border-brand hover:text-brand"
            >
              <span aria-hidden className="text-lg leading-none">+</span>
              Invoice
            </button>
          </form>

          <Link
            href="/bizup/customers/new"
            className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border border-gray-200 bg-white px-3 py-4 text-sm font-bold text-ink shadow-sm transition hover:border-brand hover:text-brand"
          >
            <span aria-hidden className="text-lg leading-none">+</span>
            Customer
          </Link>

          <Link
            href="/bizup/price-list"
            className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border border-gray-200 bg-white px-3 py-4 text-sm font-bold text-ink shadow-sm transition hover:border-brand hover:text-brand"
          >
            <span aria-hidden className="text-lg leading-none">R</span>
            Prices
          </Link>
        </div>
      </section>

      {/* Setup reminders, below the work rather than in front of it. */}
      {setup}

      {/* 1. Where do I stand */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat
          label="Income this month"
          value={formatZar(summary.incomeThisMonthCents)}
          sub="Payments you have received"
          href="/bizup/invoices"
        />
        <Stat
          label="Owed to you"
          value={formatZar(summary.owedCents)}
          sub={summary.owedCount === 1 ? "1 unpaid invoice" : `${summary.owedCount} unpaid invoices`}
          href="/bizup/invoices"
        />
        <Stat
          label="Waiting on a reply"
          value={formatZar(summary.awaitingReplyCents)}
          sub={summary.awaitingReplyCount === 1 ? "1 quote sent" : `${summary.awaitingReplyCount} quotes sent`}
          href="/bizup/quotes"
        />
      </div>

      {/* Only when there is something to chase. A permanent "Overdue: R0"
          teaches the member to ignore the row it lives in. */}
      {summary.overdueCount > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-bold text-amber-900">Needs chasing</h2>
            <span className="text-base font-bold text-amber-900">
              {formatZar(summary.overdueCents)}
            </span>
          </div>
          <p className="mt-1 text-sm text-amber-900">
            {summary.overdueCount === 1
              ? "1 invoice is past its due date."
              : `${summary.overdueCount} invoices are past their due date.`}{" "}
            Most people pay when reminded once.
          </p>

          {/* The invoices themselves, with the action attached. Showing a
              total and sending the member off to a list was the old
              behaviour, and it meant the product could tell you that you
              were owed money and then leave you to it. Chasing is the job. */}
          <div className="mt-3 flex flex-col gap-2">
            {summary.overdue.slice(0, 4).map((inv) => {
              const ago = remindedAgoLabel(inv.lastRemindedAt, now);
              return (
                <div
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-3"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink">
                      {inv.customerName ?? "No customer"}
                    </span>
                    <span className="block text-xs text-gray-500">
                      {formatZar(inv.outstandingCents)} ·{" "}
                      {overdueLabel(daysOverdue(inv.dueDate, today))}
                      {ago ? ` · ${ago}` : ""}
                    </span>
                  </span>
                  {/* A form, not a link: this records the reminder before
                      handing off to WhatsApp, and Next prefetches links. */}
                  <form action={remindAboutInvoice} className="shrink-0">
                    <input type="hidden" name="documentId" value={inv.id} />
                    <button
                      type="submit"
                      className="rounded-full bg-[#25D366] px-4 py-2 text-sm font-bold text-white transition hover:brightness-95"
                    >
                      {ago ? "Remind again" : "Send a reminder"}
                    </button>
                  </form>
                </div>
              );
            })}
          </div>

          {summary.overdue.length > 4 && (
            <Link
              href="/bizup/invoices"
              className="mt-2 inline-block text-sm font-semibold text-amber-900 underline-offset-2 hover:underline"
            >
              See all {summary.overdue.length}
            </Link>
          )}
        </section>
      )}

      {/* 2. Sec 15: "A permanently visible counter is the primary defence,
          not the warnings." */}
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
          {/* The way out, next to the number that creates the problem.
              Before this there was a counter telling a member they were
              running out and nothing anywhere in the product that let them
              do anything about it. */}
          <Link
            href="/bizup/upgrade"
            className="mt-2 inline-block text-xs font-semibold text-brand underline-offset-2 hover:underline"
          >
            {cap.remaining === 0 ? "Get more documents" : "See plans and topups"}
          </Link>
        </div>
      )}

      {/* 4. What is still open, with the answer one tap away.
          Dewald: "can we have a quick accept or decline option on their
          dashboards... and for invoices, paid option." Closed documents drop
          off this list by design and live in the full Quotes and Invoices
          sections. */}
      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-ink">Still open</h2>
          <Link href="/bizup/quotes" className="text-xs font-semibold text-brand hover:underline">
            See all
          </Link>
        </div>

        {summary.recent.length === 0 ? (
          <p className="mt-2 rounded-2xl border border-gray-100 bg-white p-5 text-center text-sm text-gray-500">
            Nothing open. Tap New quote and build one in front of your customer.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {summary.recent.map((d) => (
              <li
                key={d.id}
                className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <Link href={d.href} className="flex min-w-0 flex-1 items-center justify-between gap-3">
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

                {/* Only on a sent quote or an unpaid issued invoice, which
                    are the only two states where there is a one-word answer
                    worth capturing without opening the document. */}
                {d.docType === "quote" && d.status === "sent" && (
                  <div className="flex shrink-0 gap-2">
                    <form action={setQuoteOutcome}>
                      <input type="hidden" name="documentId" value={d.id} />
                      <input type="hidden" name="outcome" value="accepted" />
                      <button className="rounded-full bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700">
                        Accepted
                      </button>
                    </form>
                    <form action={setQuoteOutcome}>
                      <input type="hidden" name="documentId" value={d.id} />
                      <input type="hidden" name="outcome" value="declined" />
                      <button className="rounded-full border border-gray-200 px-4 py-2 text-xs font-bold text-gray-600 hover:border-gray-400">
                        Declined
                      </button>
                    </form>
                  </div>
                )}

                {d.docType === "invoice" && (d.status === "issued" || d.status === "partially_paid") && (
                  /* Dewald: "should it not prompt with how did the client
                     pay and what was on the statement?" It should. A
                     payment with no method and no reference cannot be
                     reconciled against a bank statement later, which is
                     what the accountant export exists for.

                     A <details> rather than a dialog, so it costs one tap,
                     needs no JavaScript, and still leaves the whole thing
                     as one action. */
                  <details className="shrink-0">
                    <summary className="cursor-pointer list-none rounded-full bg-green-600 px-4 py-2 text-xs font-bold text-white marker:content-none hover:bg-green-700">
                      Mark paid
                    </summary>
                    <form
                      action={markInvoicePaid}
                      className="mt-2 flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3"
                    >
                      <input type="hidden" name="documentId" value={d.id} />
                      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
                        How did they pay?
                        <select name="method" defaultValue="eft" className="rounded-lg border border-gray-200 px-3 py-2 text-base">
                          <option value="eft">EFT</option>
                          <option value="cash">Cash</option>
                          <option value="card">Card</option>
                          <option value="other">Other</option>
                        </select>
                      </label>
                      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
                        What is on your statement?
                        <input
                          name="reference"
                          placeholder="Optional"
                          className="rounded-lg border border-gray-200 px-3 py-2 text-base"
                        />
                      </label>
                      <button className="rounded-full bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700">
                        Confirm paid in full
                      </button>
                    </form>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Below the work, not above it. A member opening this to send a
          quote should see the quote buttons first; an install prompt at the
          top of the screen is the kind of thing people learn to dismiss
          without reading. It hides itself once installed or once declined. */}
      <InstallApp />

      <ShareBizUp />

    </div>
  );
}
