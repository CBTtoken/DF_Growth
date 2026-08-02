import type { Block, Opener, RichText } from "./types";

// Reading a copy pack: a whole edition's words, as the editor writes them.
//
// Dewald, 2 August 2026: "see below is typically how we get the article and
// hand it to the co-editor for placing, it should be more clever reading
// this."
//
// The important decision here is that no model reads this file.
//
// The pack is already structured. It marks its own headlines, standfirsts,
// kickers, pillars, tips and pull quotes, and it puts its fact grids in
// tables. That is a format, not prose to be interpreted, so it is parsed.
// A parser is exact, instant and free, and above all it cannot paraphrase.
// Hand thirty pages of somebody's finished writing to a model to "structure"
// and it will occasionally improve a sentence, and neither of us will notice
// until it is printed. The model's judgement is spent later, on placing and
// fitting, where there is a genuine decision to make.
//
// Nothing here rewrites a word. The only characters removed are the label
// itself and the whitespace around what follows it.
//
// MOXIE-SHAPED FOR NOW. Dewald: "this is just Moxie and I am sure external
// users will be different, so make a note we can fix it now for Moxie but
// need to circle back later before it becomes a product." Hence LABELS
// below: the vocabulary is data, so a second publication is a second table
// rather than a second parser. What is still Moxie-specific is the
// assumption of markdown with bold labels, and that is the thing to
// generalise when a second magazine arrives.

export type PackLabels = {
  pillar: string;
  section: string;
  kicker: string;
  headline: string;
  standfirst: string;
  tip: string;
  pullquote: string;
  cta: string;
  /** Prefixes whose lines are guidance for the publisher, never content. */
  notes: string[];
};

export const MOXIE_LABELS: PackLabels = {
  pillar: "PILLAR",
  section: "SECTION",
  kicker: "KICKER",
  headline: "HEADLINE",
  standfirst: "STANDFIRST",
  tip: "MOXIE TIP",
  pullquote: "PULL QUOTE",
  cta: "CTA",
  notes: ["DEVICE", "DESIGN NOTE", "LAYOUT NOTE", "IMAGE NOTE", "NOTE"],
};

export type ParsedArticle = {
  /** "03" or "05-12", exactly as the pack wrote it. */
  pageRange: string;
  /** The heading after the page range, e.g. "EDITOR'S LETTER". */
  heading: string;
  pillar?: string;
  section?: string;
  opener: Opener;
  blocks: Block[];
  /**
   * Layout guidance and editorial notes, kept out of the article and shown
   * to the publisher instead. A DEVICE line is an instruction to a human
   * about how a page should look, and putting it on the page as text would
   * be the single most embarrassing possible bug.
   */
  notes: string[];
  /** Anything the parser could not place, so nothing disappears silently. */
  unplaced: string[];
};

export type ParsedPack = {
  articles: ParsedArticle[];
  /** Lines before the first article: the flatplan table, status, and so on. */
  preamble: string[];
  warnings: string[];
};

const text = (value: string): RichText => ({ text: value });

/** Strips a bold markdown label off the front of a line, if it is there. */
function afterLabel(line: string, label: string): string | null {
  const withDot = new RegExp(`^\\*\\*${label}\\*\\*\\s*[·:]?\\s*`, "i");
  if (!withDot.test(line)) return null;
  return line.replace(withDot, "").trim();
}

/** True for a line that is only a bold, all-capitals label. */
function isBareLabel(line: string): boolean {
  return /^\*\*[A-Z0-9][A-Z0-9 &/'’,.-]*\*\*$/.test(line.trim());
}

function labelOf(line: string): string {
  return line.trim().replace(/^\*\*|\*\*$/g, "");
}

/**
 * Turns a markdown table into a stat block.
 *
 * The pack writes fact grids as a bold header row and one row of prose
 * beneath it, which is exactly a figure and its label. A table that does not
 * have that shape is left alone and reported rather than forced into a
 * block that would misrepresent it.
 */
function tableToStats(rows: string[]): Block | null {
  const cells = (row: string) =>
    row
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim());

  const body = rows.filter((r) => !/^\|[\s:-]+\|/.test(r));
  if (body.length < 2) return null;

  const figures = cells(body[0]).map((c) => c.replace(/\*\*/g, "").trim());
  const labels = cells(body[1]);
  if (figures.length !== labels.length || figures.length === 0) return null;
  if (!figures.some((f) => f.length > 0)) return null;

  return {
    type: "stats",
    cells: figures.map((figure, i) => ({ figure, label: labels[i] ?? "" })),
  };
}

/**
 * Reads a whole copy pack.
 *
 * Greedy and line based, because the format is line based. An article starts
 * at a top-level heading naming a page or a page range; everything until the
 * next one belongs to it.
 */
