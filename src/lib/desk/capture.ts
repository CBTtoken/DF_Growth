// How typed text becomes items.
//
// v1 split on every line break, which turned a paragraph written as one
// thought into four fragments. v2's rule: a blank line separates items and a
// single line break does not.
//
// One addition to that rule, because the v1 behaviour was load-bearing too:
// a pasted list rarely has blank lines between its lines, and under the
// paragraph rule alone a ten-line list becomes one blob. So a line that opens
// with a bullet or a number also starts a new item. Between them, both ways
// of dumping work: prose stays whole, lists stay separate.
//
// Nothing here rewrites, corrects or tidies anything. Whitespace at the ends
// is trimmed and that is all.

// Matches "- ", "* ", "• ", "1. ", "2) ", "10 - " at the start of a line.
const LIST_MARKER = /^\s*(?:[-*•·]|\d{1,3}[.)])\s+/;

export function splitCapture(raw: string): string[] {
  const lines = raw.split(/\r?\n/);
  const blocks: string[][] = [];
  let current: string[] = [];

  const flush = () => {
    const text = current.join("\n").trim();
    if (text.length > 0) blocks.push([text]);
    current = [];
  };

  for (const line of lines) {
    if (line.trim().length === 0) {
      // A blank line closes whatever was being written.
      flush();
      continue;
    }

    // A list marker closes the previous line and opens a new item, unless it
    // is the first line of the block, in which case there is nothing to
    // close.
    if (LIST_MARKER.test(line) && current.length > 0) {
      flush();
    }

    current.push(line);
  }
  flush();

  return blocks.map(([text]) => text);
}

// Whether a captured blob is worth offering to Sort for splitting. A single
// short line almost never is, and asking the model about it wastes a call.
export function looksSplittable(title: string): boolean {
  return title.length > 140 || /\n/.test(title);
}
