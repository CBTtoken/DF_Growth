import type { Mark, RichText } from "./types";

// Emphasis, as offsets into a string that nobody is allowed to rewrite.
//
// Dewald, 2 August 2026: "we need to allow the editor more editing in terms
// of font edits, once pasted into a paragraph block that is it, can make
// something bigger or smaller or highlight?"
//
// Bold, italic and highlight, yes. Arbitrary sizes, deliberately not. A
// magazine looks like itself because the type scale is fixed, and a per-word
// size control is how a page stops looking like Moxie and starts looking
// like a newsletter. Something that needs to stand out more than italic can
// carry is a pull quote or a Moxie Tip, and both already exist.
//
// The awkward part is not applying a mark, it is keeping it correct
// afterwards. A mark is a pair of character offsets, so typing one word
// earlier in the paragraph moves every mark after it. Storing markup instead
// would dodge that, and would break the one promise this build actually
// makes: the text that comes out is byte for byte the text that went in.
// So the offsets move instead, and this module is where that happens.
//
// Pure on purpose. No React, no DOM, so the rules can be tested by
// scripts/check-layout.mjs rather than by clicking.

const EMPTY: Mark[] = [];

/** Marks in a sane order, with anything empty or out of range dropped. */
function tidyMarks(marks: Mark[], length: number): Mark[] {
  return marks
    .map((m) => ({ ...m, start: Math.max(0, m.start), end: Math.min(length, m.end) }))
    .filter((m) => m.end > m.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);
}

/**
 * Merges neighbours of the same kind.
 *
 * Bolding two halves of a phrase separately should leave one mark, not two
 * touching ones. Purely cosmetic in the output, but it stops the stored
 * marks growing without limit as somebody works over a paragraph.
 */
function mergeAdjacent(marks: Mark[]): Mark[] {
  const out: Mark[] = [];
  for (const mark of marks) {
    const last = out[out.length - 1];
    if (last && last.kind === mark.kind && mark.start <= last.end) {
      last.end = Math.max(last.end, mark.end);
    } else {
      out.push({ ...mark });
    }
  }
  return out;
}

/**
 * Removes a range from the existing marks, splitting any that straddle it.
 *
 * A mark that covers the range entirely becomes two, one either side. This
 * is what makes un-bolding three words in the middle of a bold sentence
 * behave the way anybody would expect.
 */
function cut(marks: Mark[], start: number, end: number, kind?: Mark["kind"]): Mark[] {
  const out: Mark[] = [];
  for (const mark of marks) {
    if (kind && mark.kind !== kind) {
      out.push(mark);
      continue;
    }
    if (mark.end <= start || mark.start >= end) {
      out.push(mark);
      continue;
    }
    if (mark.start < start) out.push({ ...mark, end: start });
    if (mark.end > end) out.push({ ...mark, start: end });
  }
  return out;
}

/** True when every character in the range already carries this kind. */
export function hasMark(content: RichText, start: number, end: number, kind: Mark["kind"]): boolean {
  if (end <= start) return false;
  const covering = (content.marks ?? [])
    .filter((m) => m.kind === kind)
    .sort((a, b) => a.start - b.start);

  let reached = start;
  for (const mark of covering) {
    if (mark.start > reached) break;
    reached = Math.max(reached, mark.end);
    if (reached >= end) return true;
  }
  return false;
}

/**
 * Applies or removes emphasis over a selection.
 *
 * Toggling: if the whole selection already carries the kind, this takes it
 * off. That is what the keyboard shortcut in every writing tool does, and a
 * button that only ever adds would leave a writer stuck with emphasis they
 * cannot remove.
 */
export function toggleMark(
  content: RichText,
  start: number,
  end: number,
  kind: Mark["kind"]
): RichText {
  if (end <= start) return content;

  const existing = tidyMarks(content.marks ?? EMPTY, content.text.length);
  const on = hasMark(content, start, end, kind);

  const next = on
    ? cut(existing, start, end, kind)
    : [...cut(existing, start, end, kind), { start, end, kind }];

  const marks = mergeAdjacent(tidyMarks(next, content.text.length));
  return { ...content, marks: marks.length ? marks : undefined };
}

/** Takes all emphasis off a selection, whatever kind it is. */
export function clearMarks(content: RichText, start: number, end: number): RichText {
  if (end <= start) return content;
  const marks = mergeAdjacent(
    tidyMarks(cut(content.marks ?? EMPTY, start, end), content.text.length)
  );
  return { ...content, marks: marks.length ? marks : undefined };
}

/**
 * Moves the marks to match an edit to the text.
 *
 * Called on every keystroke, so it works out what changed rather than being
 * told. The common prefix and common suffix of the old and new strings
 * bracket the edit; everything between them is what the writer did, however
 * they did it, including a paste over a selection or a cut.
 *
 * Marks entirely before the edit do not move. Marks entirely after it shift
 * by the change in length. A mark the edit lands inside is stretched or
 * shrunk to match, and collapses away if the text it covered is gone. That
 * last case is the important one: without it, deleting a bold sentence
 * leaves a mark pointing at whatever text slid into its place, and emphasis
 * appears on words nobody emphasised.
 */
export function shiftMarks(content: RichText, nextText: string): RichText {
  const previous = content.text;
  if (previous === nextText) return content;

  const marks = content.marks ?? EMPTY;
  if (marks.length === 0) return { ...content, text: nextText, marks: undefined };

  let prefix = 0;
  const max = Math.min(previous.length, nextText.length);
  while (prefix < max && previous[prefix] === nextText[prefix]) prefix++;

  let suffix = 0;
  while (
    suffix < max - prefix &&
    previous[previous.length - 1 - suffix] === nextText[nextText.length - 1 - suffix]
  ) {
    suffix++;
  }

  const removedFrom = prefix;
  const removedTo = previous.length - suffix;
  const delta = nextText.length - previous.length;

  const moved = marks.map((mark) => {
    const move = (offset: number) => {
      if (offset <= removedFrom) return offset;
      if (offset >= removedTo) return offset + delta;
      // Inside the replaced stretch: pull back to where it began, so the
      // mark covers only text that survived.
      return removedFrom;
    };
    return { ...mark, start: move(mark.start), end: move(mark.end) };
  });

  const tidied = mergeAdjacent(tidyMarks(moved, nextText.length));
  return { ...content, text: nextText, marks: tidied.length ? tidied : undefined };
}