export function parseCopyPack(source: string, labels: PackLabels = MOXIE_LABELS): ParsedPack {
  const lines = source.replace(/\r\n/g, "\n").split("\n");

  const articles: ParsedArticle[] = [];
  const preamble: string[] = [];
  const warnings: string[] = [];

  let current: ParsedArticle | null = null;
  // Paragraph lines waiting to be flushed as one block.
  let buffer: string[] = [];
  let tableRows: string[] = [];
  // Set when a bare label such as **MOXIE TIP** has just been seen and the
  // next paragraph belongs to it rather than to the body.
  let pending: "tip" | null = null;

  const flushParagraph = () => {
    if (!buffer.length) return;
    const joined = buffer.join("\n").trim();
    buffer = [];
    if (!joined || !current) return;

    if (pending === "tip") {
      current.blocks.push({ type: "tip", content: text(joined) });
      pending = null;
      return;
    }
    current.blocks.push({ type: "p", content: text(joined) });
  };

  const flushTable = () => {
    if (!tableRows.length) return;
    const rows = tableRows;
    tableRows = [];
    if (!current) return;

    const block = tableToStats(rows);
    if (block) current.blocks.push(block);
    else current.unplaced.push(rows.join("\n"));
  };

  const flushAll = () => {
    flushParagraph();
    flushTable();
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    // A table accumulates until something that is not a table row.
    if (trimmed.startsWith("|")) {
      flushParagraph();
      tableRows.push(trimmed);
      continue;
    }
    if (tableRows.length) flushTable();

    // An article heading: "# PAGE 03 · EDITOR'S LETTER".
    const heading = trimmed.match(/^#\s+PAGES?\s+([0-9-]+)\s*·\s*(.+)$/i);
    if (heading) {
      flushAll();
      current = {
        pageRange: heading[1],
        heading: heading[2].trim(),
        opener: { headline: "" },
        blocks: [],
        notes: [],
        unplaced: [],
      };
      articles.push(current);
      continue;
    }

    if (!current) {
      if (trimmed) preamble.push(trimmed);
      continue;
    }

    // A page inside a spread: "## PAGE 06 · WHY A THURSDAY". The page number
    // is dropped, because page numbers are derived from the flatplan and a
    // number typed into a heading is exactly the thing this build exists to
    // stop. The words become a subheading.
    const inner = trimmed.match(/^#{2,3}\s+PAGES?\s+[0-9-]+\s*·\s*(.+)$/i);
    if (inner) {
      flushAll();
      const title = inner[1].trim();
      // "OPENER" names the layout rather than the section, so it is not a
      // subheading anybody should read.
      if (!/^opener$/i.test(title)) {
        current.blocks.push({ type: "subhead", text: title });
      }
      continue;
    }

    // "### FOUR-COLUMN FACT GRID" labels the table that follows it.
    if (/^#{2,4}\s/.test(trimmed)) {
      flushAll();
      continue;
    }

    // Guidance for the publisher, never content.
    const note = labels.notes.find((n) =>
      new RegExp(`^>?\\s*\\*\\*${n}\\b`, "i").test(trimmed)
    );
    if (note) {
      flushAll();
      current.notes.push(trimmed.replace(/^>\s*/, "").replace(/\*\*/g, ""));
      continue;
    }

    // Rules and word counts carry no content.
    if (/^-{3,}$/.test(trimmed) || /^\*\*\d+\s+words\.?\*\*$/i.test(trimmed)) {
      flushAll();
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      continue;
    }

    // The labelled fields. Pillar and section share one line in this pack.
    const pillar = afterLabel(trimmed, labels.pillar);
    if (pillar !== null) {
      flushAll();
      const both = pillar.match(new RegExp(`^(.*?)\\s*\\*\\*${labels.section}\\*\\*\\s*·?\\s*(.*)$`, "i"));
      if (both) {
        current.pillar = both[1].replace(/·/g, "").trim();
        current.section = both[2].trim();
      } else {
        current.pillar = pillar.replace(/·/g, "").trim();
      }
      continue;
    }

    const section = afterLabel(trimmed, labels.section);
    if (section !== null) {
      flushAll();
      current.section = section;
      continue;
    }

    const kicker = afterLabel(trimmed, labels.kicker);
    if (kicker !== null) {
      flushAll();
      current.opener.kicker = kicker;
      continue;
    }

    const headline = afterLabel(trimmed, labels.headline);
    if (headline !== null) {
      flushAll();
      current.opener.headline = headline;
      continue;
    }

    const standfirst = afterLabel(trimmed, labels.standfirst);
    if (standfirst !== null) {
      flushAll();
      current.opener.standfirst = text(standfirst);
      continue;
    }

    const quote = afterLabel(trimmed, labels.pullquote);
    if (quote !== null) {
      flushAll();
      current.blocks.push({ type: "pullquote", content: text(quote), tone: "orange" });
      continue;
    }

    const cta = afterLabel(trimmed, labels.cta);
    if (cta !== null) {
      flushAll();
      // No CTA block exists, so it lands as a paragraph and is reported.
      // Better a visible paragraph the publisher can restyle than a silently
      // invented block type.
      current.blocks.push({ type: "p", content: text(cta) });
      current.notes.push(`Call to action, placed as a paragraph: ${cta}`);
      continue;
    }

    // A bare bold label on its own line. **MOXIE TIP** takes the paragraph
    // after it; anything else in capitals is a subheading.
    if (isBareLabel(trimmed)) {
      flushAll();
      const name = labelOf(trimmed);
      if (name.toUpperCase() === labels.tip.toUpperCase()) {
        pending = "tip";
      } else {
        current.blocks.push({ type: "subhead", text: name });
      }
      continue;
    }

    // The headline continues on a second line, bolded, with no label.
    if (
      /^\*\*.+\*\*$/.test(trimmed) &&
      current.opener.headline &&
      !current.blocks.length &&
      !current.opener.standfirst
    ) {
      current.opener.headlineTurn = trimmed.replace(/^\*\*|\*\*$/g, "");
      continue;
    }

    buffer.push(line);
  }

  flushAll();

  articles.forEach((article) => {
    if (!article.opener.headline) {
      warnings.push(`"${article.heading}" has no headline in the pack.`);
    }
    if (article.blocks.length === 0) {
      warnings.push(`"${article.heading}" produced no body text. Check its formatting.`);
    }
    article.unplaced.forEach(() =>
      warnings.push(`"${article.heading}" has a table the parser could not read. It is unplaced.`)
    );
  });

  return { articles, preamble, warnings };
}
