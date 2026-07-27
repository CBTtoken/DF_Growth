"use client";

import { useActionState, useState } from "react";
import { issueInvoice, recordPayment } from "@/app/bizup/invoices/actions";

const btn =
  "inline-flex items-center justify-center rounded-full px-5 py-3 text-base font-semibold shadow-sm transition disabled:opacity-50";
const input =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

export function IssueInvoiceButton({ documentId, ready }: { documentId: string; ready: boolean }) {
  const [state, action, pending] = useActionState(issueInvoice, null);

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="documentId" value={documentId} />
      <button type="submit" disabled={pending || !ready} className={`${btn} bg-brand text-white hover:bg-brand-dark`}>
        {pending ? "Issuing..." : "Issue this invoice"}
      </button>
      <p className="text-xs text-gray-500">
        This gives it a number and a due date. After that the amounts cannot be changed, which is
        what SARS expects.
      </p>
      {/* Sec 3.2's over-R5,000 requirement and Sec 15's cap both surface
          here, as a next step rather than a failure. The draft is safe
          either way. */}
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm font-medium text-green-700">{state.ok}</p>}
    </form>
  );
}

export function RecordPaymentForm({
  documentId,
  outstandingLabel,
  outstandingAmount,
  deposit = false,
}: {
  documentId: string;
  outstandingLabel: string;
  /** What is still owed, as a plain "450.00", so "paid in full" can fill it in. */
  outstandingAmount: string;
  /**
   * Money taken before the invoice was written, which is the plumber's
   * normal case: cash on the day, or an EFT up front, with the invoice
   * following. Same action and same table, different wording, and no
   * "paid in full" shortcut because a deposit is by definition not the
   * whole thing often enough to make it a safe default.
   */
  deposit?: boolean;
}) {
  const [state, action, pending] = useActionState(recordPayment, null);
  const [mode, setMode] = useState<"full" | "part">("full");
  const [amount, setAmount] = useState(deposit ? "" : outstandingAmount);

  return (
    <form action={action} className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <input type="hidden" name="documentId" value={documentId} />
      <h2 className="text-sm font-semibold text-ink">
        {deposit ? "Already paid something?" : "Record a payment"}
      </h2>
      <p className="text-sm text-gray-500">{outstandingLabel}</p>

      {/* Dewald: "can we make it even easier, like full amount or part
          amount". Almost every payment is the whole thing, so that is one
          tap and the amount fills itself in. Part payment is still there,
          just not the default that everyone has to type around. */}
      {!deposit && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setMode("full");
              setAmount(outstandingAmount);
            }}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              mode === "full" ? "bg-brand text-white" : "border border-gray-200 bg-white text-gray-700"
            }`}
          >
            Paid in full
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("part");
              setAmount("");
            }}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              mode === "part" ? "bg-brand text-white" : "border border-gray-200 bg-white text-gray-700"
            }`}
          >
            Part payment
          </button>
        </div>
      )}

      <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
        Amount received
        <input
          name="amount"
          inputMode="decimal"
          placeholder="450.00"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setMode("part");
          }}
          className={input}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
          Date
          <input
            type="date"
            name="paidAt"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
          How
          <select name="method" defaultValue="eft" className={input}>
            <option value="eft">EFT</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="other">Other</option>
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
        Reference <span className="font-normal text-gray-400">(optional)</span>
        <input name="reference" className={input} placeholder="What appeared on your statement" />
      </label>

      <button type="submit" disabled={pending} className={`${btn} bg-brand text-white hover:bg-brand-dark`}>
        {pending ? "Saving..." : deposit ? "Add what they paid" : "Record payment"}
      </button>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm font-medium text-green-700">{state.ok}</p>}
    </form>
  );
}
