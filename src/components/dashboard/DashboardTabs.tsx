"use client";

import { useState, type ReactNode } from "react";

export type DashboardTab = { id: string; label: string; content: ReactNode };

// Dewald's ask: the dashboard had grown into one long scrolling page
// (testimonials, leads, orders, reviews, account, agent, meta, photos,
// booking, shop...) with no way to jump between sections. This wraps the
// exact same section components in a tab bar instead of rewriting any of
// them — each tab's content is just the JSX dashboard/page.tsx already
// built, grouped logically. Local state rather than URL/hash-based routing:
// simpler, and nothing here needs to be deep-linkable from outside the
// dashboard itself (unlike #search-ad-verification/#meta-ad-tracking's
// existing cross-reference anchors, which still work since both live in the
// same "Marketing" tab and are mounted together whenever it's active).
export function DashboardTabs({ tabs }: { tabs: DashboardTab[] }) {
  const [activeId, setActiveId] = useState(tabs[0]?.id);
  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="sticky top-0 z-10 -mx-4 overflow-x-auto border-b border-gray-200 bg-gray-50/95 px-4 py-2 backdrop-blur sm:static sm:mx-0 sm:rounded-2xl sm:border sm:border-gray-100 sm:bg-white sm:px-2 sm:py-2 sm:shadow-sm">
        <div className="flex min-w-max gap-1 sm:min-w-0 sm:flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveId(tab.id)}
              className={`whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                tab.id === active?.id ? "bg-brand text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-6">{active?.content}</div>
    </div>
  );
}
