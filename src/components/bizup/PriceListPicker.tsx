"use client";

import { useState } from "react";
import { addLine } from "@/app/bizup/quotes/actions";

// Dewald, first pass: "what if this guy have like 50 or 100 items setup?
// This should be a line item that says something like, start typing and
// select the item from your price list."
//
// Second pass, after using it: "it should not show all the items in price
// list, rather the box where they type... but also add a drop down option?
// This part is a bit bulky or untidy."
//
// Both are right, and the fix is the same shape either way: show one line,
// not a list. Typing filters and shows only what matches. Not typing shows
// a plain dropdown, which is the faster path for someone who knows the
// name already and does not want to type it. Nothing is listed until the
// member asks for something, so a price list of eighty items takes the
// same space as one of three.

export interface PickerItem {
  id: string;
  name: string;
  /** Already priced for the document's rate and markup, server side. */
  priceLabel: string;
  unitLabel: string;
}

const MAX_SHOWN = 6;

const control =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

export function PriceListPicker({
  documentId,
  items,
}: {
  documentId: string;
  items: PickerItem[];
}) {
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const matches = q ? items.filter((i) => i.name.toLowerCase().includes(q)) : [];
  const shown = matches.slice(0, MAX_SHOWN);

  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-ink">Add from your price list</h2>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Start typing to find a price"
        // 16px like every other input here: iOS Safari zooms into anything
        // smaller and this is a phone-first product.
        className={control}
        aria-label="Search your price list"
      />

      {/* Results appear only while searching. This is the part that used to
          be a permanent wall of chips. */}
      {q && (
        <div className="flex flex-col gap-2">
          {shown.length === 0 ? (
            <p className="text-sm text-gray-500">
              Nothing matches that. You can still type a one-off line below.
            </p>
          ) : (
            shown.map((item) => (
              <form key={item.id} action={addLine}>
                <input type="hidden" name="documentId" value={documentId} />
                <input type="hidden" name="catalogueItemId" value={item.id} />
                <input type="hidden" name="quantity" value="1" />
                <button
                  type="submit"
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm shadow-sm transition hover:border-brand"
                >
                  <span className="min-w-0">
                    <span className="block font-medium text-ink">{item.name}</span>
                    <span className="text-gray-500">{item.unitLabel}</span>
                  </span>
                  <span className="shrink-0 font-semibold text-ink">{item.priceLabel}</span>
                </button>
              </form>
            ))
          )}
          {matches.length > shown.length && (
            <p className="text-xs text-gray-500">
              Showing {shown.length} of {matches.length}. Keep typing to narrow it down.
            </p>
          )}
        </div>
      )}

      {/* The dropdown Dewald asked for. Faster than typing for a member who
          knows the name, and it keeps the whole list reachable without
          putting it on the screen. Hidden while searching, so there are
          never two ways to pick showing at once. */}
      {!q && (
        <form action={addLine} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="documentId" value={documentId} />
          <input type="hidden" name="quantity" value="1" />
          <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs font-medium text-gray-600">
            Or pick from the list
            <select name="catalogueItemId" defaultValue="" className={control} required>
              <option value="" disabled>
                Choose a price
              </option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.priceLabel}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
          >
            Add
          </button>
        </form>
      )}
    </section>
  );
}
