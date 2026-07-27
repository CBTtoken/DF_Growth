"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

// Rewritten after Dewald's second look. The first version was a fixed
// bottom bar, which is the pattern a phone app uses. His objection is
// correct and I should have got there myself: these members are on a web
// page, not in an installed app, and controls at the bottom is not where
// they will look. Being different is not worth being confusing.
//
// "People" was also just a bad name. It reads as staff, as in people who
// work for me, when it means the customers you invoice. It is Customers.
//
// Mounted in the layout so it is on EVERY page. Dewald: "when I click on
// either, the menu options goes away, can we have all pages have some
// decent navigation options?" That was the real failure, worse than the
// placement: navigation that disappears the moment you use it.

type NavLink = { href: string; label: string; exact?: boolean };

const LINKS: NavLink[] = [
  { href: "/bizup", label: "Home", exact: true },
  { href: "/bizup/quotes", label: "Quotes" },
  { href: "/bizup/invoices", label: "Invoices" },
  { href: "/bizup/customers", label: "Customers" },
  { href: "/bizup/price-list", label: "Price list" },
];

const SETTINGS: NavLink[] = [
  { href: "/bizup/settings/business", label: "Business details" },
  { href: "/bizup/settings/banking", label: "Banking details" },
];

export function BizUpNav({ businessName }: { businessName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/bizup" className="shrink-0 text-xl font-extrabold tracking-tight text-ink">
          BizUp
        </Link>

        {/* Desktop and tablet: everything visible, nothing hidden behind a
            menu. A member should never have to hunt. */}
        <nav className="hidden flex-1 items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href, l.exact) ? "page" : undefined}
              className={`rounded-full px-3.5 py-2 text-sm font-semibold transition ${
                isActive(l.href, l.exact)
                  ? "bg-brand text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-ink"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden shrink-0 items-center gap-3 md:flex">
          <span className="max-w-[14rem] truncate text-sm text-gray-500">{businessName}</span>
          <Link
            href="/bizup/settings/business"
            className="text-sm font-medium text-gray-500 hover:text-brand"
          >
            Settings
          </Link>
        </div>

        {/* Phone: one button, everything inside it, and it opens downward
            from the top where the member is already looking. */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3.5 py-2 text-sm font-semibold text-gray-700 md:hidden"
        >
          Menu
          <span aria-hidden className={`transition-transform ${open ? "rotate-45" : ""}`}>+</span>
        </button>
      </div>

      {open && (
        <div className="border-t border-gray-100 bg-white px-4 py-3 md:hidden">
          <p className="truncate pb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            {businessName}
          </p>
          <nav className="flex flex-col">
            {[...LINKS, ...SETTINGS].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`rounded-xl px-3 py-3 text-base font-semibold ${
                  isActive(l.href, l.exact)
                    ? "bg-brand/10 text-brand"
                    : "text-gray-700"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
