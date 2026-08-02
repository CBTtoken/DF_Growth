"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, Inbox, LayoutGrid, Lightbulb, MoreHorizontal, Target } from "lucide-react";

// The bottom bar. Six things, thumb height, and the current one obvious.
//
// Six because these are the screens with a daily or weekly reason to be
// opened, and burying any of them behind a menu is how a tool stops being
// used. Everything monthly (the register, the go-away document, the export,
// the full list) lives behind More, where a longer walk costs nothing.
//
// No badge, no count, no dot on any of these. That is the hard rule from the
// brief and it is the reason the tool is calm.
const TABS = [
  { href: "/desk", label: "Dump", icon: Inbox, exact: true },
  { href: "/desk/today", label: "Today", icon: Target },
  { href: "/desk/think", label: "Think", icon: Lightbulb },
  { href: "/desk/waiting", label: "Waiting", icon: CalendarClock },
  { href: "/desk/map", label: "Map", icon: LayoutGrid },
  { href: "/desk/more", label: "More", icon: MoreHorizontal },
];

export function DeskNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white/95 backdrop-blur">
      <ul className="mx-auto flex max-w-2xl">
        {TABS.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          const Icon = tab.icon;

          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                prefetch
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 px-1 pb-5 pt-3 text-[11px] font-semibold transition-colors ${
                  active ? "text-neutral-900" : "text-neutral-400"
                }`}
              >
                <Icon size={19} strokeWidth={active ? 2.4 : 1.8} />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
