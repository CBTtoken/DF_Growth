import Link from "next/link";
import { LegalDisclosure } from "@/components/LegalDisclosure";

// Jobs' own minimal footer, not the shared SiteFooter: that component's
// middle links (Marketplace, Find a Trade, Shop) are Growth/KatisoBiz
// member-facing pages a job seeker has no reason to see, and none of them
// resolve correctly rewritten under jobs.katisobiz.co.za's own host branch.
// The legal links are the one part every product on this application must
// carry, so they're kept, same destinations (SHARED_LEGAL_PATHS in
// src/proxy.ts passes /privacy, /terms and /paia through unrewritten on
// every hostname, including this one).
export function JobsFooter() {
  return (
    <footer className="mt-auto flex flex-col items-center gap-2 py-6 text-center text-xs text-neutral-400">
      <div>
        <Link href="/privacy" className="underline-offset-2 hover:text-neutral-600 hover:underline">
          Privacy Policy
        </Link>
        <span aria-hidden> · </span>
        <Link href="/terms" className="underline-offset-2 hover:text-neutral-600 hover:underline">
          Terms &amp; Conditions
        </Link>
        <span aria-hidden> · </span>
        <Link href="/paia" className="underline-offset-2 hover:text-neutral-600 hover:underline">
          PAIA Manual
        </Link>
      </div>
      <LegalDisclosure className="mt-1" />
    </footer>
  );
}
