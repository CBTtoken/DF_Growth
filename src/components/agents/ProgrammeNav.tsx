"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";

// The programme page's own sticky nav, from the Bolt design.
//
// It replaces MarketingHeader on this page only. That is deliberate: this
// is a landing page with its own internal anchors, and a nav pointing at
// pricing and the marketplace competes with the one action the page wants.
// The logo still links home, so nobody is trapped here.
// Home is a real route, the rest are anchors on this page. Kept first, and
// kept as a normal menu item rather than relying on the logo alone: the
// logo being clickable is a convention, not a signpost, and this page is
// aimed at people who may never have seen the rest of the site.
const LINKS = [
  { label: "Home", href: "/" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Earnings", href: "#earnings" },
  { label: "What you get", href: "#what-you-get" },
  { label: "FAQ", href: "#faq" },
];

export function ProgrammeNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 bg-white transition-shadow duration-300 ${
        scrolled ? "shadow-[0_2px_20px_-8px_rgba(30,167,212,0.25)]" : ""
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        {/* The logo alone, no wordmark beside it. The real logo already
            contains the DigitalFlyer name, so setting "DigitalFlyer Growth"
            next to it said the brand twice and crowded the bar.

            width/height must match the file's own 1050x330 ratio. They were
            36x36, which made Next generate a 36px-wide square and let CSS
            stretch it to about 115px, which is exactly why it looked
            blurry and squashed. */}
        <Link href="/" className="flex shrink-0 items-center" aria-label="DigitalFlyer Growth, home">
          <Image
            src="/brand/logo-blue.png"
            alt="DigitalFlyer Growth"
            width={420}
            height={132}
            priority
            className="h-9 w-auto"
          />
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[15px] font-medium text-slate-700 transition-colors hover:text-[#1EA7D4]"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#apply"
            className="rounded-full bg-[#E07B40] px-5 py-2.5 text-[15px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#C96930] hover:shadow-lg hover:shadow-orange-500/30"
          >
            Apply now
          </a>
        </div>

        <button
          type="button"
          className="text-slate-800 md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      <div
        className={`overflow-hidden bg-white transition-all duration-300 md:hidden ${
          open ? "max-h-96 shadow-lg" : "max-h-0"
        }`}
      >
        <div className="flex flex-col gap-1 px-5 py-4">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="border-b border-slate-100 py-2.5 text-[15px] font-medium text-slate-700 hover:text-[#1EA7D4]"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#apply"
            onClick={() => setOpen(false)}
            className="mt-3 rounded-full bg-[#E07B40] px-5 py-3 text-center text-[15px] font-semibold text-white"
          >
            Apply now
          </a>
        </div>
      </div>
    </header>
  );
}
