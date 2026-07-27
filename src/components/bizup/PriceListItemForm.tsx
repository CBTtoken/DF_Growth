"use client";

import { useActionState, useState } from "react";
import { CATALOGUE_TYPES, CATALOGUE_UNITS } from "@/lib/bizup/schemas";
import { formatZar, parseAmountToCents } from "@/lib/bizup/money";
import type { PriceListFormState } from "@/app/bizup/price-list/actions";

// 16px inputs, same reasoning as the other BizUp forms: iOS Safari zooms
// into anything smaller and this is a phone-first product.
const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20";
const labelClass = "flex flex-col gap-1.5 text-sm font-medium text-gray-700";

export interface PriceListItemDefaults {
  id?: string;
  name?: string | null;
  description?: string | null;
  type?: string | null;
  unit?: string | null;
  unitPriceExclCents?: number | null;
  defaultMarkupPct?: number | null;
}

export function PriceListItemForm({
  action,
  defaults = {},
  submitLabel,
}: {
  action: (state: PriceListFormState, formData: FormData) => Promise<PriceListFormState>;
  defaults?: PriceListItemDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [price, setPrice] = useState(
    defaults.unitPriceExclCents != null ? (defaults.unitPriceExclCents / 100).toFixed(2) : "",
  );
  const [markup, setMarkup] = useState(
    defaults.defaultMarkupPct != null ? String(defaults.defaultMarkupPct) : "",
  );
  const [unit, setUnit] = useState(defaults.unit ?? "each");

  // Live preview of what this line will actually bill at once the markup is
  // applied. Sec 11's markup exists because a plumber buys a geyser at cost
  // and bills at cost plus margin, and doing that arithmetic in your head on
  // a phone is where mistakes come from.
  const cents = parseAmountToCents(price);
  const markupPct = markup.trim() === "" ? null : Number(markup.replace(",", "."));
  const withMarkup =
    cents !== null && markupPct !== null && Number.isFinite(markupPct) && markupPct > 0
      ? Math.round(cents * (1 + markupPct / 100))
      : null;
  const unitLabel = CATALOGUE_UNITS.find((u) => u.value === unit)?.label ?? "";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}

      <label className={labelClass}>
        <span>Name</span>
        <input
          name="name"
          defaultValue={defaults.name ?? ""}
          className={inputClass}
          placeholder="Callout and assessment"
        />
        {state?.error?.name?.[0] && <span className="text-xs text-red-600">{state.error.name[0]}</span>}
      </label>

      <label className={labelClass}>
        <span>
          Description <span className="font-normal text-gray-400">(optional)</span>
        </span>
        <textarea
          name="description"
          defaultValue={defaults.description ?? ""}
          rows={2}
          className={inputClass}
          placeholder="What this covers, in the words your customer will read"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className={labelClass}>
          <span>Type</span>
          <select name="type" defaultValue={defaults.type ?? "labour"} className={inputClass}>
            {CATALOGUE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          <span>Charged</span>
          <select
            name="unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className={inputClass}
          >
            {CATALOGUE_UNITS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className={labelClass}>
        <span>Price, excluding VAT</span>
        <input
          name="unitPriceExclCents"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          inputMode="decimal"
          className={inputClass}
          placeholder="450.00"
        />
        {cents !== null && (
          <span className="text-xs text-gray-500">
            {formatZar(cents)} {unitLabel}
          </span>
        )}
        {state?.error?.unitPriceExclCents?.[0] && (
          <span className="text-xs text-red-600">{state.error.unitPriceExclCents[0]}</span>
        )}
      </label>

      <label className={labelClass}>
        <span>
          Markup <span className="font-normal text-gray-400">(optional)</span>
        </span>
        <input
          name="defaultMarkupPct"
          value={markup}
          onChange={(e) => setMarkup(e.target.value)}
          inputMode="decimal"
          className={inputClass}
          placeholder="20"
        />
        <span className="text-xs text-gray-500">
          For things you buy in and sell on. Leave blank if you charge what you paid.
        </span>
        {withMarkup !== null && (
          <span className="text-xs font-medium text-gray-700">
            Bills at {formatZar(withMarkup)} {unitLabel}
          </span>
        )}
        {state?.error?.defaultMarkupPct?.[0] && (
          <span className="text-xs text-red-600">{state.error.defaultMarkupPct[0]}</span>
        )}
      </label>

      {state?.error?._form?.[0] && <p className="text-sm text-red-600">{state.error._form[0]}</p>}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center rounded-full bg-brand px-6 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-50"
      >
        {pending ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
