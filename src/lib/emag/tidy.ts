import type { Block } from "./types";
import type { Measured } from "./paginate";

// The co-publisher.
//
// Dewald, 1 August 2026: "can we not have a co-publisher that checks layout
// like these gaps, or when an image was added and it leaves those big gaps,
// and fixes it".
//
// What he is seeing is not a bug in the spacing. It is the arithmetic of
// pages. A block cannot be cut in half, so when a picture is taller than
// the space left at the foot of a page, the whole picture moves to the next
// one and leaves that space empty. Forty millimetres of white at the bottom
// of a page, which no amount of nudging the paragraph gaps will close,
// because the gap is not made of paragraph gaps.
//
// The fix is to make the picture small enough to fit where it was, and that
// is arithmetic rather than judgement: the picture's height falls with its
// width, the space available is known, so the width that fits is known too.
//
// Deliberately not a model call. This is the one part of the build that
// must give the same answer every time, and a page that is tidied
// differently on Tuesday than it was on Monday is worse than an untidy one.

/** The reference's own rule: no white space gap larger than 20mm. */
export const MAX_GAP_MM = 20;

export type Suggestion = {
  /** Which block to change. */
  index: number;
  /** The picture it belongs to, so the caller can save the new width. */
  assetId: string;
  fromPct: number;
  toPct: number;
  /** What this closes, for telling the publisher. */
  closesMm: number;
  page: number;
};

export type TidyReport = {
  suggestions: Suggestion[];
  /** Gaps that nothing here can close, said plainly rather than hidden. */
  unfixable: string[];
};

type FigureLookup = (block: Block) => { assetId: string; widthPct: number } | null;

/**
 * Finds pages that end short, and works out which picture to shrink.
 *
 * Walks the same greedy fill the paginator does, and every time a page
 * closes early it looks at the block that would not fit. If that block is a
 * picture, the width that would have made it fit is arithmetic: height
 * falls in proportion to width, so a picture 120mm tall that needed to be
 * 80mm should be two thirds as wide.
 *
 * Only pictures are touched. Shrinking a paragraph is not a thing, and
 * moving text between pages to close a gap is how a magazine ends up with
 * one line stranded at the top of a page, which the reference forbids and
 * which looks worse than the gap did.
 */
export function tidy(
  measured: Measured[],
  firstPageHeightMm: number,
  liveHeightMm: number,
  figureOf: FigureLookup
): TidyReport {
  const suggestions: Suggestion[] = [];
  const unfixable: string[] = [];

  let used = 0;
  let available = Math.max(firstPageHeightMm, 0);
  let page = 1;

  for (let i = 0; i < measured.length; i++) {
    const { block, heightMm } = measured[i];

    if (used + heightMm <= available) {
      used += heightMm;
      continue;
    }

    // This block starts a new page. Whatever is left behind is the gap.
    const gap = available - used;

    if (gap > MAX_GAP_MM && used > 0) {
      const figure = figureOf(block);

      if (figure && figure.widthPct > 0) {
        // The height the picture would need in order to stay put, with a
        // hair of clearance so a rounding error does not push it over
        // again.
        const room = gap - 1;
        const scale = room / heightMm;
        const target = Math.floor(figure.widthPct * scale);

        // Below a quarter of the column a photograph stops being a
        // photograph and becomes a stamp. Better an honest gap.
        //
        // Not clamped up to 25. Raising a target of 10 to 25 would make it
        // pass this very check and then not fit, which is worse than the
        // gap: the page would still be short and the picture would be small
        // as well. A width that does not work is refused, not rounded.
        if (target >= 25 && target < figure.widthPct) {
          suggestions.push({
            index: i,
            assetId: figure.assetId,
            fromPct: figure.widthPct,
            toPct: target,
            closesMm: Math.round(gap),
            page,
          });
          // Assume the change is taken, so a second gap later in the
          // article is measured against a page that already fits.
          used += room;
          continue;
        }

        unfixable.push(
          `Page ${page} ends ${Math.round(gap)}mm short. The picture below it cannot shrink enough to fit without becoming too small to be worth printing. Move it earlier, or cut a paragraph above it.`
        );
      } else {
        unfixable.push(
          `Page ${page} ends ${Math.round(gap)}mm short because the next block will not fit. If it is a pull quote or a stat block, try moving it up a paragraph.`
        );
      }
    }

    page += 1;
    used = heightMm;
    available = liveHeightMm;
  }

  return { suggestions, unfixable };
}
