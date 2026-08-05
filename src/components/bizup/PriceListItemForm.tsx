"use client";

import { useActionState, useState } from "react";
import { CATALOGUE_TYPES, CATALOGUE_UNITS } from "@/lib/bizup/schemas";
import { formatZar, parseAmountToCents } from "@/lib/bizup/money";
import type { PriceListFormState } from "@/app/bizup/price-list/actions";

// 16px inputs, same reasoning as the other KatisoBiz forms: iOS Safari zooms
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
  markupType?: string | null;
  defaultMarkupAmountCents?: number | null;
  insurancePriceExclCents?: number | null;
}

export function PriceListItemForm({
  action,
  defaults = {},
  submitLabel,
  insurancePricing = false,
}: {
  action: (state: PriceListFormState, formData: FormData) => Promise<PriceListFormState>;
  defaults?: PriceListItemDefaults;
  submitLabel: string;
  /** Only true for accounts that have turned insurance rates on in settings. */
  insurancePricing?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [price, setPrice] = useState(
    defaults.unitPriceExclCents != null ? (defaults.unitPriceExclCents / 100).toFixed(2) : "",
  );
  const [insurancePrice, setInsurancePrice] = useState(
    defaults.insurancePriceExclCents != null
      ? (defaults.insurancePriceExclCents / 100).toFixed(2)
      : "",
  );
  const [markup, setMarkup] = useState(
    defaults.defaultMarkupPct != null ? String(defaults.defaultMarkupPct) : "",
  );
  const [markupType, setMarkupType] = useState<"percent" | "amount">(
    defaults.markupType === "amount" ? "amount" : "percent",
  );
  const [markupAmount, setMarkupAmount] = useState(
    defaults.defaultMarkupAmountCents != null
      ? (defaults.defaultMarkupAmountCents / 100).toFixed(2)
      : "",
  );
  const [unit, setUnit] = useState(defaults.unit ?? "each");

  // Live preview of what this line will actually bill at once the markup is
  // applied. Sec 11's markup exists because a plumber buys a geyser at cost
  // and bills at cost plus margin, and doing that arithmetic in your head on
  // a phone is where mistakes come from.
  const cents = parseAmountToCents(price);
  const insuranceCents = parseAmountToCents(insurancePrice);
  const markupPct = markup.trim() === "" ? null : Number(markup.replace(",", "."));
  const markupCents = parseAmountToCents(markupAmount);
  // Live preview of what this line actually bills at, whichever markup
  // shape is in force. Doing this arithmetic in your head on a phone is
  // where mistakes come from, so the answer is shown rather than implied.
  const withMarkup =
    cents === null
      ? null
      : markupType === "amount"
        ? markupCents !== null && markupCents > 0
          ? cents + markupCents
          : null
        : markupPct !== null && Number.isFinite(markupPct) && markupPct > 0
          ? Math.round(cents * (1 + markupPct / 100))
          : null;
  const unitLabel = CATALOGUE_UNITS.find((u) => u.value === unit)?.label ?? unit;

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
          {/* Free text with the usual units suggested, not a closed list —
              a member sign flagged that tiling (per m²) and trenching (per
              linear metre) had nowhere to go here, and the same is true
              for any trade that prices by area or length. */}
          <input
            name="unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            list="price-list-units"
            className={inputClass}
            placeholder="each"
          />
          <datalist id="price-list-units">
            {CATALOGUE_UNITS.map((u) => (
              <option key={u.value} value={u.value} />
            ))}
          </datalist>
        </label>
      </div>

      <label className={labelClass}>
        <span>{insurancePricing ? "Private price, excluding VAT" : "Price, excluding VAT"}</span>
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

      {/* Only rendered for accounts that charge insurance work differently.
          Everyone else never sees a second price field, which is the whole
          point of putting it behind a setting. */}
      {insurancePricing && (
        <label className={labelClass}>
          <span>
            Insurance price, excluding VAT{" "}
            <span className="font-normal text-gray-400">(optional)</span>
          </span>
          <input
            name="insurancePriceExclCents"
            value={insurancePrice}
            onChange={(e) => setInsurancePrice(e.target.value)}
            inputMode="decimal"
            className={inputClass}
            placeholder="Same as above"
          />
          <span className="text-xs text-gray-500">
            Leave blank if you charge the same either way. Blank is not zero, it just uses the
            price above.
          </span>
          {insuranceCents !== null && (
            <span className="text-xs font-medium text-gray-700">
              {formatZar(insuranceCents)} {unitLabel} on insurance jobs
            </span>
          )}
          {state?.error?.insurancePriceExclCents?.[0] && (
            <span className="text-xs text-red-600">{state.error.insurancePriceExclCents[0]}</span>
          )}
        </label>
      )}

      {/* Dewald: "the markup on the price list, should be a % or flat
          figure?" Both. A percentage suits a part bought at cost and sold
          on at a margin; a flat amount suits a fixed handling fee, where
          working out the equivalent percentage on a phone is exactly where
          wrong prices come from. */}
      <div className={labelClass}>
        <span>
          Markup <span className="font-normal text-gray-400">(optional)</span>
        </span>

        <input type="hidden" name="markupType" value={markupType} />
        <div className="flex gap-2">
          {(["percent", "amount"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setMarkupType(t)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                markupType === t
                  ? "bg-brand text-white"
                  : "border border-gray-200 bg-white text-gray-700"
              }`}
            >
              {t === "percent" ? "Percentage" : "Rand amount"}
            </button>
          ))}
        </div>

        {markupType === "percent" ? (
          <input
            name="defaultMarkupPct"
            value={markup}
            onChange={(e) => setMarkup(e.target.value)}
            inputMode="decimal"
            className={inputClass}
            placeholder="20"
            aria-label="Markup percentage"
          />
        ) : (
          <input
            name="defaultMarkupAmountCents"
            value={markupAmount}
            onChange={(e) => setMarkupAmount(e.target.value)}
            inputMode="decimal"
            className={inputClass}
            placeholder="150.00"
            aria-label="Markup in rands"
          />
        )}

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
        {state?.error?.defaultMarkupAmountCents?.[0] && (
          <span className="text-xs text-red-600">{state.error.defaultMarkupAmountCents[0]}</span>
        )}
      </div>

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
