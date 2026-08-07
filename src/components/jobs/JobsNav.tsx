"use client";

import Link from "next/link";
import { useState } from "react";
import { logOutOfJobs } from "@/app/jobs/actions";
import { JobsMark } from "@/components/jobs/JobsMark";

// The menu, rebuilt after Dewald's 7 August walkthrough: "check the menus,
// there are none that make sense, also for the Employer."
//
// He was right twice over. The old header carried two links, "Jobs" and
// either "Log in" or one dashboard button, and it was rendered on five of
// nineteen pages. Every screen behind a login -- both dashboards, the CV
// builder, the applicants list, the vacancy composer -- had no menu at all,
// and there was no way to log out from anywhere in the product.
//
// Shaped like BizUpNav, which solved the same complaint on the KatisoBiz
// side: everything visible on a wide screen, one Menu button on a phone,
// and log out lives in the menu with everything else rather than hiding at
// the bottom of one screen.

export type JobsNavLink = { href: string; label: string };

export function JobsNav({
  homeHref,
  links,
  primary,
  loggedIn,
  accountLabel,
}: {
  homeHref: string;
  /** The everyday destinations, already resolved for this hostname. */
  links: JobsNavLink[];
  /** The one action styled as the main one: a dashboard, or logging in. */
  primary: JobsNavLink;
  loggedIn: boolean;
  /** Whose account this is, shown so a shared phone is obvious. */
  accountLabel: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href={homeHref} aria-label="KatisoBiz Jobs home" className="shrink-0">
          <JobsMark />
        </Link>

        {/* Wide screens: nothing hidden. */}
        <nav className="hidden items-center gap-4 text-sm font-semibold md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-neutral-600 transition hover:text-neutral-900">
              {l.label}
            </Link>
          ))}
          <Link
            href={primary.href}
            className="rounded-full bg-accent px-4 py-2 text-white transition hover:bg-accent-hover"
          >
            {primary.label}
          </Link>
          {loggedIn && (
            <form action={logOutOfJobs}>
              <button type="submit" className="text-neutral-500 transition hover:text-neutral-900">
                Log out
              </button>
            </form>
          )}
        </nav>

        {/* Phone: one button, opening downward from where the thumb already is. */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-3.5 py-2 text-sm font-semibold text-neutral-700 md:hidden"
        >
          Menu
          <span aria-hidden className={`transition-transform ${open ? "rotate-45" : ""}`}>
            +
          </span>
        </button>
      </div>

      {open && (
        <div className="border-t border-neutral-100 bg-white px-4 py-3 md:hidden">
          {accountLabel && (
            <p className="truncate pb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Signed in as {accountLabel}
            </p>
          )}
          <nav className="flex flex-col">
            <Link
              href={primary.href}
              onClick={() => setOpen(false)}
              className="rounded-xl bg-accent-light px-3 py-3 text-base font-bold text-neutral-ink"
            >
              {primary.label}
            </Link>
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-base font-semibold text-neutral-700"
              >
                {l.label}
              </Link>
            ))}
            {loggedIn && (
              <form action={logOutOfJobs}>
                <button
                  type="submit"
                  className="w-full rounded-xl px-3 py-3 text-left text-base font-semibold text-neutral-500"
                >
                  Log out
                </button>
              </form>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
