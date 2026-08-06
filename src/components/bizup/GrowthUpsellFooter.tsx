import Link from "next/link";

// Handoff: scripts/handoff-activation-nudges-and-emails.md, Jobs 5 and 6.
//
// The one line both nudges share, so the numbers can't drift apart between
// the two places they appear: Growth's monthly-vs-annual price (R180/mo,
// R1,199/yr, which works out cheaper per month than Foundation's own
// R100/mo — the brief's own strongest upgrade argument) plus the R450
// build-it-for-me offer as a secondary line, same facts as the full-size
// src/components/home/BuildItForMe.tsx section, just compact enough for a
// dashboard prompt rather than a marketing page.
export function GrowthUpsellFooter() {
  return (
    <div className="mt-3 flex flex-col gap-1 border-t border-black/10 pt-3 text-xs text-white/80">
      <p>
        Growth is R180/month, or R1,199/year, which works out to under R100/month, less than
        Foundation costs paid monthly.
      </p>
      <p>No time to set it up? We build your page for you, once-off, for R450.</p>
      <Link
        href="https://growth.digitalflyersa.co.za/pricing"
        className="mt-1 inline-flex w-fit items-center gap-1 text-xs font-bold text-white underline-offset-2 hover:underline"
      >
        See Growth plans
      </Link>
    </div>
  );
}
