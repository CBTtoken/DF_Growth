import Link from "next/link";
import Image from "next/image";
import { PixelConsentGate } from "@/components/landing/PixelConsentGate";
import { katisoPath } from "@/lib/bizup/product";

// KatisoBiz's top navigation, matching MarketingHeader's pattern on Growth:
// brand on the left, quiet text links that collapse away on small screens,
// and the one real action as a button that never collapses.
//
// Rebuilt 1 August 2026, and the reason matters. Every link in here was
// hidden below the sm breakpoint, on the reasoning that a landing page on a
// phone should push the one action and nothing else. That is defensible for
// a visitor and wrong for a member, and Dewald's members are almost all on
// phones: on a phone there was no way to reach the guide, the walkthrough or
// the questions from the menu at all.
//
// So the menu now exists on a phone, as a details element rather than a
// client component, which means it opens with JavaScript switched off and
// costs nothing to load. Same choice the help page makes for its expanders.
export async function BizUpHeader() {
  const [home, help, login, signup, howItWorks, faq] = await Promise.all([
    katisoPath("/"),
    katisoPath("/help"),
    katisoPath("/login"),
    katisoPath("/signup"),
    katisoPath("/how-it-works"),
    katisoPath("/faq"),
  ]);

  // One list, rendered twice: inline on a laptop, inside the menu on a
  // phone. Ordered by what a stuck member wants first, which is the
  // walkthrough, not the pricing.
  const links = [
    { href: howItWorks, label: "Step-by-Step" },
    { href: faq, label: "FAQ" },
    { href: help, label: "Help" },
    { href: `${home}#pricing`, label: "Pricing" },
  ];

  return (
    <>
    <header className="sticky top-0 z-40 border-b border-neutral-border bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        {/* The real logo. It is transparent, so it sits on the white header
            without a plate behind it. Shipped at 520px wide (2x for retina)
            rather than the 1200px original, because the landing page has a
            hard 1MB budget. The dimensions below must match the file's real
            proportions: w-auto derives the rendered width from them, so a
            stale pair squashes the artwork rather than erroring. */}
        <Link href={home} className="flex shrink-0 items-center gap-2">
          <Image
            src="/katisobiz/logo.png"
            alt="KatisoBiz"
            width={520}
            height={119}
            priority
            className="h-9 w-auto sm:h-10"
          />
        </Link>

        <nav className="flex shrink-0 items-center gap-1.5 sm:gap-4">
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="hidden whitespace-nowrap text-xs font-medium text-neutral-mid transition hover:text-brand-blue sm:inline sm:text-sm"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href={login}
            className="whitespace-nowrap text-xs font-medium text-neutral-mid transition hover:text-brand-blue sm:text-sm"
          >
            Log in
          </Link>
          <Link href={signup} className="btn-accent px-4 py-2 text-xs sm:px-5 sm:py-2.5 sm:text-sm">
            Start free
          </Link>

          {/* Phone only. A details element, so it works with no JavaScript
              and there is no client component to ship. */}
          <details className="relative sm:hidden">
            <summary className="flex size-9 cursor-pointer list-none items-center justify-center rounded-lg border border-neutral-border text-neutral-mid marker:content-none">
              <span aria-hidden className="text-lg leading-none">&#8801;</span>
              <span className="sr-only">Menu</span>
            </summary>
            <div className="absolute right-0 top-full z-50 mt-2 flex w-52 flex-col gap-0.5 rounded-2xl border border-neutral-border bg-white p-2 shadow-lg">
              {links.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="rounded-lg px-3 py-2.5 text-sm font-semibold text-neutral-mid hover:bg-neutral-surface hover:text-brand-blue"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href={login}
                className="rounded-lg px-3 py-2.5 text-sm font-semibold text-neutral-mid hover:bg-neutral-surface hover:text-brand-blue"
              >
                Log in
              </Link>
            </div>
          </details>
        </nav>
      </div>
    </header>
    {/* The Meta pixel, mounted here for the same reason MarketingHeader
        mounts it on Growth: the header is on every page of the funnel, so
        one placement covers the landing page and the signup page both.
        Without it the conversion events still reached Meta server-side but
        carried no _fbc or _fbp cookie, because nothing had ever set one, so
        Meta could not tie a signup back to the ad click that caused it.
        Consent-gated, which is POPIA and not a preference: nothing loads
        until the visitor presses Accept. */}
    <PixelConsentGate pixelId={process.env.NEXT_PUBLIC_DIGITALFLYER_META_PIXEL_ID ?? null} />
    </>
  );
}
