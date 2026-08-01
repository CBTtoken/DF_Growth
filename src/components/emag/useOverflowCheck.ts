"use client";

import { useEffect, useState, type RefObject } from "react";

// Does any rendered page actually overflow?
//
// Everything else in this build reasons about heights before the page is
// drawn. This asks the drawn page, which is the only witness that cannot be
// argued with. Dewald reported text bleeding off the bottom twice while my
// arithmetic said it fitted, and arithmetic that disagrees with the page is
// wrong by definition.
//
// It watches the real preview, not the hidden measuring column, so it sees
// exactly what he sees.

export type Overflow = { page: number; byMm: number };

const MM_PER_PX = 25.4 / 96;

export function useOverflowCheck(
  deckRef: RefObject<HTMLDivElement | null>,
  // Re-checked whenever this changes, which is whenever the pages do.
  signal: unknown
): Overflow[] {
  const [overflows, setOverflows] = useState<Overflow[]>([]);

  useEffect(() => {
    const deck = deckRef.current;
    if (!deck) return;

    let cancelled = false;

    const check = () => {
      if (cancelled) return;
      const found: Overflow[] = [];

      deck.querySelectorAll(".mx-page__body").forEach((body, i) => {
        const el = body as HTMLElement;
        // scrollHeight is how tall the content actually is; clientHeight is
        // the box it has been given. The difference is what is spilling out
        // under the footer.
        const over = el.scrollHeight - el.clientHeight;
        // A millimetre of slack for sub-pixel rounding, which is not a
        // layout problem and would otherwise cry wolf on every page.
        if (over * MM_PER_PX > 1) {
          found.push({ page: i + 1, byMm: Math.round(over * MM_PER_PX) });
        }
      });

      setOverflows((previous) => {
        const same =
          previous.length === found.length &&
          previous.every((p, i) => p.page === found[i].page && p.byMm === found[i].byMm);
        return same ? previous : found;
      });
    };

    // After paint, and again once any photographs have arrived, because a
    // page measured before its pictures load is not the page.
    const frame = requestAnimationFrame(check);
    const settle = setTimeout(check, 600);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      clearTimeout(settle);
    };
  }, [deckRef, signal]);

  return overflows;
}
