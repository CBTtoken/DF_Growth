"use client";

import { useState } from "react";
import Link from "next/link";
import { MarketingHeaderAuthLink } from "@/components/brand/MarketingHeaderAuthLink";

const menuLinkClass = "rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50";

// Real UI/UX gap this closes: the Events link (and, before it, Marketplace)
// only ever fit in the desktop header bar — mobile visitors, likely the
// majority for a WhatsApp-native South African small-business audience,
// had no way to reach either except a cross-link buried on the other
// page. A real hamburger menu, not another "hide it and hope" workaround
// for the header-width bug that broke a third nav item at 375px once.
// "See pricing" stays outside this menu, always visible next to it — the
// one CTA worth never hiding behind a tap.
export function MobileNavMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="flex size-8 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-100"
      >
        {open ? (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        )}
      </button>

      {open && (
        <>
          {/* Full-screen tap-away catcher, behind the panel — simpler and
              more reliable than a click-outside listener for this size of
              menu. */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 top-full z-20 mt-2 flex w-48 flex-col gap-0.5 rounded-2xl border border-gray-100 bg-white p-2 shadow-lg">
            <Link href="/how-it-works" onClick={() => setOpen(false)} className={menuLinkClass}>
              How It Works
            </Link>
            <Link href="/marketplace" onClick={() => setOpen(false)} className={menuLinkClass}>
              Marketplace
            </Link>
            <Link href="/events" onClick={() => setOpen(false)} className={menuLinkClass}>
              Events
            </Link>
            <Link href="/agents/apply" onClick={() => setOpen(false)} className={menuLinkClass}>
              Agents
            </Link>
            <Link href="/faq" onClick={() => setOpen(false)} className={menuLinkClass}>
              FAQ
            </Link>
            <MarketingHeaderAuthLink className={menuLinkClass} />
          </div>
        </>
      )}
    </div>
  );
}
