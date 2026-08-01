import type { Block, Opener, RenderedPage, SectionLabelBar } from "./types";
import type { LayoutKey } from "./publication";

// Where an article breaks across pages.
//
// This is the piece the whole build promises something about, so it is
// worth being precise about what it does and does not do.
//
// It does not measure anything. It takes heights that were measured once,
// in the browser, at the article's real size, and decides where the breaks
// fall. That split matters: measuring is the part that depends on fonts,
// the browser and the machine, and deciding is the part that has to be the
// same forever. Keeping the decision pure means it can be replayed, tested
// and reasoned about without a browser anywhere near it.
//
// The result is stored with the article when it is approved and replayed by
// the renderer from then on. Nothing recomputes a break at render time, so
// nothing can quietly disagree with the contents page about how long an
// article is.

/** A block and how tall it measured, in millimetres. */
export type Measured = {
  block: Block;
  heightMm: number;
  /**
   * True for a picture that text wraps around.
   *
   * It changes how the height counts, and getting this wrong is what put a
   * quarter of a page of white space under Dewald's reader submissions
   * page. A floated picture is out of the normal flow: the paragraphs after
   * it run up its side and occupy the same vertical space. Measured
   * separately and added together, the page looks full when half of it is
   * empty, and everything after gets pushed to the next page.
   */
  floats?: boolean;
};

export type PaginateInput = {
  head: SectionLabelBar;
  layout: LayoutKey;
  opener: Opener;
  /** How tall the opener block came out, masthead and standfirst together. */
  openerHeightMm: number;
  blocks: Measured[];
  /** The live area of a page, between the label bar and the footer. */
  liveHeightMm: number;
  /** The copyfitting squeeze, stamped onto every page produced. */
  tighten?: number;
};

export type PaginateResult = {
  pages: RenderedPage[];
  /** Anything the publisher should see before approving. */
  problems: string[];
};

/**
 * Blocks that must not be left at the foot of a page on their own.
 *
 * A subheading separated from the text it introduces is the seventh
 * acceptance criterion, and it is the single most common way an otherwise
 * fine page looks wrong. A writer credit and a Moxie Tip belong with what
 * they close, for the same reason.
 */
function mustStayWithNext(block: Block): boolean {
  return block.type === "subhead";
}

/**
 * Splits an article into pages.
 *
 * Greedy and block level. Paragraphs are never split across a page break,
 * which the reference states as an absolute rule and which is also what
 * makes this tractable: the unit of layout is a whole block, so there is no
 * partial line to reason about.
 *
 * The first page is shorter than the rest because the opener sits on it.
 */
