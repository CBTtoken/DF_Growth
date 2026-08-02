import type { Block, Mark, Opener, RichText } from "./types";

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
  /**
   * True when this looks like a slot in the flatplan rather than a written
   * article.
   *
   * Dewald, 2 August 2026: "it also added the ones with no content?" It did.
   * Edition 03 holds three placeholders, and what they contain is not the
   * article but a note about it: "Held by Dewald. Safari Moment entries from
   * the July campaign." Written prose, so no word count or block count
   * separates it from real copy.
   *
   * A missing headline does. Every written article in the pack has one and
   * none of the three placeholders does, which makes sense: a piece nobody
   * has written cannot have a headline yet. The importer uses this to leave
   * them unticked rather than to hide them, because the judgement is the
   * publisher's and the pack may simply have been formatted oddly.
   */
  looksUnwritten: boolean;
};

export type ParsedPack = {
  articles: ParsedArticle[];
  /** Lines before the first article: the flatplan table, status, and so on. */
  preamble: string[];
  warnings: string[];
};

/**
 * Markdown emphasis becomes real emphasis, not asterisks on the page.
 *
 * Dewald, 2 August 2026: "it adds all the formatting markdowns, instead of
 * making them proper." He was right, and the fix was sitting in the build
 * already. Emphasis is stored as character offsets beside the string, so
 * bold in a pack becomes a bold mark and the asterisks simply stop existing.
 *
 * This is not a rewrite of anybody's words. Asterisks are markup, not
 * language: removing them is the same act as not printing the angle brackets
 * around an HTML tag. Every actual character of the sentence survives, which
 * is what scripts/check-pack.mjs verifies.
 *
 * Nesting is not supported and is not worth supporting. A pack that bolds
 * something inside an italic run degrades to the outer emphasis rather than
 * throwing an error, which is the right failure for a tool nobody should
 * have to debug.
 */
export function richFromMarkdown(source: string): RichText {
  const marks: Mark[] = [];
  let out = "";
  let i = 0;

  while (i < source.length) {
    if (source.startsWith("**", i)) {
      const close = source.indexOf("**", i + 2);
      if (close > i + 2) {
        const inner = source.slice(i + 2, close);
        marks.push({ start: out.length, end: out.length + inner.length, kind: "bold" });
        out += inner;
        i = close + 2;
        continue;
      }
    }

    // A single asterisk, but never one that is part of an unmatched pair or
    // sitting alone in a sentence, which is usually a footnote marker.
    if (source[i] === "*") {
      const close = source.indexOf("*", i + 1);
      if (close > i + 1 && !source.startsWith("**", close)) {
        const inner = source.slice(i + 1, close);
        marks.push({ start: out.length, end: out.length + inner.length, kind: "italic" });
        out += inner;
        i = close + 1;
        continue;
      }
    }

    out += source[i];
    i++;
  }

  return marks.length ? { text: out, marks } : { text: out };
}

