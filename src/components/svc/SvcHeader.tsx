"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signOutSvc } from "@/app/svc/login/actions";

/**
 * SVC's site header, phone first per handoff section 5: the header stays
 * fixed with the logo left and the burger top right, and the menu opens as
 * a full screen panel with large tappable rows. Not a bottom bar, not
 * controls parked at the bottom of a scroll.
 *
 * `prefix` is "" on smartvalueclub.co.za and "/svc" everywhere else,
 * computed server-side in the layout so this component never guesses at
 * hostnames.
 */
const NAV = [
  { href: "/", label: "Home" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/packages", label: "Packages" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export function SvcHeader({
  prefix,
  signedIn = false,
  isAdmin = false,
}: {
  prefix: string;
  signedIn?: boolean;
  isAdmin?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const p = (path: string) => (path === "/" ? (prefix === "" ? "/" : prefix) : `${prefix}${path}`);

  return (
    <header className="sticky top-0 z-50 bg-svc-green">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Link href={p("/")} className="flex min-h-12 items-center gap-2" onClick={() => setOpen(false)}>
          <Image src="/svc/logo-mark.png" alt="" width={40} height={40} priority />
          <span className="font-svc-heading text-lg font-bold tracking-tight text-white">
            Smart Value Club
          </span>
        </Link>

        {/* Desktop nav. Hidden on phones, where the burger takes over. */}
        <nav className="hidden items-center gap-6 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={p(item.href)}
              className="text-sm font-medium text-white hover:text-svc-amber"
            >
              {item.label}
            </Link>
          ))}
          {signedIn ? (
            <>
              {isAdmin && (
                <Link
                  href={p("/admin")}
                  className="text-sm font-medium text-white hover:text-svc-amber"
                >
                  Admin
                </Link>
              )}
              <Link
                href={p("/account")}
                className="inline-flex min-h-11 items-center bg-svc-amber px-5 text-sm font-semibold text-svc-ink hover:bg-white"
              >
                My dashboard
              </Link>
              <form action={signOutSvc}>
                <button type="submit" className="text-sm font-medium text-white/70 hover:text-svc-amber">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href={p("/login")}
                className="text-sm font-medium text-white hover:text-svc-amber"
              >
                Log in
              </Link>
              <Link
                href={p("/join")}
                className="inline-flex min-h-11 items-center bg-svc-amber px-5 text-sm font-semibold text-svc-ink hover:bg-white"
              >
                Join now
              </Link>
            </>
          )}
        </nav>

        {/* The burger, top right, 48px tap target. */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="flex h-12 w-12 items-center justify-center text-white lg:hidden"
        >
          {open ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Full screen menu panel with large tappable rows. */}
      {open && (
        <div className="fixed inset-0 top-16 z-40 flex flex-col bg-svc-green lg:hidden">
          <nav className="flex flex-1 flex-col overflow-y-auto">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={p(item.href)}
                onClick={() => setOpen(false)}
                className="border-b border-white/15 px-6 py-5 text-lg font-semibold text-white"
              >
                {item.label}
              </Link>
            ))}
            {signedIn ? (
              <>
                {isAdmin && (
                  <Link
                    href={p("/admin")}
                    onClick={() => setOpen(false)}
                    className="border-b border-white/15 px-6 py-5 text-lg font-semibold text-white"
                  >
                    Admin
                  </Link>
                )}
                <div className="px-6 py-6">
                  <Link
                    href={p("/account")}
                    onClick={() => setOpen(false)}
                    className="flex min-h-12 w-full items-center justify-center bg-svc-amber px-6 text-lg font-semibold text-svc-ink"
                  >
                    My dashboard
                  </Link>
                </div>
                <form action={signOutSvc} className="border-t border-white/15 px-6 py-5">
                  <button type="submit" className="text-lg font-semibold text-white/80">
                    Log out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href={p("/login")}
                  onClick={() => setOpen(false)}
                  className="border-b border-white/15 px-6 py-5 text-lg font-semibold text-white"
                >
                  Log in
                </Link>
                <div className="px-6 py-6">
                  <Link
                    href={p("/join")}
                    onClick={() => setOpen(false)}
                    className="flex min-h-12 w-full items-center justify-center bg-svc-amber px-6 text-lg font-semibold text-svc-ink"
                  >
                    Join now
                  </Link>
                </div>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
