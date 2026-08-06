import { dismissQuoteNudge } from "@/app/bizup/nudge-actions";
import { GrowthUpsellFooter } from "@/components/bizup/GrowthUpsellFooter";

// Handoff: scripts/handoff-activation-nudges-and-emails.md, Job 6.
//
// Real numbers only, this account's own — no invented benchmark, no
// comparison to anyone else. Only rendered by the caller once sentCount
// clears QUOTE_NUDGE_THRESHOLD and no linked Growth account — see
// src/app/bizup/page.tsx. Dismissing stays dismissed for 30 days.
export function QuoteNudge({ sentCount, wonCount }: { sentCount: number; wonCount: number }) {
  const lostCount = sentCount - wonCount;

  return (
    <section className="rounded-2xl bg-brand p-5 text-white shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-bold">
          You&apos;ve sent {sentCount} quotes, {wonCount} became jobs
        </h2>
        <form action={dismissQuoteNudge}>
          <button type="submit" aria-label="Dismiss" className="text-white/70 transition hover:text-white">
            ×
          </button>
        </form>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-white/90">
        {lostCount > 0
          ? `The ${lostCount} that didn't say yes likely went with someone they could see more of first. A Growth page shows your work before you even quote.`
          : "A Growth page shows your work before you even quote, so the next customer already knows you're the right call."}
      </p>
      <GrowthUpsellFooter />
    </section>
  );
}