const text = (value: string): RichText => richFromMarkdown(value);

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
  let rowsBuffer: { tag: string; title: string }[] = [];
  // A heading waiting to find out whether it labels a table or introduces
  // text. See the heading branch below.
  let pendingHeading: string | null = null;
  let listBuffer: string[] = [];
  // Set when a bare label such as **MOXIE TIP** has just been seen and the
  // next paragraph belongs to it rather than to the body.
  let pending: "tip" | null = null;

  // Every block goes through here, so a heading that turned out to
  // introduce text is emitted immediately before whatever it introduces.
  const pushBlock = (block: Block) => {
    if (!current) return;
    if (pendingHeading) {
      // Pushed straight onto the list, not back through pushBlock, which
      // would call itself forever.
      const heading = pendingHeading;
      pendingHeading = null;
      current.blocks.push({ type: "subhead", text: heading });
    }
    current.blocks.push(block);
  };

  const flushList = () => {
    if (!listBuffer.length) return;
    const items = listBuffer;
    listBuffer = [];
    pushBlock({ type: "list", items: items.map((i) => text(i)) });
  };

  const flushParagraph = () => {
    if (!buffer.length) return;
    const joined = buffer.join("\n").trim();
    buffer = [];
    if (!joined || !current) return;

    if (pending === "tip") {
      pushBlock({ type: "tip", content: text(joined) });
      pending = null;
      return;
    }
    pushBlock({ type: "p", content: text(joined) });
  };

  const flushTable = () => {
    if (!tableRows.length) return;
    const rows = tableRows;
    tableRows = [];
    if (!current) return;

    const block = tableToStats(rows);
    if (block) pushBlock(block);
    else current.unplaced.push(rows.join("\n"));
  };

  const flushRows = () => {
    if (!rowsBuffer.length) return;
    const rows = rowsBuffer;
    rowsBuffer = [];
    pushBlock({ type: "rows", rows });
  };

  const flushAll = () => {
    flushParagraph();
    flushList();
    flushRows();
    flushTable();
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    // A table accumulates until something that is not a table row.
    if (trimmed.startsWith("|")) {
      flushParagraph();
      flushList();
      // A heading immediately above a table was labelling it, like
      // "FOUR-COLUMN FACT GRID". The grid says what it is; the label is
      // instruction, not content.
      pendingHeading = null;
      tableRows.push(trimmed);
      continue;
    }
    if (tableRows.length) flushTable();

    // A bullet list. The recipe card is thirty-five of these, and they used
    // to arrive as prose with dashes in front of it.
    const bullet = trimmed.match(/^[-*+]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      listBuffer.push(bullet[1].trim());
      continue;
    }
    if (listBuffer.length && trimmed) flushList();

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
        looksUnwritten: false,
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
        pushBlock({ type: "subhead", text: title });
      }
      continue;
    }

    // Any other heading.
    //
    // These used to be thrown away, on the theory that they only ever
    // labelled a table. Dewald, 2 August 2026: "the recipe section, I see we
    // skipped that part." Quite so. A recipe card is nothing but headings:
    // "VETKOEK", "Makes 12 · Preparation 20 minutes", "FOR THE DOUGH", "FOR
    // THE CURRIED MINCE", "METHOD". Dropping them turned a recipe into an
    // unlabelled wall of ingredients.
    //
    // So a heading is a subheading, unless the next thing is a table, in
    // which case it was labelling the table and the table speaks for itself.
    // Held rather than emitted, because whether it is a label is not known
    // until the following line arrives.
    const other = trimmed.match(/^#{1,6}\s+(.+)$/);
    if (other) {
      flushAll();
      // Stripped of markup: a subheading is a plain string, so it cannot
      // carry marks and must not carry asterisks either. The fidelity
      // check caught three of these leaking through as "**30**".
      pendingHeading = richFromMarkdown(other[1].trim()).text;
      continue;
    }

    // Anything in a blockquote is guidance for the publisher, never content.
    //
    // This started as a list of known prefixes: DEVICE, DESIGN NOTE, LAYOUT
    // NOTE. Dewald's Edition 03 has sixteen different ones, including CHECK
    // BEFORE PRINT, FACT CHECK OUTSTANDING, CUT FROM THE ORIGINAL LIST and
    // ASSETS SUPPLIED, and the ones my list did not know were printed into
    // his articles as body text. A list of labels was always going to lose
    // that race. The markdown already says what these are, so the blockquote
    // itself is the rule and no vocabulary has to be kept in step.
    //
    // A pull quote inside a blockquote is the one exception, because there
    // it is being quoted rather than noted.
    if (trimmed.startsWith(">")) {
      const inner = trimmed.replace(/^>\s*/, "");
      const quoted = afterLabel(inner, labels.pullquote);
      if (quoted !== null && quoted.length > 0) {
        flushAll();
        pushBlock({ type: "pullquote", content: text(quoted), tone: "orange" });
        continue;
      }
      flushAll();
      if (inner) current.notes.push(inner.replace(/\*\*/g, ""));
      continue;
    }

    // The same guidance, unquoted.
    const note = labels.notes.find((n) => new RegExp(`^\\*\\*${n}\\b`, "i").test(trimmed));
    if (note) {
      flushAll();
      current.notes.push(trimmed.replace(/\*\*/g, ""));
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
      pushBlock({ type: "pullquote", content: text(quote), tone: "orange" });
      continue;
    }

    const cta = afterLabel(trimmed, labels.cta);
    if (cta !== null) {
      flushAll();
      // No CTA block exists, so it lands as a paragraph and is reported.
      // Better a visible paragraph the publisher can restyle than a silently
      // invented block type.
      pushBlock({ type: "p", content: text(cta) });
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
        pushBlock({ type: "subhead", text: name });
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

    // A numbered or tagged entry: "**01** · What did the house smell like?"
    //
    // Dewald's Ten Questions page is ten of these in a row, and they arrived
    // as ten paragraphs with literal asterisks in them. They are a rows
    // block, which is exactly a tag beside a line, and consecutive ones
    // belong to the same block.
    //
    // The tag is deliberately narrow: digits, or a short run of capitals. A
    // wider rule swallowed "**facebook.com/moxiemag** · **editor@moxiemag
    // .co.za**", which is a contact line and not a list at all.
    const row = trimmed.match(/^\*\*(\d{1,3}|[A-Z]{1,12})\*\*\s*·\s*(.+)$/);
    if (row) {
      flushParagraph();
      rowsBuffer.push({ tag: row[1], title: row[2].trim() });
      continue;
    }
    if (rowsBuffer.length) flushRows();

    buffer.push(line);
  }

  flushAll();

  articles.forEach((article) => {
    if (!article.opener.headline) {
      article.looksUnwritten = true;
      warnings.push(
        `"${article.heading}" has no headline, so it looks like a slot rather than a written article. Left unticked.`
      );
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
