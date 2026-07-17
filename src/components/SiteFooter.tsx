// Sprint 1, Build Item 9: Privacy Policy and Terms & Conditions must be
// linked from the footer on every page type — marketing homepage,
// onboarding wizard, dashboard, and login. The one page type this doesn't
// cover is a client's own public page (/[slug]), which already has its
// own custom footer with a "Manage this page" link — these two links are
// added directly into that existing footer instead of duplicating one here.
//
// Combined spec Sec 2: "Secure payment via Paystack" moved here from client
// pages (see TrustBadges.tsx) — accurate on DigitalFlyer's own site, since
// real Foundation/Growth subscription billing genuinely runs through
// Paystack, unlike a client page's Packages section which has no connected
// checkout at all.
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto flex flex-col items-center gap-2 py-6 text-center text-xs text-gray-400">
      <div className="flex items-center gap-1.5">
        <span aria-hidden>🔒</span>
        <span>Secure payment via Paystack</span>
      </div>
      <div>
        <Link href="/marketplace" className="underline-offset-2 hover:text-gray-600 hover:underline">
          Marketplace
        </Link>
        <span aria-hidden> · </span>
        <Link href="/agents/apply" className="underline-offset-2 hover:text-gray-600 hover:underline">
          Become an Agent
        </Link>
        <span aria-hidden> · </span>
        <Link href="/privacy" className="underline-offset-2 hover:text-gray-600 hover:underline">
          Privacy Policy
        </Link>
        <span aria-hidden> · </span>
        <Link href="/terms" className="underline-offset-2 hover:text-gray-600 hover:underline">
          Terms &amp; Conditions
        </Link>
      </div>
    </footer>
  );
}
