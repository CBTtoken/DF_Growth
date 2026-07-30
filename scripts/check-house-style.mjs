// Fails if an em dash reaches a string a person can read.
//
// Dewald has asked for this four separate times now, and it has crept back
// in every time. The previous version of this check only looked at email
// templates, which is why a sweep in July found em dashes in the onboarding
// wizard, the events forms, the review flow, every member page's section
// headings, and the AI prompt that drafts member page copy.
//
// The hard part is telling a string from a comment. There are roughly a
// thousand em dashes in this codebase's comments and none of them matter:
// nobody reads a comment, and a check that fails on things nobody cares
// about gets switched off within a week. A line-based filter cannot do it,
// because most comments here run over several lines and only the first one
// starts with a marker.
//
// So this walks the file character by character, tracking whether it is
// inside a string, a template literal, a line comment or a block comment,
// and only reports what survives. Skipping strings also means a URL's "//"
// is not mistaken for the start of a comment.
import { readFileSync, readdirSync, statSync } from "node:fs";

const ROOTS = ["src", "scripts"];
const EXTENSIONS = /\.(ts|tsx|js|jsx|mjs)$/;

/**
 * Every way to write a dash that a reader sees as a dash.
 *
 * The literal character is only one of them. The first version of this
 * check looked for that alone and passed, while the Standing 365 page was
 * live with `&mdash;` in its opening paragraph, rendering exactly the
 * punctuation the rule forbids. Found by reading the rendered page rather
 * than the source, which is the whole argument for checking output.
 *
 * JSX entities, numeric entities in either base, and JavaScript escapes all
 * reach the screen identically, so all of them are the same violation.
 */
const DASH = /[–—]|&mdash;|&ndash;|&#8212;|&#8211;|&#x201[34];|\\u201[34]/i;

// lib/text.ts converts em dashes to commas on the way in, so it has to be
// able to name the character it is removing.
const ALLOWED = new Set(["src/lib/text.ts", "scripts/check-house-style.mjs"]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = `${dir}/${entry}`;
    if (statSync(full).isDirectory()) walk(full, out);
    else if (EXTENSIONS.test(entry)) out.push(full);
  }
  return out;
}

/**
 * Replaces every comment with spaces, leaving strings and code intact.
 *
 * Spaces rather than deletion so line and column numbers still line up with
 * the real file when something is reported.
 */
function blankComments(src) {
  const out = src.split("");
  let i = 0;
  const n = src.length;

  while (i < n) {
    const c = src[i];
    const next = src[i + 1];

    // Strings and template literals: skipped whole, so their contents are
    // preserved and anything comment-like inside them is ignored.
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      i++;
      while (i < n) {
        if (src[i] === "\\") {
          i += 2;
          continue;
        }
        if (src[i] === quote) {
          i++;
          break;
        }
        // A template literal can hold ${ ... } with more code in it. Left
        // alone: at worst a comment inside an interpolation is not blanked,
        // which can only cause a false report, never a missed one.
        i++;
      }
      continue;
    }

    if (c === "/" && next === "/") {
      while (i < n && src[i] !== "\n") {
        out[i] = " ";
        i++;
      }
      continue;
    }

    if (c === "/" && next === "*") {
      out[i] = " ";
      out[i + 1] = " ";
      i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) {
        if (src[i] !== "\n") out[i] = " ";
        i++;
      }
      if (i < n) {
        out[i] = " ";
        out[i + 1] = " ";
        i += 2;
      }
      continue;
    }

    i++;
  }

  return out.join("");
}

/**
 * Line numbers occupied by console.* and Sentry.capture* calls.
 *
 * These are diagnostics, read by us while operating the thing and never by
 * a member or a customer, so the copy rule does not apply to them. Matched
 * by balancing brackets rather than per line, because the ones that matter
 * are exactly the calls long enough to wrap, where the dash sits on a
 * continuation line with nothing on it to recognise.
 */
function diagnosticLines(src) {
  const exempt = new Set();
  const pattern = /(console\.(log|error|warn|info|debug)|Sentry\.capture\w*)\s*\(/g;
  let m;

  while ((m = pattern.exec(src)) !== null) {
    let depth = 0;
    let i = m.index + m[0].length - 1;
    const start = i;

    for (; i < src.length; i++) {
      const c = src[i];
      if (c === '"' || c === "'" || c === "`") {
        const quote = c;
        i++;
        while (i < src.length && src[i] !== quote) {
          if (src[i] === "\\") i++;
          i++;
        }
        continue;
      }
      if (c === "(") depth++;
      else if (c === ")") {
        depth--;
        if (depth === 0) break;
      }
    }

    const firstLine = src.slice(0, start).split("\n").length;
    const lastLine = src.slice(0, i).split("\n").length;
    for (let l = firstLine; l <= lastLine; l++) exempt.add(l);
  }

  return exempt;
}

const failures = [];

for (const root of ROOTS) {
  let files;
  try {
    files = walk(root);
  } catch {
    continue;
  }

  for (const file of files) {
    const rel = file.replace(/\\/g, "/");
    if (ALLOWED.has(rel)) continue;

    const src = readFileSync(file, "utf8");
    if (!DASH.test(src)) continue;

    const stripped = blankComments(src);
    const exempt = diagnosticLines(stripped);

    stripped.split("\n").forEach((line, idx) => {
      DASH.lastIndex = 0;
      if (!DASH.test(line)) return;
      if (exempt.has(idx + 1)) return;
      failures.push(`${rel}:${idx + 1}: ${line.trim().slice(0, 120)}`);
    });
  }
}

if (failures.length > 0) {
  console.error("Em dashes found in text a person can read.\n");
  console.error("House rule: never in anything a member or customer reads.");
  console.error("Use a full stop, a comma, or rewrite the sentence.");
  console.error("Comments are exempt and are not reported here.\n");
  failures.forEach((f) => console.error("  " + f));
  console.error(`\n${failures.length} to fix.`);
  process.exit(1);
}

console.log("No em dashes in readable text.");
