import { dismissReviewWedge } from "@/app/bizup/nudge-actions";
import { GrowthUpsellFooter } from "@/components/bizup/GrowthUpsellFooter";

// Handoff: scripts/handoff-activation-nudges-and-emails.md, Job 5.
//
// Only rendered by the caller when reviewCount >= 1 and no linked Growth
// account — see src/app/bizup/page.tsx. Dismissing stays dismissed for 30
// days (nudge-actions.ts + lib/bizup/nudges.ts's isDismissed).
export function ReviewWedge({ reviewCount }: { reviewCount: number }) {
  return (
    <section className="rounded-2xl bg-brand p-5 text-white shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-bold">
          {reviewCount === 1 ? "You have 1 review" : `You have ${reviewCount} reviews`}, and nobody can find them
        </h2>
        <form action={dismissReviewWedge}>
          <button type="submit" aria-label="Dismiss" className="text-white/70 transition hover:text-white">
            ×
          </button>
        </form>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-white/90">
        Right now those reviews are sitting on your KatisoBiz account with nowhere for a customer
        to see them. A Growth page puts them where someone searching for your trade actually finds
        you.
      </p>
      <GrowthUpsellFooter />
    </section>
  );
}
