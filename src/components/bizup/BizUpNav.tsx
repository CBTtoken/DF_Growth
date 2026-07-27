"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Dewald: "the whole navigation needs a real deep relook... our members are
// not computer gurus or have patience to figure it out, it should be super
// easy to follow, and 1 max 2 clicks to do their job."
//
// What was there before was a row of six equal text links, which is a
// developer's menu: it assumes you already know what everything is called
// and that all six matter equally. They do not.
//
// This is the pattern every app a tradesman already uses has at the bottom
// of the screen: four destinations, always visible, always in the same
// place, with the current one obviously lit. Settings is deliberately NOT
// here. A member touches it twice ever, and giving it a permanent slot
// would cost a quarter of the bar for nothing.
//
// Bottom rather than top on purpose: it is where a thumb already is on a
// phone held one-handed, which is how this product is used.

const TABS = [
  { href: "/bizup", label: "Home", icon: "M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5" },
  { href: "/bizup/quotes", label: "Quotes", icon: "M6 3h9l4 4v14H6zM15 3v4h4M9 12h6M9 16h6" },
  { href: "/bizup/invoices", label: "Invoices", icon: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9.5 8h5M9.5 12h5" },
  { href: "/bizup/customers", label: "People", icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21c0-4 3.6-6 8-6s8 2 8 6" },
];

export function BizUpNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur">
      <ul className="mx-auto flex max-w-3xl">
        {TABS.map((t) => {
          // Home matches only itself; the others match their whole section,
          // so a member deep inside a quote still sees Quotes lit and knows
          // where they are.
          const active = t.href === "/bizup" ? pathname === "/bizup" : pathname.startsWith(t.href);
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors ${
                  active ? "text-brand" : "text-gray-500"
                }`}
              >
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={active ? 2.2 : 1.7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-6"
                >
                  <path d={t.icon} />
                </svg>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
