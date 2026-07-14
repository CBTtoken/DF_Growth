"use client";

import { useActionState, useState } from "react";
import { addPhotoFromPexels } from "@/app/dashboard/actions";

type Result = { id: number; thumbnailUrl: string; fullUrl: string; photographer: string | null };

// Combined spec Sec 24: real search + browse, not just the existing
// automatic best-effort fallback (getIndustryPhoto) — a client picks the
// exact photo they want rather than getting whatever Pexels returns
// first. Shared by the dashboard's PhotoGallery and onboarding's
// Step4PhotoUpload, since both just need "let the client add a photo,"
// upload and Pexels search are just two ways into the same gallery.
export function PexelsPicker({ industryHint, disabled }: { industryHint?: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(industryHint ?? "");
  const [activeQuery, setActiveQuery] = useState(industryHint ?? "");
  const [results, setResults] = useState<Result[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searching, setSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [state, formAction, pending] = useActionState(addPhotoFromPexels, null);

  const runSearch = async (q: string) => {
    if (!q.trim()) return;
    setSearching(true);
    setSearchError(null);
    setActiveQuery(q);
    try {
      const res = await fetch(`/api/pexels/search?q=${encodeURIComponent(q)}&page=1`);
      const data = await res.json();
      if (!res.ok) {
        setSearchError(data.error ?? "Search failed, please try again");
        setResults([]);
        setHasMore(false);
      } else {
        setResults(data.results ?? []);
        setPage(1);
        setHasMore(Boolean(data.hasMore));
      }
    } catch {
      setSearchError("Search failed, please try again");
    } finally {
      setSearching(false);
    }
  };

  // Public Beta Polish Sprint Sec 8: appends the next page below the
  // existing grid rather than replacing it — no page reload, nothing
  // already-viewed disappears.
  const loadMore = async () => {
    if (!activeQuery.trim()) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await fetch(`/api/pexels/search?q=${encodeURIComponent(activeQuery)}&page=${nextPage}`);
      const data = await res.json();
      if (res.ok) {
        setResults((prev) => [...prev, ...(data.results ?? [])]);
        setPage(nextPage);
        setHasMore(Boolean(data.hasMore));
      }
    } catch {
      // Silently leave the existing grid as-is — "Show More" stays clickable to retry.
    } finally {
      setLoadingMore(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          if (industryHint) runSearch(industryHint);
        }}
        disabled={disabled}
        className="w-fit rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 transition hover:border-gray-300 disabled:opacity-50"
      >
        Browse stock photos
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-gray-700">Browse stock photos</h4>
        <button type="button" onClick={() => setOpen(false)} className="text-xs font-medium text-gray-400 hover:text-gray-600">
          Close
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(query);
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={industryHint ? `e.g. ${industryHint}` : "Search for a photo"}
          className="h-10 flex-1 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        <button
          type="submit"
          disabled={searching}
          className="rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          {searching ? "Searching..." : "Search"}
        </button>
      </form>

      {searchError && <p className="text-xs text-red-600">{searchError}</p>}
      {state?.error?._form && <p className="text-xs text-red-600">{state.error._form[0]}</p>}

      {results.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {results.map((r) => (
            <form
              key={r.id}
              action={(formData) => {
                setSelectedId(r.id);
                formAction(formData);
              }}
            >
              <input type="hidden" name="photoUrl" value={r.fullUrl} />
              <button
                type="submit"
                disabled={pending}
                title={r.photographer ? `Photo by ${r.photographer} on Pexels` : undefined}
                className="group relative aspect-square w-full overflow-hidden rounded-lg border border-gray-200 disabled:opacity-50"
              >
                {/* Thumbnails are Pexels-hosted, remote, and short-lived in
                    this UI (never persisted as-is — selecting one triggers
                    a real download+upload via addPhotoFromPexels) — a
                    plain img avoids configuring next/image for an
                    arbitrary external host for a one-shot preview. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {pending && selectedId === r.id ? "Adding..." : "Use this photo"}
                </span>
              </button>
            </form>
          ))}
        </div>
      )}

      {hasMore && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          className="w-fit self-center rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition hover:border-gray-300 disabled:opacity-50"
        >
          {loadingMore ? "Loading..." : "Show more"}
        </button>
      )}
    </div>
  );
}
