"use client";

import { useState, useTransition } from "react";
import type { SlipActionState } from "@/app/bizup/slips/actions";

// One slip in the list (HANDOFF-slip-management.md step 3): the numbers,
// one tap for Business / Personal, and inline editing behind one press.
// Built to work one-handed in a queue, the same standard the walkthrough
// held the quote flow to: the two allocation buttons are the big targets,
// everything else folds away.

export interface SlipCardData {
  id: string;
  imageUrl: string | null;
  slipDate: string | null;
  supplier: string | null;
  description: string | null;
  amountRands: string;
  vatRands: string;
  allocation: "business" | "personal" | null;
  status: "captured" | "reviewed" | "exported" | "purged";
}

type Action = (formData: FormData) => Promise<SlipActionState>;

const STATUS_LABEL: Record<SlipCardData["status"], string> = {
  captured: "Check the numbers",
  reviewed: "Checked",
  exported: "Sent to your accountant",
  purged: "Sent to your accountant",
};

export function SlipCard({
  slip,
  saveAction,
  allocateAction,
  deleteAction,
}: {
  slip: SlipCardData;
  saveAction: Action;
  allocateAction: Action;
  deleteAction: Action;
}) {
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  const locked = slip.status === "exported" || slip.status === "purged";

  function run(action: Action, formData: FormData, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action(formData);
      if (result?.error) setError(result.error);
      else after?.();
    });
  }

  function allocate(allocation: "business" | "personal") {
    const fd = new FormData();
    fd.append("slipId", slip.id);
    fd.append("allocation", allocation);
    run(allocateAction, fd);
  }

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        {slip.imageUrl ? (
          // A plain img on purpose: the src is a short-lived signed URL to
          // a private bucket, which next/image would try to re-fetch
          // through the optimizer after the signature expired.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={slip.imageUrl}
            alt="Your slip"
            className="h-20 w-16 shrink-0 rounded-lg border border-gray-100 object-cover"
          />
        ) : (
          <div className="flex h-20 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-center text-[10px] leading-tight text-gray-400">
            Photo removed after export
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-semibold text-ink">
              {slip.supplier || "Unknown supplier"}
            </span>
            <span className="shrink-0 text-sm font-bold text-ink">R{slip.amountRands}</span>
          </div>
          <p className="mt-0.5 text-xs text-gray-500">
            {slip.slipDate ?? "No date"}
            {slip.description ? ` · ${slip.description}` : ""}
          </p>
          <p
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              slip.status === "captured"
                ? "bg-amber-50 text-amber-800"
                : locked
                  ? "bg-gray-100 text-gray-500"
                  : "bg-green-50 text-green-800"
            }`}
          >
            {STATUS_LABEL[slip.status]}
          </p>
        </div>
      </div>

      {!locked && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => allocate("business")}
            className={`rounded-xl px-4 py-3 text-sm font-bold transition disabled:opacity-70 ${
              slip.allocation === "business"
                ? "bg-brand text-white"
                : "border border-gray-200 text-gray-700 hover:border-brand hover:text-brand"
            }`}
          >
            Business
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => allocate("personal")}
            className={`rounded-xl px-4 py-3 text-sm font-bold transition disabled:opacity-70 ${
              slip.allocation === "personal"
                ? "bg-ink text-white"
                : "border border-gray-200 text-gray-700 hover:border-gray-400"
            }`}
          >
            Personal
          </button>
        </div>
      )}

      {locked && slip.allocation && (
        <p className="text-xs text-gray-500">
          {slip.allocation === "business"
            ? "Went with your accountant export. The numbers stay here; keep your original slip for SARS."
            : "Personal. Never included in an export."}
        </p>
      )}

      {!locked && !editing && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="self-start text-xs font-semibold text-brand underline-offset-2 hover:underline"
        >
          {slip.status === "captured" ? "Check and fix the details" : "Edit the details"}
        </button>
      )}

      {!locked && editing && (
        <form
          action={(fd) => {
            fd.append("slipId", slip.id);
            run(saveAction, fd, () => setEditing(false));
          }}
          className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3"
        >
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
              Slip date
              <input
                type="date"
                name="slipDate"
                required
                defaultValue={slip.slipDate ?? ""}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-base"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
              Total (R)
              <input
                type="number"
                name="amount"
                step="0.01"
                min="0"
                required
                defaultValue={slip.amountRands}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-base"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
            Supplier
            <input
              name="supplier"
              defaultValue={slip.supplier ?? ""}
              placeholder="Who you paid"
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-base"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
            What it was for
            <input
              name="description"
              defaultValue={slip.description ?? ""}
              placeholder="Optional"
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-base"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
            VAT shown on the slip (R)
            <input
              type="number"
              name="vat"
              step="0.01"
              min="0"
              defaultValue={slip.vatRands}
              placeholder="Leave blank if the slip shows none"
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-base"
            />
          </label>
          <div className="mt-1 flex items-center justify-between gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-70"
            >
              {pending ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                const fd = new FormData();
                fd.append("slipId", slip.id);
                run(deleteAction, fd);
              }}
              className="text-xs font-semibold text-red-600 underline-offset-2 hover:underline"
            >
              Delete this slip
            </button>
          </div>
        </form>
      )}

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>}
    </li>
  );
}