export function paginate(input: PaginateInput): PaginateResult {
  const problems: string[] = [];
  const pages: RenderedPage[] = [];

  const firstPageHeight = input.liveHeightMm - input.openerHeightMm;
  if (firstPageHeight <= 0) {
    problems.push(
      "The masthead and standfirst fill the whole first page on their own. Shorten the standfirst or use a shorter hero."
    );
  }

  let current: Block[] = [];
  let used = 0;
  let available = Math.max(firstPageHeight, 0);
  let isFirst = true;

  // How much of each page ended up empty, kept so the white space rule can
  // be checked once at the end rather than guessed at while filling.
  const leftover: number[] = [];

  const closePage = () => {
    // A picture hanging below the last line of text beside it is space the
    // page really used, so the page is as full as whichever reached lowest.
    // Without this the gap looks bigger than it is and the co-publisher
    // chases a hole that is not there.
    used = Math.max(used, floatBottom);
    floatBottom = 0;

    pages.push({
      layout: isFirst ? input.layout : "runon",
      head: input.head,
      opener: isFirst ? input.opener : undefined,
      blocks: current,
      tighten: input.tighten,
    });
    leftover.push(available - used);
    current = [];
    used = 0;
    available = input.liveHeightMm;
    isFirst = false;
  };

  // Where the bottom of a floated picture sits on this page.
  //
  // A picture the text wraps around occupies no space of its own: the
  // paragraphs beside it already account for that part of the page. But it
  // still has a bottom edge, and that edge can be lower than the text
  // running up its side.
  //
  // Tracked as a position rather than as a debt to be paid off. The debt
  // version was wrong in a way that mattered: it left the picture's real
  // extent out of the "will the next block fit" test, so a page could be
  // filled past its own height and the text ran off the bottom of it. A
  // page is full when either the text or the picture reaches the end,
  // whichever happens first.
  let floatBottom = 0;

  for (let i = 0; i < input.blocks.length; i++) {
    const { block, heightMm, floats } = input.blocks[i];

    if (floats) {
      // A picture has to fit on the page it starts on, even when the text
      // beside it would have fitted. Placing it regardless is what put a
      // picture's bottom edge below the foot of the page and pushed the
      // text off with it.
      if (used + heightMm > available && current.length > 0) {
        closePage();
      }

      if (heightMm > input.liveHeightMm) {
        problems.push(
          "A picture the text wraps around is taller than a whole page. Make it narrower, or turn the wrapping off so it can have a page of its own."
        );
      }

      // Costs the page no flow height of its own, but its bottom edge is
      // remembered so nothing gets placed past it by accident.
      current.push(block);
      floatBottom = Math.max(floatBottom, used + heightMm);
      continue;
    }

    // A block taller than a whole page cannot be placed anywhere. It gets
    // its own page and a warning rather than being silently clipped, which
    // is what the old process did by hand and what this build exists to
    // stop.
    if (heightMm > input.liveHeightMm) {
      if (current.length) closePage();
      problems.push(
        `One ${describe(block)} is taller than a page on its own and will overflow. Split it or make the image smaller.`
      );
      current = [block];
      closePage();
      continue;
    }

    // A subheading is measured together with whatever follows it, so the
    // pair moves as one and a heading can never be stranded.
    const glued = mustStayWithNext(block) && i + 1 < input.blocks.length;
    const groupHeight = glued ? heightMm + input.blocks[i + 1].heightMm : heightMm;

    // Text keeps flowing from where the text got to, running up the side of
    // any picture rather than starting below it. So the block lands at
    // `used`. What decides whether the page is full is whichever reaches
    // the bottom first: this block's end, or the picture's bottom edge.
    //
    // Leaving the picture out of that comparison is what let text run off
    // the bottom of the page.
    // The page already has something on it if any block has been placed, or
    // if this is the first page and the masthead is sitting on it.
    //
    // That second half matters and was missing. A subheading glued to a long
    // paragraph, arriving first on a page whose top half is taken by the
    // masthead, was placed regardless because no block had been placed yet,
    // and the pair ran off the bottom. An opener is content.
    const pageHasSomething = current.length > 0 || (isFirst && input.openerHeightMm > 0);

    if (Math.max(used + groupHeight, floatBottom) > available && pageHasSomething) {
      closePage();
    }

    current.push(block);
    used += heightMm;

    if (glued) {
      const next = input.blocks[i + 1];
      current.push(next.block);
      used += next.heightMm;
      i++;
    }
  }


  if (current.length || pages.length === 0) closePage();

  // A page with a lot of nothing at the bottom is a layout problem, and the
  // reference puts a number on it: no white space gap larger than 20mm.
  //
  // Checked only on pages that are not the last one. An article ending
  // halfway down its final page is completely normal, and warning about it
  // would make the warning worthless.
  leftover.forEach((gap, i) => {
    if (i === leftover.length - 1) return;
    if (gap > 20) {
      problems.push(
        `Page ${i + 1} of this article ends ${Math.round(gap)}mm short. A block that did not fit was pushed over. Shorten something above it, or make an image smaller.`
      );
    }
  });

  return { pages, problems };
}

function describe(block: Block): string {
  switch (block.type) {
    case "figure":
      return "image";
    case "pullquote":
      return "pull quote";
    case "stats":
      return "stat block";
    case "facts":
      return "fact grid";
    case "tip":
      return "Moxie Tip";
    case "rows":
      return "list";
    case "writer":
      return "writer credit";
    default:
      return "block";
  }
}

/**
 * The live area of a page in millimetres.
 *
 * A4 is 297mm tall. Off that come the 4mm orange rule, the 6mm section
 * label bar and the 10mm footer, all of which are page furniture rather
 * than content, plus the 2mm the body sits below the label bar's hairline.
 *
 * Derived here rather than typed as a number, so that changing the footer
 * height in settings moves the pagination with it instead of leaving every
 * article one line too long.
 */
/**
 * A few millimetres held back from the bottom of every page.
 *
 * The measuring column and the finished page are the same components at the
 * same width, but they are not the same layout: a paragraph measured while
 * text wrapped around a picture can be a line taller or shorter once that
 * picture is on a different page, and hyphenation and sub-pixel rounding
 * add their own fractions.
 *
 * Those differences are small and they only matter in one direction. A page
 * a few millimetres emptier than it could be is invisible. A page a few
 * millimetres too full slides its last line under the footer, which is what
 * Dewald kept seeing. So the arithmetic keeps a little back.
 */
const SAFETY_MM = 4;

export function liveHeightMm(chrome: {
  pageHeightMm?: number;
  topRuleMm?: number;
  labelBarMm?: number;
  footerMm?: number;
  bodyTopMm?: number;
}): number {
  const pageHeight = chrome.pageHeightMm ?? 297;
  const topRule = chrome.topRuleMm ?? 4;
  const labelBar = chrome.labelBarMm ?? 6;
  const footer = chrome.footerMm ?? 10;
  const bodyTop = chrome.bodyTopMm ?? 2;
  return pageHeight - topRule - labelBar - footer - bodyTop - SAFETY_MM;
}
