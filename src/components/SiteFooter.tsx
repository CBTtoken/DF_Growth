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

// Agent Programme Phase 0.1: the "Secure payment via Paystack" badge must not
// appear on the agent recruitment pages. Those recruit people who need income,
// so a payment badge reads as a joining fee. `showPaymentBadge` defaults to
// true (every existing page is unchanged); the agent pages pass false.
//
// Agent Programme Phase 1 Sec 1.3: "No recruitment call to action anywhere
// on an agent page." The "Become an Agent" link below is one, so it gets
// the same treatment as the payment badge above, defaulting on and
// switched off by the agent pages themselves. An agent page is aimed at
// business owners, not at recruits, and a recruitment link on it competes
// directly with the one thing that page is for.
export function SiteFooter({
  showPaymentBadge = true,
  showAgentRecruitment = true,
}: { showPaymentBadge?: boolean; showAgentRecruitment?: boolean } = {}) {
  return (
    <footer className="mt-auto flex flex-col items-center gap-2 py-6 text-center text-xs text-gray-400">
      {showPaymentBadge && (
        <div className="flex items-center gap-1.5">
          <span aria-hidden>🔒</span>
          <span>Secure payment via Paystack</span>
        </div>
      )}
      <div>
        <Link href="/marketplace" className="underline-offset-2 hover:text-gray-600 hover:underline">
          Marketplace
        </Link>
        <span aria-hidden> · </span>
        <Link href="/shop" className="underline-offset-2 hover:text-gray-600 hover:underline">
          Shop
        </Link>
        {showAgentRecruitment && (
          <>
            <span aria-hidden> · </span>
            <Link href="/agents" className="underline-offset-2 hover:text-gray-600 hover:underline">
              Become an Agent
            </Link>
          </>
        )}
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
