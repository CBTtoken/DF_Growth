"use client";

import type { CvCheckItem } from "@/lib/jobs/cv-check";
import type { StepId } from "@/lib/jobs/cv-conversation";

/**
 * The CV check. Handoff Job 2: a checklist that tells the person what to
 * fix and takes them straight there, replacing a percentage that told
 * them they were 70% done and nothing about which 30% mattered.
 *
 * Every outstanding item is a tap that opens the exact screen that fixes
 * it. The done items are shown too, quietly, because a list of only
 * problems reads as a telling-off to somebody who has just spent twenty
 * minutes on this.
 *
 * This component never appears on the employer side. See lib/jobs/cv-check.ts
 * for why that is a rule and not a preference.
 */
export function CvCheckList({
  items,
  onFix,
}: {
  items: CvCheckItem[];
  onFix: (step: StepId) => void;
}) {
  const outstanding = items.filter((i) => !i.done);
  const done = items.filter((i) => i.done);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-neutral-100 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
        {outstanding.length === 0 ? "Your CV is ready to send" : "A few things would make this stronger"}
      </p>

      {outstanding.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onFix(item.step)}
          className="flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left transition hover:bg-neutral-50"
        >
          <span
            aria-hidden
            className="mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 border-accent"
          />
          <span className="min-w-0 flex-1 text-sm text-neutral-800">{item.message}</span>
          <span className="mt-0.5 shrink-0 text-xs font-semibold text-neutral-500">Fix</span>
        </button>
      ))}

      {done.length > 0 && (
        <div className="mt-1 flex flex-col gap-1.5 border-t border-neutral-100 pt-2">
          {done.map((item) => (
            <p key={item.id} className="flex items-start gap-2.5 px-2 text-sm text-neutral-400">
              {/* A tick drawn as text, not an icon font: it renders the
                  same on every phone in the country. */}
              <span aria-hidden className="mt-px shrink-0 font-semibold text-neutral-400">
                &#10003;
              </span>
              <span className="min-w-0">{item.message}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
