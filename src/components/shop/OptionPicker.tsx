"use client";

import { useMemo, useState } from "react";
import { readableTextOn } from "@/lib/color";
import type { ShopVariant } from "@/lib/shop/queries";

/**
 * Choosing one option out of many, without a wall of pills.
 *
 * The row of pills next door is right for a product with three flavours and
 * wrong for one with fifty-one fragrances: at that size it stops being a
 * choice and becomes a paragraph of nouns to read. WeCare Products forced
 * this, selling a Bella Vita perfume that comes in fifty-one scents for her
 * and forty-nine for him.
 *
 * So above a threshold the same options become a searchable list instead.
 * The threshold matters: too low and a member with six sizes loses the
 * pills, which are better when they fit. Twelve is roughly where two rows
 * become three on a 390px phone.
 *
 * A descriptor with two keys, e.g. { For: "Her", Fragrance: "Lady Million" },
 * groups by the first and is chosen by the second. That is how twenty options
 * on a shower gel read as ten for her and ten for him rather than twenty in a
 * row, and it comes from the member's own words rather than a fixed idea of
 * what a shop sells.
 */
export const PILL_LIMIT = 12;

export function OptionPicker({
  options,
  selectedId,
  onSelect,
  primaryColor,
  trackStock,
}: {
  options: ShopVariant[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  primaryColor: string;
  trackStock: boolean;
}) {
  const [query, setQuery] = useState("");

  const { groupKey, choiceKey } = useMemo(() => keysOf(options), [options]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    // Searches the whole label, so "her lady" finds it as readily as "lady".
    return options.filter((o) => labelOf(o).toLowerCase().includes(q));
  }, [options, query]);

  const groups = useMemo(() => {
    if (!groupKey) return [{ name: null as string | null, items: filtered }];
    const map = new Map<string, ShopVariant[]>();
    for (const o of filtered) {
      const name = o.descriptor?.[groupKey] ?? "";
      const list = map.get(name);
      if (list) list.push(o);
      else map.set(name, [o]);
    }
    return [...map].map(([name, items]) => ({ name, items }));
  }, [filtered, groupKey]);

  const selected = options.find((o) => o.id === selectedId) ?? null;
  const noun = (choiceKey ?? "option").toLowerCase();

  // With no grouping in play, the group value is already in the product's
  // title: "Chosen: Her, Lady Million" on a page headed "Perfume for Her"
  // says "Her" twice. With grouping it earns its place, because the same
  // fragrance name can appear under both headings.
  const chosenLabel = selected
    ? groupKey
      ? labelOf(selected)
      : (choiceKey ? (selected.descriptor?.[choiceKey] ?? labelOf(selected)) : labelOf(selected))
    : null;

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        Choose your {noun}
      </legend>

      {/* What is currently chosen, stated in words above the list. Without it
          a buyer who has scrolled the list has no way to see their own
          selection without scrolling back to find the highlighted row. */}
      <p className="text-sm text-gray-700">
        {chosenLabel ? (
          <>
            Chosen: <span className="font-semibold text-gray-900">{chosenLabel}</span>
          </>
        ) : (
          <span className="text-gray-500">Nothing chosen yet</span>
        )}
      </p>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={`Search ${options.length} ${noun}s`}
        aria-label={`Search ${noun}s`}
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-gray-500 focus:outline-none"
      />

      {filtered.length === 0 ? (
        <p className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">
          Nothing matches &ldquo;{query}&rdquo;. Clear the search to see all {options.length}, or
          phone us and we will check whether we can get it.
        </p>
      ) : (
        // A capped, scrollable list rather than the full fifty-one inline:
        // the price, the quantity and the buy button have to stay reachable
        // without scrolling past the whole range to get to them.
        <div className="max-h-80 overflow-y-auto rounded-xl border border-gray-200">
          {groups.map((group) => (
            <div key={group.name ?? "all"}>
              {group.name && (
                <p className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {group.name}
                </p>
              )}
              <ul>
                {group.items.map((option) => {
                  const disabled = trackStock && option.stock_quantity <= 0;
                  const active = option.id === selectedId;
                  const text = choiceKey
                    ? (option.descriptor?.[choiceKey] ?? labelOf(option))
                    : labelOf(option);
                  return (
                    <li key={option.id}>
                      <button
                        type="button"
                        disabled={disabled}
                        aria-pressed={active}
                        onClick={() => onSelect(option.id)}
                        className={`flex w-full items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 text-left text-sm transition last:border-b-0 disabled:cursor-not-allowed disabled:opacity-40 ${
                          active ? "font-semibold" : "text-gray-700 hover:bg-gray-50"
                        }`}
                        style={active ? { backgroundColor: primaryColor, color: readableTextOn(primaryColor) } : undefined}
                      >
                        <span>
                          {text}
                          {disabled ? " (sold out)" : ""}
                        </span>
                        {active && <span aria-hidden>✓</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </fieldset>
  );
}

/**
 * Which descriptor key groups the list and which one is being chosen.
 *
 * Only a key that actually varies is worth grouping by. A perfume sold only
 * for her carries For: "Her" on all fifty-one of its options, and heading
 * every one of them "HER" tells the buyer nothing they cannot already see in
 * the product's title.
 */
function keysOf(options: ShopVariant[]): { groupKey: string | null; choiceKey: string | null } {
  const keys = Object.keys(options[0]?.descriptor ?? {});
  const choiceKey = keys.at(-1) ?? null;
  if (keys.length < 2) return { groupKey: null, choiceKey };

  const first = keys[0];
  const distinct = new Set(options.map((o) => o.descriptor?.[first]));
  return { groupKey: distinct.size > 1 ? first : null, choiceKey };
}

function labelOf(variant: ShopVariant): string {
  return Object.values(variant.descriptor ?? {})
    .filter(Boolean)
    .join(", ");
}
