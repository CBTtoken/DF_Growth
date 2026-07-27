"use client";

import { useState } from "react";
import { addLine } from "@/app/bizup/quotes/actions";

// Dewald: "what if this guy have like 50 or 100 items setup? This should be
// a line item that says something like, start typing and select the item
// from your price list."
//
// It was a wall of tappable chips, which is fine for eight prices and
// unusable at eighty. Filtering happens here in the browser rather than as
// a server round trip per keystroke: the whole price list is already on the
// page, it is small, and a member adding lines on site with one bar of
// signal should not wait for the network to type.

export interface PickerItem {
  id: string;
  name: string;
  /** Already priced for the document's rate and markup, server side. */
  priceLabel: string;
  unitLabel: string;
}

const MAX_SHOWN = 8;

export function PriceListPicker({
  documentId,
  items,
}: {
  documentId: string;
  items: PickerItem[];
}) {
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const matches = q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items;
  const shown = matches.slice(0, MAX_SHOWN);

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-ink">From your price list</h2>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Start typing to find a price"
        // 16px, like every other input here: iOS Safari zooms into anything
        // smaller and this is a phone-first product.
        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        aria-label="Search your price list"
      />

      {shown.length === 0 ? (
        <p className="text-sm text-gray-500">
          Nothing in your price list matches that. You can still type a one-off line below.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {shown.map((item) => (
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
          ))}
        </div>
      )}

      {/* Only shown when something is actually hidden, so a member with six
          prices never sees a count they have no use for. */}
      {matches.length > shown.length && (
        <p className="text-xs text-gray-500">
          Showing {shown.length} of {matches.length}. Keep typing to narrow it down.
        </p>
      )}
    </section>
  );
}
