"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export type DashboardTab = { id: string; label: string; content: ReactNode };

// Dewald's ask: the dashboard had grown into one long scrolling page
// (testimonials, leads, orders, reviews, account, agent, meta, photos,
// booking, shop...) with no way to jump between sections. This wraps the
// exact same section components in a tab bar instead of rewriting any of
// them — each tab's content is just the JSX dashboard/page.tsx already
// built, grouped logically.
//
// Sprint "Member dashboard navigation", 8 August 2026: which tab is open is
// now in the URL. It used to be local state seeded from tabs[0], which
// quietly broke every link into the dashboard: the page checklist pointed
// at /dashboard#photos, the photos live in the Your page tab, and that tab
// was not mounted on arrival, so the anchor had nothing to scroll to and
// the member landed at the top of Overview with no idea why. Now the server
// reads ?tab= and seeds this, so a deep link opens the right tab on the
// first paint.
//
// The active tab is still held in local state after that, and the URL is
// kept in step with history.replaceState rather than a router navigation.
// Pushing would make the browser back button walk back through tab presses
// instead of leaving the dashboard, and would re-run the page's eighteen
// queries for what is a purely visual change.
export function DashboardTabs({
  tabs,
  initialTabId,
}: {
  tabs: DashboardTab[];
  initialTabId?: string;
}) {
  const [activeId, setActiveId] = useState(
    tabs.some((t) => t.id === initialTabId) ? initialTabId : tabs[0]?.id
  );
  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];
  const activeButtonRef = useRef<HTMLButtonElement | null>(null);

  // Which tabs have been opened at least once. Only the active tab is
  // visible, but every tab already opened stays mounted behind it.
  //
  // This matters from this sprint onwards: Your page holds real half-filled
  // forms now, and unmounting on a tab press would throw away typing that
  // was never saved, against the interface standard's "never lose what
  // somebody has typed, not on error, not on navigation". Mounting only
  // what has actually been opened is the reason this is not simply "render
  // all six": Selling alone is Shop plus Orders plus Booking, and a member
  // who never taps it should never pay to load it.
  const [visited, setVisited] = useState<string[]>(() => (active ? [active.id] : []));

  // Six tabs are 576px of pills in a 390px phone, so the last two sit off
  // the right edge. Harmless while Home is first, but arriving on
  // ?tab=account showed a bar reading Home, Your page, Selling, Reviews
  // with none of them highlighted, which reads as "nothing is selected"
  // rather than "swipe left". Measured on the real bar, not guessed at.
  useEffect(() => {
    activeButtonRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
    // Once, for whichever tab the URL opened on. Later presses are the
    // member's own and are already under their thumb.
  }, []);

  // A link from elsewhere in the dashboard, above all the page checklist on
  // Home, navigates to /dashboard?tab=... That re-runs the server component
  // and hands down a new initialTabId, but does not remount this one, so
  // without this the URL would change and the tab would sit exactly where
  // it was. Pressing a tab here uses replaceState and leaves the prop
  // alone, so this never fights the member's own presses.
  //
  // Adjusted during render rather than in an effect, per React's guidance
  // for reacting to a changed prop.
  const [lastLinkedTab, setLastLinkedTab] = useState(initialTabId);
  if (initialTabId !== lastLinkedTab) {
    setLastLinkedTab(initialTabId);
    if (initialTabId && tabs.some((t) => t.id === initialTabId)) {
      setActiveId(initialTabId);
      setVisited((v) => (v.includes(initialTabId) ? v : [...v, initialTabId]));
    }
  }

  const select = (id: string) => {
    setActiveId(id);
    setVisited((v) => (v.includes(id) ? v : [...v, id]));

    const url = new URL(window.location.href);
    url.searchParams.set("tab", id);
    // `open` names a section inside Your page and is ignored on every other
    // tab, so it is carried rather than cleared. Clearing it on the way out
    // meant a member who opened "Where you are", glanced at Reviews and
    // came back had a section open that the URL no longer mentioned, and a
    // refresh then closed it under them.
    window.history.replaceState(null, "", url);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="sticky top-0 z-10 -mx-4 border-b border-gray-200 bg-gray-50/95 backdrop-blur sm:static sm:mx-0 sm:rounded-2xl sm:border sm:border-gray-100 sm:bg-white sm:shadow-sm">
        {/* pr-12 is the fade's width plus a little: without it the last tab
            scrolls flush to the right edge and sits under the gradient,
            which dims the very tab a member just deep-linked to. */}
        <div className="overflow-x-auto py-2 pl-4 pr-12 sm:px-2">
          <div className="flex min-w-max gap-1 sm:min-w-0 sm:flex-wrap">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                ref={tab.id === active?.id ? activeButtonRef : undefined}
                onClick={() => select(tab.id)}
                aria-current={tab.id === active?.id ? "page" : undefined}
                className={`whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                  tab.id === active?.id ? "bg-brand text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        {/* A hard cut at the screen edge reads as the end of the list. This
            says there is more to swipe to without costing a second row of
            height on a screen where the bar is stuck to the top. Desktop
            wraps instead and never needs it. */}
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-gray-50 to-transparent sm:hidden"
        />
      </div>
      {/* Tailwind's `hidden` class, not the `hidden` attribute: the
          attribute only carries the browser's own `display: none`, which
          any display utility on the same element outranks, so a
          `hidden` + `flex` element stays stubbornly visible. */}
      {tabs
        .filter((tab) => visited.includes(tab.id))
        .map((tab) => (
          <div
            key={tab.id}
            className={tab.id === active?.id ? "flex flex-col gap-6" : "hidden"}
          >
            {tab.content}
          </div>
        ))}
    </div>
  );
}
