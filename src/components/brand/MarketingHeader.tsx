import Image from "next/image";
import Link from "next/link";
import { MarketingHeaderAuthLink } from "@/components/brand/MarketingHeaderAuthLink";
import { MobileNavMenu } from "@/components/brand/MobileNavMenu";
import { PixelConsentGate } from "@/components/landing/PixelConsentGate";

// Distinct from BrandHeader (used on the utility pages — dashboard, wizard):
// this is a real header bar for the marketing page, not a logo floating in
// the content flow, which was the exact complaint that started this rework.
//
// Found via real UAT: a logged-in business owner browsing their own
// marketing page back saw "Log in" like a stranger, with no obvious way
// back to their dashboard. The "Log in"/"Dashboard" swap now happens in
// MarketingHeaderAuthLink (client-side) rather than here — see its own
// comment for why (Task #12 cold-start fix).
//
// Dewald's ask: DigitalFlyer's own Meta Pixel wasn't loaded anywhere on
// the marketing site itself (only individual client pages had their own,
// via ClientLandingPageView) — so ads run for DigitalFlyer Growth itself
// had nothing to retarget against or measure conversions with. Rendered
// here rather than in the root layout specifically because MarketingHeader
// is used on exactly the pages the ask named (pricing/homepage,
// marketplace, events, faq, agents/apply) and NOT on [clientSlug] pages,
// which already render their own PixelConsentGate for the client's own
// pixel — keeping both here would mean two duplicate cookie-consent
// banners stacking on the same page. Same consent-gated component and
// shared localStorage consent key either way (lib/consent.ts), so a
// visitor's choice on one carries over to the other consistently.
export function MarketingHeader() {
  return (
    <>
      <header className="sticky top-0 z-10 flex w-full items-center justify-between border-b border-gray-100 bg-white/90 px-4 py-4 backdrop-blur sm:px-6">
        {/* Real bug found live (mobile screenshot): "Log in" was only getting
            ~34px of available width on a 375px viewport, well under what the
            text needs, so the browser wrapped it onto two lines ("Log" /
            "in") right on top of the wordmark next to it. shrink-0 on both
            groups stops the flex layout from squeezing either below its
            natural content width; whitespace-nowrap on the auth link is a
            second guard against the same wrap even if space ever gets tight
            again. Tighter gaps/padding on mobile (sm: restores the original
            spacing) free up the width that was missing in the first place. */}
        <Link href="/pricing" className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Image
            src="/brand/logo-blue.png"
            alt="DigitalFlyer"
            width={160}
            height={44}
            priority
            className="h-7 w-auto sm:h-8"
          />
          <span className="h-6 w-px bg-gray-300" aria-hidden />
          <span className="font-badge text-base uppercase tracking-widest text-brand sm:text-lg">Growth</span>
        </Link>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-4">
          {/* Marketplace, Events, and the login link all live in the real
              mobile nav menu below on narrow viewports now, instead of being
              individually hidden to dodge a header-width wrap bug (the
              previous fix for a third nav item breaking at 375px, then
              repeated for Events as a fourth). Hiding content every time a
              new section gets added doesn't scale — a proper menu does. */}
          <Link
            href="/how-it-works"
            className="hidden whitespace-nowrap text-xs font-medium text-gray-600 transition hover:text-ink sm:inline sm:text-sm"
          >
            How It Works
          </Link>
          <Link
            href="/marketplace"
            className="hidden whitespace-nowrap text-xs font-medium text-gray-600 transition hover:text-ink sm:inline sm:text-sm"
          >
            Marketplace
          </Link>
          <Link
            href="/events"
            className="hidden whitespace-nowrap text-xs font-medium text-gray-600 transition hover:text-ink sm:inline sm:text-sm"
          >
            Events
          </Link>
          <Link
            href="/agents/apply"
            className="hidden whitespace-nowrap text-xs font-medium text-gray-600 transition hover:text-ink sm:inline sm:text-sm"
          >
            Agents
          </Link>
          <Link
            href="/faq"
            className="hidden whitespace-nowrap text-xs font-medium text-gray-600 transition hover:text-ink sm:inline sm:text-sm"
          >
            FAQ
          </Link>
          <span className="hidden sm:inline">
            <MarketingHeaderAuthLink />
          </span>
          <a
            href="#pricing"
            className="whitespace-nowrap rounded-full bg-brand px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-dark sm:px-5 sm:text-sm"
          >
            <span className="sm:hidden">Pricing</span>
            <span className="hidden sm:inline">See pricing</span>
          </a>
          <MobileNavMenu />
        </div>
      </header>
      <PixelConsentGate pixelId={process.env.NEXT_PUBLIC_DIGITALFLYER_META_PIXEL_ID ?? null} />
    </>
  );
}
