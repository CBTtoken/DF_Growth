import { paginate, type Measured, type PaginateInput } from "./paginate";

// Copyfitting: pulling a few stranded lines back off a page they should
// never have started.
//
// Dewald, 1 August 2026: "what can we do when there is literally only three
// lines pushed onto a new page? Currently the only option is reduce the
// text, what if there is some manoeuvre space to actually fit it?"
//
// There is, and it is what a designer does by hand. Three lines hanging
// alone on a page do not need the article cut. They need the whole article
// tightened by a fraction that nobody can see, until those lines come
// back. Take two percent off the line spacing of a two page article and you
// gain roughly five millimetres a page, which is a line.
//
// The tightening is applied to the article as a whole, never to one page,
// because a page set fractionally tighter than the page facing it is
// visible even when neither is visible on its own.
//
// Deliberately small. Beyond about four percent the text starts to look
// cramped next to the rest of the magazine, and at that point the honest
// answer really is to cut a sentence, so it says so instead.

/** The most the line spacing may be squeezed, as a fraction. */
export const MAX_TIGHTEN = 0.04;

/**
 * A page holding this little is a runt: not a real page, just an overspill.
 * A quarter of the live area, which at A4 is about eleven lines.
 */
const RUNT_FRACTION = 0.25;

export type FitSuggestion = {
  /** How much to squeeze, as a fraction. 0.02 is two percent. */
  tighten: number;
  /** How many lines are currently stranded, roughly, for the wording. */
  strandedMm: number;
  /** How many pages this saves. Always 1 for now. */
  savesPages: number;
};

/**
 * Works out whether a last page of leftovers can be absorbed by tightening.
 *
 * Only ever offered for the final page, and only when it is nearly empty.
 * A last page that is half full is a normal last page, and squeezing an
 * article to avoid one would be fixing something that is not broken.
 */
/**
 * How many pages an article takes at a given squeeze.
 *
 * Runs the real paginator rather than a copy of it.
 *
 * The first version reimplemented the greedy fill here, and that was the
 * same mistake in a new place: the copy did not know about subheadings
 * glued to the paragraph below them, or floated pictures, or the safety
 * margin. So it could confidently predict a saving that the real page
 * breaks never delivered, and the button would do nothing. Two versions of
 * the same rule always drift; there is only ever one here now.
 *
 * The one approximation left is unavoidable. The heights were measured at
 * whatever squeeze the article is set to now, so the heights at a different
 * squeeze have to be scaled rather than measured. Text scales with its line
 * spacing; a photograph does not move at all.
 */
function pagesAt(
  input: PaginateInput,
  measured: Measured[],
  from: number,
  to: number
): { pages: number; lastUsedMm: number } {
  const scale = (1 - to) / (1 - from);

  const scaled: Measured[] = measured.map((m) => ({
    ...m,
    heightMm: m.block.type === "figure" ? m.heightMm : m.heightMm * scale,
  }));

  const result = paginate({ ...input, blocks: scaled });

  // How full the last page ended up, worked out from the blocks that landed
  // on it rather than tracked separately.
  const lastPage = result.pages[result.pages.length - 1];
  const onLast = new Set(lastPage?.blocks ?? []);
  const lastUsedMm = scaled
    .filter((m) => onLast.has(m.block) && !m.floats)
    .reduce((sum, m) => sum + m.heightMm, 0);

  return { pages: result.pages.length, lastUsedMm };
}

export function suggestTighten(
  input: PaginateInput,
  measured: Measured[],
  alreadyTightened: number
): FitSuggestion | null {
  // An article already squeezed to the limit has nothing left to give.
  if (alreadyTightened >= MAX_TIGHTEN - 0.001) return null;

  const now = pagesAt(input, measured, alreadyTightened, alreadyTightened);
  if (now.pages < 2) return null;

  // A last page that is genuinely a page is a normal last page. Squeezing an
  // article to avoid one would be fixing something that is not broken.
  if (now.lastUsedMm > input.liveHeightMm * RUNT_FRACTION) return null;

  // Searched rather than calculated.
  //
  // The obvious arithmetic, "the stranded millimetres divided by the total
  // text", is only an estimate, and testing showed it is often wrong in the
  // direction that matters: it offers a squeeze that does not actually save
  // the page, because pages are filled in whole paragraphs and a paragraph
  // either fits or it does not. Half a millimetre of leading changes
  // nothing until it changes everything.
  //
  // So each candidate is simulated and the smallest one that genuinely
  // drops a page is the one offered. A tenth of a percent at a time, which
  // is forty steps at most and costs nothing.
  for (let candidate = alreadyTightened + 0.001; candidate <= MAX_TIGHTEN + 1e-9; candidate += 0.001) {
    const rounded = Math.round(candidate * 1000) / 1000;
    const after = pagesAt(input, measured, alreadyTightened, rounded);
    if (after.pages < now.pages) {
      return {
        tighten: rounded,
        strandedMm: Math.round(now.lastUsedMm),
        savesPages: now.pages - after.pages,
      };
    }
  }

  // Nothing inside the acceptable range saves the page. Said by staying
  // quiet: the honest advice at that point is to cut a sentence or make a
  // picture smaller, and the editor already reports the gap.
  return null;
}

/** How to describe a squeeze to somebody who does not think in percentages. */
export function describeTighten(tighten: number): string {
  const percent = Math.round(tighten * 1000) / 10;
  return `${percent}% tighter line spacing`;
}
