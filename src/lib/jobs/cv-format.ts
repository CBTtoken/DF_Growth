// Deterministic CV formatting. The handoff's rule, and the reason this
// file exists rather than a prompt: "Formatting, not dumping. What the
// person typed is the content. How it looks on the page is ours to fix,
// and it must be fixed deterministically in the renderer, not by asking
// the AI. None of this changes a single word of meaning."
//
// So: pure functions, no model, no network, no database. Every one of
// them is reversible in the sense that matters -- none of them adds,
// removes or reorders a word. They change case, spacing, punctuation and
// date notation, nothing else.
//
// This runs on the way OUT, in the renderer, never on the way in. What
// the person typed stays in the database exactly as they typed it, so an
// edit screen always shows them their own words back. The consequence is
// that these functions must be cheap and total: they are called on every
// PDF and every Word file, and they must never throw on input as strange
// as a CV typed entirely in capitals with pasted bullet characters in it.

// ---------------------------------------------------------------
// Whitespace and stray characters
// ---------------------------------------------------------------

// Bullet glyphs people paste in from Word, Google Docs and WhatsApp. They
// arrive at the START of a line, where our own renderer is about to add a
// real bullet, so leaving them produces "• • Fixed leaking pipes".
// The dashes are written as escapes rather than literally so the house
// style check does not read this line as copy containing an em dash. It
// has to MATCH them: somebody pasting a list out of Word arrives with
// real en and em dashes at the start of each line.
const STRAY_BULLETS = /^\s*[•·▪◦‣⁃*\-–—]+\s*/;

/**
 * Collapse double spaces, strip trailing spaces, normalise curly quotes to
 * straight ones. Runs on every string that reaches the page.
 *
 * Curly quotes are normalised rather than preserved because the three PDF
 * core fonts (Helvetica, Times, Courier) that react-pdf ships have no
 * glyph for U+2019, and react-pdf renders a missing glyph as a blank. A
 * person who typed "I'm" on a phone keyboard got "Im" on their CV.
 */
