"use client";

// The shared occupation picker: one searchable, narrowing dropdown over the
// official OFO 2021 list, used identically by the CV builder and the vacancy
// composer (handoff Job 1: "Do not build two different pickers"). The list
// is far too long for browsing, so there is no browse mode at all: type,
// narrow, tap. Synonym matches show what matched ("Councillor") above the
// official title they resolve to.

import { useEffect, useRef, useState } from "react";

export type OfoSelection = {
  code: string;
  title: string;
};

type SearchResult = {
  code: string;
  title: string;
  via: string | null;
};

export function OfoPicker({
  placeholder,
  excludeCodes,
  onPick,
  autoFocus,
}: {
  placeholder: string;
  /** Codes already chosen, hidden from results (multi-select callers). */
  excludeCodes?: string[];
  onPick: (selection: OfoSelection) => void;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSeq = useRef(0);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const q = query.trim();
    // Below two characters nothing is rendered (the list is gated on query
    // length), so stale state can simply sit there -- no synchronous
    // setState in the effect body (react-hooks/purity).
    if (q.length < 2) return;
    debounce.current = setTimeout(async () => {
      const seq = ++requestSeq.current;
      setSearching(true);
      try {
        const res = await fetch(`/api/jobs/ofo-search?q=${encodeURIComponent(q)}`);
        const body = (await res.json()) as { results: SearchResult[] };
        // A slow earlier response must never overwrite a newer query's list.
        if (seq === requestSeq.current) setResults(body.results ?? []);
      } catch {
        if (seq === requestSeq.current) setResults([]);
      } finally {
        if (seq === requestSeq.current) setSearching(false);
      }
    }, 250);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);

  const excluded = new Set(excludeCodes ?? []);
  const visible = results.filter((r) => !excluded.has(r.code));

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        inputMode="text"
        className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-base outline-none focus:border-neutral-900"
      />
      {query.trim().length >= 2 && (
        <div className="mt-2 flex max-h-[45vh] flex-col gap-1 overflow-y-auto">
          {visible.map((r) => (
            <button
              key={r.code}
              type="button"
              onClick={() => {
                onPick({ code: r.code, title: r.title });
                setQuery("");
                setResults([]);
              }}
              className="rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3 text-left hover:border-neutral-300"
            >
              {r.via ? (
                <>
                  <span className="block text-sm font-medium text-neutral-900">{r.via}</span>
                  <span className="block text-xs text-neutral-500">
                    Listed as {r.title}
                  </span>
                </>
              ) : (
                <span className="block text-sm font-medium text-neutral-900">{r.title}</span>
              )}
            </button>
          ))}
          {!searching && visible.length === 0 && (
            <p className="rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-500">
              Nothing matching yet. Try fewer letters, or a different word for
              the same work.
            </p>
          )}
          {searching && visible.length === 0 && (
            <p className="px-4 py-2 text-xs text-neutral-400">Searching...</p>
          )}
        </div>
      )}
    </div>
  );
}
