"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

// One row: search, area, trade. Nothing else.
//
// Dewald's note after using it on a laptop: the board was two screens of
// headers before the first post. Twelve area chips and ten trade chips
// became two dropdowns, which cost one tap and save most of a screen.
//
// The selects navigate on change rather than needing a Go button, and the
// search stays a real form so a result is still a URL somebody can send to
// somebody else.
export function BoardFilters({
  areas,
  categories,
  activeArea,
  activeCategory,
  query,
}: {
  areas: { slug: string; name: string; count: number }[];
  categories: { slug: string; name: string }[];
  activeArea: string;
  activeCategory: string;
  query: string;
}) {
  const router = useRouter();

  const selectClass =
    "w-full rounded-full border border-neutral-border bg-white px-4 py-2.5 text-sm font-semibold text-neutral-mid outline-none transition focus:border-brand-blue sm:w-auto";

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <form method="GET" action="/board" className="relative flex-1">
        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-muted" />
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Search the board"
          className="w-full rounded-full border border-neutral-border bg-white py-2.5 pl-11 pr-4 text-sm text-neutral-ink outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
        />
      </form>

      <select
        aria-label="Area"
        value={activeArea}
        onChange={(event) => router.push(event.target.value ? `/board/area/${event.target.value}` : "/board")}
        className={selectClass}
      >
        <option value="">All areas</option>
        {areas.map((area) => (
          <option key={area.slug} value={area.slug}>
            {area.name} ({area.count})
          </option>
        ))}
      </select>

      <select
        aria-label="Category"
        value={activeCategory}
        onChange={(event) => router.push(event.target.value ? `/board/category/${event.target.value}` : "/board")}
        className={selectClass}
      >
        <option value="">All categories</option>
        {categories.map((category) => (
          <option key={category.slug} value={category.slug}>
            {category.name}
          </option>
        ))}
      </select>
    </div>
  );
}
