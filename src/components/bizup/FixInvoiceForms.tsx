"use client";

import Link from "next/link";
import { useActionState } from "react";
import { correctParticulars, cancelInvoice, replaceInvoice } from "@/app/bizup/invoices/[id]/fix/actions";

// BizUp/docs/bizup-phase1-spec.md Sec 7. The copy here is verbatim from the
// spec's own screen copy, which says "build this wording, do not
// improvise". Anything that reads like a paraphrase is a bug.

const card = "rounded-2xl border border-gray-100 bg-white p-6 shadow-sm";
const choice =
  "w-full rounded-xl border border-gray-200 bg-white px-5 py-4 text-left text-base font-semibold text-ink transition hover:border-brand hover:text-brand";
const primary =
  "inline-flex w-full items-center justify-center rounded-full bg-brand px-6 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-50";
const input =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
const label = "flex flex-col gap-1.5 text-sm font-medium text-gray-700";

/**
 * Sec 7: "If the invoice has recorded payments against it, Paths B and C
 * must warn first." Shown before the destructive step, not after.
 */
function PaymentWarning({ paidCents, paidLabel }: { paidCents: number; paidLabel: string }) {
  if (paidCents <= 0) return null;
  return (
    <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      You have recorded {paidLabel} received against this invoice. Cancelling it will leave that
      payment unallocated. Continue?
    </p>
  );
}