export function cleanText(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”‟]/g, '"')
    .replace(/…/g, "...")
    // Non-breaking and other exotic spaces, which survive a .trim().
    .replace(/[  -​]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ +\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ---------------------------------------------------------------
// Case
// ---------------------------------------------------------------

// Words that stay lowercase inside a name unless they lead it. Deliberately
// short: this is a South African CV, and over-cleverness here does more
// damage than under-cleverness. "van der Merwe" is the case that matters.
const LOWERCASE_PARTICLES = new Set([
  "van", "der", "den", "de", "du", "le", "la", "el", "of", "the", "and", "at", "for", "in", "on", "to",
]);

// Acronyms that contain a vowel, so the vowel-free rule below cannot
// catch them. Kept short on purpose: this list can never be complete, and
// the rule is what does the real work.
const KEEP_AS_TYPED = new Set([
  "IT", "HR", "SA", "RSA", "SARS", "SETA", "TVET", "ABET", "OHS", "SHEQ", "HACCP",
  "ISO", "POS", "ATM", "PA", "EMS", "ICU", "AA", "BEE", "BBBEE", "UIF", "PAYE",
  "OSHA", "AWS", "SAP", "ERP", "EFT", "COD", "OEM", "SLA", "KPI", "PPE", "SAQA",
  "NOSA", "CIPC", "COIDA", "SANAS", "NEBOSH", "IOSH", "SABS", "SAPS",
]);

/**
 * Is this token an acronym that must not be title-cased?
 *
 * The rule, rather than a list: a short run of capitals with no vowel in
 * it is an acronym, because there is no English word of that shape. That
 * catches MTN, KFC, DSTV, BMW, ADT, SPCA, PPE, CV, NGO, HGV, PDP and every
 * other one nobody thought to write down, which matters because this runs
 * on employer names typed by real people and a list would always be one
 * South African company short.
 *
 * The cost is the handful of vowel-carrying acronyms above, and the
 * genuine brands that read better title-cased anyway: ABSA rebranded to
 * Absa, SPAR reads fine as Spar. Getting those "wrong" is a rounding
 * error next to putting "Kfc" on somebody's CV.
 */
function isAcronym(bare: string): boolean {
  const upper = bare.toUpperCase();
  if (KEEP_AS_TYPED.has(upper)) return true;
  return upper.length >= 2 && upper.length <= 5 && /^[A-Z0-9]+$/.test(upper) && !/[AEIOUY]/.test(upper);
}

/**
 * Title case for a name, a job title, a company or a place.
 *
 * The handoff: "A CV typed entirely in capitals comes out properly cased.
 * A CV typed entirely in lowercase comes out properly cased." Both of
 * those are extremely common on this product -- a phone keyboard with caps
 * lock stuck on, or somebody who never uses the shift key at all.
 *
 * A string that is already mixed case is LEFT ALONE. That is the important
 * half of the rule. If someone typed "MTN SA" or "iStore" or "McDonald's",
 * they meant it, and re-casing it would be us changing their words. Only
 * all-caps and all-lowercase input gets touched, because in those two
 * cases the casing carries no information and cannot be wrong to replace.
 */
export function titleCase(input: string | null | undefined): string {
  const text = cleanText(input);
  if (!text) return "";

  const hasLower = /[a-z]/.test(text);
  const hasUpper = /[A-Z]/.test(text);
  // Mixed case is a deliberate choice. Leave it exactly as typed.
  if (hasLower && hasUpper) return text;

  return text
    .split(/(\s+)/)
    .map((token, i) => {
      if (/^\s+$/.test(token)) return token;

      const bare = token.replace(/[^A-Za-z0-9']/g, "");
      if (bare.length > 1 && isAcronym(bare)) {
        return token.replace(bare, bare.toUpperCase());
      }

      const lower = token.toLowerCase();
      // i is the index into the split array, so the first WORD is index 0
      // and every later word sits at an even index after a space token.
      if (i > 0 && LOWERCASE_PARTICLES.has(lower.replace(/[^a-z]/g, ""))) return lower;

      // Capitalise after a hyphen and after an apostrophe too, so
      // "o'brien" becomes "O'Brien" and "kwa-zulu" becomes "Kwa-Zulu".
      return lower.replace(/(^|[-'/])([a-z])/g, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
    })
    .join("");
}

/**
 * A bullet: starts with a capital, carries no full stop unless it is a
 * full sentence. The handoff's rule, and "consistent across every bullet
 * on the page" is the point -- a mixed page reads as careless even when
 * every individual line is fine.
 *
 * "Is it a full sentence" is decided by whether the text contains sentence
 * punctuation of its own before the end. One clause with no internal stop
 * is a fragment and gets no full stop; two sentences keep theirs, because
 * stripping the last one would run them together when read aloud.
 */
export function formatBullet(input: string | null | undefined): string {
  let text = cleanText(input).replace(STRAY_BULLETS, "");
  if (!text) return "";

  text = text.charAt(0).toUpperCase() + text.slice(1);

  // A trailing stop is dropped only on a single-clause fragment. A question
  // mark or exclamation mark is never touched: those carry meaning.
  const withoutTrailingStop = text.replace(/\.+$/, "");
  const hasInternalSentenceEnd = /[.!?]\s+\S/.test(withoutTrailingStop);
  if (!hasInternalSentenceEnd) return withoutTrailingStop;

  return text.endsWith(".") ? text : `${text}.`;
}

/**
 * Split a description into bullet lines. People type one of three things
 * into that box: a single sentence, several sentences, or a list they
 * already bulleted themselves. All three become clean separate lines.
 */
export function toBullets(input: string | null | undefined): string[] {
  const text = cleanText(input);
  if (!text) return [];

  // An explicit list wins: newlines, or a bullet glyph used mid-string.
  const explicit = text
    .split(/\n+|(?=[•·▪◦‣⁃]\s)/)
    .map((l) => formatBullet(l))
    .filter(Boolean);
  if (explicit.length > 1) return explicit;

  // Otherwise split on sentence ends.
  //
  // Deliberately NOT requiring a capital after the break. Requiring one
  // looks safer and silently fails the exact person this product is for:
  // somebody who never uses the shift key types "sold contracts and
  // airtime. helped customers", and a capital-gated split leaves that as
  // one bullet with a lowercase sentence sitting in the middle of it.
  // Found by rendering it rather than by reading the regex.
  const pieces = text.split(/(?<=[.!?])\s+/);

  // The cost of splitting on every stop is abbreviations: "e.g.", "Ltd.",
  // "No.". Those produce a very short fragment, so anything under a few
  // characters is glued back onto the piece before it rather than
  // becoming a bullet of its own.
  const merged: string[] = [];
  for (const piece of pieces) {
    if (merged.length > 0 && piece.trim().length < 12) {
      merged[merged.length - 1] = `${merged[merged.length - 1]} ${piece}`;
    } else {
      merged.push(piece);
    }
  }

  const sentences = merged.map((s) => formatBullet(s)).filter(Boolean);
  return sentences.length > 0 ? sentences : [formatBullet(text)];
}

// ---------------------------------------------------------------
// Dates
// ---------------------------------------------------------------

const MONTH_NAMES: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

/**
 * Normalise however a date was typed to MM/YYYY.
 *
 * The handoff names the four forms that must render identically: "Jan
 * 2019", "2019/01", "01-2019" and "January 2019". A bare year is also
 * extremely common on this product, because the builder's own work history
 * step asks for "Year started, e.g. 2021" and nothing more. A bare year
 * renders as the year alone rather than inventing 01 for the month: an
 * invented month is a fabricated fact, which is the one thing this product
 * does not do, and "2019" on a CV reads perfectly well.
 *
 * Anything genuinely unparseable comes back cleaned but otherwise as
 * typed. Never blank: a person's dates are theirs, and silently dropping
 * one is worse than showing an odd-looking one.
 */
export function formatMonthYear(input: string | null | undefined): string {
  const text = cleanText(input);
  if (!text) return "";

  // A month name in any position: "Jan 2019", "January 2019", "2019 Jan".
  const named = text.match(/([A-Za-z]{3,9})/);
  const yearMatch = text.match(/\b(19|20)\d{2}\b/);
  if (named && yearMatch) {
    const month = MONTH_NAMES[named[1].toLowerCase()];
    if (month) return `${String(month).padStart(2, "0")}/${yearMatch[0]}`;
  }

  // Two numbers separated by anything: work out which one is the year by
  // its size, so 2019/01 and 01-2019 both land in the same place.
  const pair = text.match(/\b(\d{1,4})\s*[/\-.\s]\s*(\d{1,4})\b/);
  if (pair) {
    const a = Number(pair[1]);
    const b = Number(pair[2]);
    const [month, year] = a > 12 ? [b, a] : [a, b];
    if (year >= 1900 && year <= 2100 && month >= 1 && month <= 12) {
      return `${String(month).padStart(2, "0")}/${year}`;
    }
  }

  // A bare year, the commonest case of all here.
  if (yearMatch && /^\D*\d{4}\D*$/.test(text)) return yearMatch[0];

  return text;
}

/** "MM/YYYY to MM/YYYY", or "MM/YYYY to present" for a current job. */
export function formatDateRange(
  start: string | null | undefined,
  end: string | null | undefined,
  current: boolean,
): string {
  const from = formatMonthYear(start);
  const to = current ? "present" : formatMonthYear(end);
  if (!from && !to) return "";
  if (!from) return to;
  if (!to) return from;
  return `${from} to ${to}`;
}

// ---------------------------------------------------------------
// Contact details
// ---------------------------------------------------------------

/**
 * One standard South African format regardless of how it was typed,
 * including a pasted +27 form: 082 555 0134.
 *
 * A number that is not a recognisable SA mobile or landline comes back
 * cleaned but as typed. Somebody working abroad, or a number with an
 * extension on it, must not have their only contact detail mangled.
 */
export function formatPhone(input: string | null | undefined): string {
  const text = cleanText(input);
  if (!text) return "";

  const digits = text.replace(/\D/g, "");

  // +27 or 0027 followed by nine digits: drop the country code, restore
  // the national leading zero.
  let national: string | null = null;
  if (digits.length === 11 && digits.startsWith("27")) national = `0${digits.slice(2)}`;
  else if (digits.length === 13 && digits.startsWith("0027")) national = `0${digits.slice(4)}`;
  else if (digits.length === 10 && digits.startsWith("0")) national = digits;
  else if (digits.length === 9 && !digits.startsWith("0")) national = `0${digits}`;

  if (!national) return text;

  return `${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
}

/** Email renders lowercase. */
export function formatEmail(input: string | null | undefined): string {
  return cleanText(input).toLowerCase();
}

/**
 * The download filename: Firstname-Surname-CV. Never a database id, which
 * is what an employer used to receive in their inbox.
 *
 * Falls back to "My-CV" rather than to the id when there is no name yet,
 * because an id in a filename is exactly the failure this replaces.
 */
export function cvFilenameBase(fullName: string | null | undefined): string {
  const cleaned = titleCase(fullName)
    .replace(/[^A-Za-z0-9 '-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return cleaned ? `${cleaned}-CV` : "My-CV";
}
