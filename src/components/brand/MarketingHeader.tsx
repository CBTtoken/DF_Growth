import Image from "next/image";
import Link from "next/link";
import { MarketingHeaderAuthLink } from "@/components/brand/MarketingHeaderAuthLink";

// Distinct from BrandHeader (used on the utility pages — dashboard, wizard):
// this is a real header bar for the marketing page, not a logo floating in
// the content flow, which was the exact complaint that started this rework.
//
// Found via real UAT: a logged-in business owner browsing their own
// marketing page back saw "Log in" like a stranger, with no obvious way
// back to their dashboard. The "Log in"/"Dashboard" swap now happens in
// MarketingHeaderAuthLink (client-side) rather than here — see its own
// comment for why (Task #12 cold-start fix).
export function MarketingHeader() {
  return (
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
        {/* Previously hidden below sm to dodge a real wrap bug (a third nav
            item pushed "Log in" onto two lines at 375px) — fixed properly
            instead of just hiding it: shorter mobile label ("Pricing" vs
            "See pricing") frees up the width the wrap bug was actually
            fighting over. Verified at 375px with no wrap. */}
        <Link
          href="/marketplace"
          className="whitespace-nowrap text-xs font-medium text-gray-600 transition hover:text-ink sm:text-sm"
        >
          Marketplace
        </Link>
        <MarketingHeaderAuthLink />
        <a
          href="#pricing"
          className="whitespace-nowrap rounded-full bg-brand px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-dark sm:px-5 sm:text-sm"
        >
          <span className="sm:hidden">Pricing</span>
          <span className="hidden sm:inline">See pricing</span>
        </a>
      </div>
    </header>
  );
}