export function FixForm({
  documentId,
  number,
  step,
  paidCents,
  paidLabel,
  lateWarning,
  customerName,
  customerAddress,
  customerVatNumber,
  lines,
}: {
  documentId: string;
  number: string;
  step: string;
  paidCents: number;
  paidLabel: string;
  lateWarning: string | null;
  customerName: string;
  customerAddress: string;
  customerVatNumber: string;
  lines: { id: string; description: string }[];
}) {
  const [correctState, correctAction, correcting] = useActionState(correctParticulars, null);
  const [cancelState, cancelAction, cancelling] = useActionState(cancelInvoice, null);
  const [replaceState, replaceAction, replacing] = useActionState(replaceInvoice, null);

  const href = (s: string) => `/bizup/invoices/${documentId}/fix?step=${s}`;

  // Screen 1
  if (step === "1") {
    return (
      <div className={card}>
        <h1 className="text-xl font-bold tracking-tight text-ink">Let&apos;s fix invoice {number}</h1>
        <p className="mt-1 text-sm text-gray-600">First, one question.</p>

        <p className="mt-6 text-base font-semibold text-ink">Does the amount need to change?</p>

        <div className="mt-4 flex flex-col gap-3">
          <Link href={href("a")} className={choice}>
            No, the amount is right
          </Link>
          <Link href={href("2")} className={choice}>
            Yes, the amount is wrong
          </Link>
        </div>

        <p className="mt-4 text-xs text-gray-500">
          Don&apos;t worry, nothing has been sent to your customer yet.
        </p>
      </div>
    );
  }

  // Screen 2
  if (step === "2") {
    return (
      <div className={card}>
        <h1 className="text-xl font-bold tracking-tight text-ink">What happened?</h1>
        <div className="mt-4 flex flex-col gap-3">
          <Link href={href("b")} className={choice}>
            The customer is not paying this at all
          </Link>
          <Link href={href("c")} className={choice}>
            The amount should be different
          </Link>
        </div>
      </div>
    );
  }

  // Path A
  if (step === "a") {
    return (
      <form action={correctAction} className={card}>
        <input type="hidden" name="documentId" value={documentId} />
        <h1 className="text-xl font-bold tracking-tight text-ink">Correct the details</h1>
        <p className="mt-1 text-sm text-gray-600">
          You can fix the name, address, VAT number or the wording of what you did. The invoice
          keeps the same number and date, which is what SARS expects.
        </p>

        {lateWarning && (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {lateWarning}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-4">
          <label className={label}>
            Customer name
            <input name="customerName" defaultValue={customerName} className={input} />
          </label>
          <label className={label}>
            Customer address
            <input name="customerAddress" defaultValue={customerAddress} className={input} />
          </label>
          <label className={label}>
            Customer VAT number
            <input name="customerVatNumber" defaultValue={customerVatNumber} className={input} />
          </label>

          {lines.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold text-ink">What you did</p>
              {/* Only the wording. Sec 7: quantity, price and total are not
                  editable on this path, so they are not rendered at all
                  rather than shown disabled. */}
              {lines.map((l) => (
                <input key={l.id} name={`line_${l.id}`} defaultValue={l.description} className={input} />
              ))}
              <p className="text-xs text-gray-500">
                The amounts stay exactly as they were. Only the wording changes.
              </p>
            </div>
          )}

          <label className={label}>
            What went wrong? <span className="font-normal text-gray-400">(required)</span>
            <textarea name="reason" rows={3} className={input} />
          </label>
        </div>

        {correctState?.error && <p className="mt-3 text-sm text-red-600">{correctState.error}</p>}

        <button type="submit" disabled={correcting} className={`${primary} mt-5`}>
          {correcting ? "Saving..." : "Save corrected invoice"}
        </button>
      </form>
    );
  }

  // Path B
  if (step === "b") {
    return (
      <form action={cancelAction} className={card}>
        <input type="hidden" name="documentId" value={documentId} />
        <h1 className="text-xl font-bold tracking-tight text-ink">Cancel invoice {number}</h1>
        <p className="mt-1 text-sm text-gray-600">
          We will create a credit note that cancels this invoice completely. Both documents stay in
          your records, which is what the law requires.
        </p>

        <div className="mt-4">
          <PaymentWarning paidCents={paidCents} paidLabel={paidLabel} />
        </div>

        <label className={`${label} mt-5`}>
          Why is it being cancelled? <span className="font-normal text-gray-400">(required)</span>
          <textarea name="reason" rows={3} className={input} />
        </label>

        {cancelState?.error && <p className="mt-3 text-sm text-red-600">{cancelState.error}</p>}

        <button type="submit" disabled={cancelling} className={`${primary} mt-5`}>
          {cancelling ? "Cancelling..." : "Cancel this invoice"}
        </button>

        {/* Sec 7's second button on this screen. It is Path C, reached from
            here because a member who starts by saying "they are not paying"
            often means "not paying this one". */}
        <button
          type="submit"
          formAction={replaceAction}
          disabled={replacing}
          className="mt-3 w-full rounded-full border border-gray-200 bg-white px-6 py-3.5 text-base font-semibold text-gray-700 transition hover:border-brand hover:text-brand disabled:opacity-50"
        >
          {replacing ? "Working..." : "Cancel this invoice and start a new one"}
        </button>
      </form>
    );
  }

  // Path C
  if (step === "c") {
    return (
      <form action={replaceAction} className={card}>
        <input type="hidden" name="documentId" value={documentId} />
        <h1 className="text-xl font-bold tracking-tight text-ink">Replace invoice {number}</h1>
        <p className="mt-1 text-sm text-gray-600">
          We will cancel this invoice with a credit note, then open a new invoice with the same
          details for you to fix. Both stay in your records.
        </p>

        <div className="mt-4">
          <PaymentWarning paidCents={paidCents} paidLabel={paidLabel} />
        </div>

        <label className={`${label} mt-5`}>
          What needs to change? <span className="font-normal text-gray-400">(required)</span>
          <textarea name="reason" rows={3} className={input} />
        </label>

        {replaceState?.error && <p className="mt-3 text-sm text-red-600">{replaceState.error}</p>}

        <button type="submit" disabled={replacing} className={`${primary} mt-5`}>
          {replacing ? "Working..." : "Create the new invoice"}
        </button>
      </form>
    );
  }

  return (
    <div className={card}>
      <p className="text-sm text-gray-600">That step does not exist.</p>
      <Link href={href("1")} className="mt-3 inline-block text-sm font-semibold text-brand underline-offset-2 hover:underline">
        Start again
      </Link>
    </div>
  );
}
