// Agent Programme Phase 0.2/0.4.
//
// Two shared text utilities that fix real, live, user-visible bugs:
//
// 1. truncateOnWord: every cap in this codebase was a raw `.slice(0, n)`,
//    which cuts mid-word. That produced "this was different and for my bu"
//    on a live client page AND in the meta description, so the broken cut
//    showed up in Google results and WhatsApp link previews.
// 2. stripEmDashes: em dashes are banned in all DigitalFlyer copy. The
//    templates are already clean, the source is AI-generated copy stored in
//    the database, so it has to be stripped at write time as a backstop even
//    though the prompt also forbids it.

// Cuts at the last word boundary before `max`, never mid-word. Appends an
// ellipsis only when something was actually removed. A single word longer
// than `max` (rare, e.g. a URL) still gets a hard cut, since there is no
// boundary to fall back to.
export function truncateOnWord(text: string, max: number): string {
  const clean = text.trim();
  if (clean.length <= max) return clean;

  // -1 leaves room for the ellipsis character.
  const window = clean.slice(0, max - 1);
  const lastSpace = window.lastIndexOf(" ");
  const cut = lastSpace > max * 0.5 ? window.slice(0, lastSpace) : window;
  // Drop any trailing punctuation so we never render ",…" or ".…".
  return `${cut.replace(/[\s,;:.!?-]+$/, "")}…`;
}

// Replaces em and en dashes with a comma when used as a clause break, or a
// plain hyphen when they sit between digits (a range like 2020-2024).
export function stripEmDashes(text: string): string {
  return text
    .replace(/(\d)\s*[—–]\s*(\d)/g, "$1-$2")
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/,\s*,/g, ",");
}
