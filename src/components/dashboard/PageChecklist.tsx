import Link from "next/link";
import { pageReadiness, type ReadinessInput } from "@/lib/page-readiness";

// Sprint "Onboarding two doors" item 5. Replaces ProfileCompletenessBanner,
// which checked three of these same things: two competing "you are not
// finished" cards on one dashboard would be exactly the clutter the
// interface standard warns about, so this absorbs it rather than sitting
// next to it.
//
// Structure, per the interface standard: one labelled group, six items at
// most, each a plain-language row with a tick and a link to the one place
// it gets fixed. No primary action of its own, so it never competes with
// the dashboard's own. Done items stay visible while anything is
// outstanding, because seeing four green ticks is what makes the remaining
// two feel worth doing. The whole card disappears once everything is done
// rather than living on as a permanent green box.
export function PageChecklist(input: ReadinessInput) {
  const items = pageReadiness(input);
  const outstanding = items.filter((i) => !i.done);
  if (outstanding.length === 0) return null;

  const done = items.length - outstanding.length;

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <div>
        <h2 className="text-sm font-bold tracking-tight text-ink">
          Your page checklist ({done} of {items.length} done)
        </h2>
        <p className="mt-0.5 text-xs text-gray-600">
          Your page is live either way. These are the things that make the biggest difference to
          whether a visitor gets in touch.
        </p>
      </div>

      <ul className="flex flex-col gap-1.5">
        {items.map((item) => (
          <li key={item.key}>
            {item.done ? (
              <div className="flex items-start gap-2.5 rounded-xl px-3 py-2">
                <span
                  aria-hidden
                  className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-green-600 text-[9px] font-bold text-white"
                >
                  ✓
                </span>
                <span className="text-xs font-semibold text-gray-500 line-through decoration-gray-300">
                  {item.label}
                </span>
              </div>
            ) : (
              <Link
                href={item.href}
                className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-white px-3 py-2 transition hover:border-amber-400"
              >
                <span
                  aria-hidden
                  className="mt-0.5 size-4 shrink-0 rounded-full border-2 border-amber-300 bg-white"
                />
                <span className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold text-ink">{item.label}</span>
                  <span className="text-xs leading-relaxed text-gray-500">{item.hint}</span>
                </span>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
