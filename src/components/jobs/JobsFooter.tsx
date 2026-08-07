import Link from "next/link";
import { LegalDisclosure } from "@/components/LegalDisclosure";
import { jobsPath } from "@/lib/jobs/host";

// Jobs' own minimal footer, not the shared SiteFooter: that component's
// middle links (Marketplace, Find a Trade, Shop) are Growth/KatisoBiz
// member-facing pages a job seeker has no reason to see, and none of them
// resolve correctly rewritten under jobs.katisobiz.co.za's own host branch.
// The legal links are the one part every product on this application must
// carry, so they're kept, same destinations (SHARED_LEGAL_PATHS in
// src/proxy.ts passes /privacy, /terms and /paia through unrewritten on
// every hostname, including this one).
export async function JobsFooter() {
  const [howItWorks, faq, vacancies, employers] = await Promise.all([
    jobsPath("/how-it-works"),
    jobsPath("/faq"),
    jobsPath("/vacancies"),
    jobsPath("/employers"),
  ]);

  return (
    <footer className="mt-auto flex flex-col items-center gap-2 py-6 text-center text-xs text-neutral-400">
      {/* The product's own pages first, then the legal ones. Every page
          on the site links to How it works and Questions from here, which
          is what gets both crawled and what gives somebody stuck on any
          screen a way to ask. */}
      <div className="mb-1 text-neutral-500">
        <Link href={howItWorks} className="underline-offset-2 hover:text-neutral-800 hover:underline">
          How it works
        </Link>
        <span aria-hidden> · </span>
        <Link href={faq} className="underline-offset-2 hover:text-neutral-800 hover:underline">
          Questions
        </Link>
        <span aria-hidden> · </span>
        <Link href={vacancies} className="underline-offset-2 hover:text-neutral-800 hover:underline">
          Jobs board
        </Link>
        <span aria-hidden> · </span>
        <Link href={employers} className="underline-offset-2 hover:text-neutral-800 hover:underline">
          I am hiring
        </Link>
      </div>
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
