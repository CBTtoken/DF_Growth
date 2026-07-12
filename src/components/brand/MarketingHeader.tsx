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
    <header className="sticky top-0 z-10 flex w-full items-center justify-between border-b border-gray-100 bg-white/90 px-6 py-4 backdrop-blur">
      <Link href="/pricing" className="flex items-center gap-3">
        <Image src="/brand/logo-blue.png" alt="DigitalFlyer" width={160} height={44} priority className="h-8 w-auto" />
        <span className="h-6 w-px bg-gray-300" aria-hidden />
        <span className="font-badge text-lg uppercase tracking-widest text-brand">Growth</span>
      </Link>
      <div className="flex items-center gap-4">
        <MarketingHeaderAuthLink />
        <a
          href="#pricing"
          className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          See pricing
        </a>
      </div>
    </header>
  );
}
