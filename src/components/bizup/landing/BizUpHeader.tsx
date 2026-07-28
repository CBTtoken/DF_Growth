import Link from "next/link";
import Image from "next/image";
import { PixelConsentGate } from "@/components/landing/PixelConsentGate";
import { katisoPath } from "@/lib/bizup/product";

// KatisoBiz's top navigation, matching MarketingHeader's pattern on Growth:
// brand on the left, quiet text links that collapse away on small screens,
// and the one real action as a button that never collapses.
//
// The links are in-page anchors rather than routes, because this is a
// single-page landing. On a phone they hide and the sticky bottom CTA does
// the work, which is the same trade Growth's own header makes.
export async function BizUpHeader() {
  const [home, help, login, signup] = await Promise.all([
    katisoPath("/"),
    katisoPath("/help"),
    katisoPath("/login"),
    katisoPath("/signup"),
  ]);

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
          <a
            href="#how-it-works"
            className="hidden whitespace-nowrap text-xs font-medium text-neutral-mid transition hover:text-brand-blue sm:inline sm:text-sm"
          >
            How it works
          </a>
          {/* A real page, not a section anchor: it is also the thing to
              send someone who is stuck, so it needs its own address. */}
          <Link
            href={help}
            className="hidden whitespace-nowrap text-xs font-medium text-neutral-mid transition hover:text-brand-blue sm:inline sm:text-sm"
          >
            Help
          </Link>
          <a
            href="#pricing"
            className="hidden whitespace-nowrap text-xs font-medium text-neutral-mid transition hover:text-brand-blue sm:inline sm:text-sm"
          >
            Pricing
          </a>
          <a
            href="#faq"
            className="hidden whitespace-nowrap text-xs font-medium text-neutral-mid transition hover:text-brand-blue sm:inline sm:text-sm"
          >
            FAQ
          </a>
          <Link
            href={login}
            className="whitespace-nowrap text-xs font-medium text-neutral-mid transition hover:text-brand-blue sm:text-sm"
          >
            Log in
          </Link>
          <Link href={signup} className="btn-accent px-4 py-2 text-xs sm:px-5 sm:py-2.5 sm:text-sm">
            Start free
          </Link>
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
