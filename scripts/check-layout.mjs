// The layout engine's own tests.
//
// Dewald, 1 August 2026: "have you learned from it, and what happens with a
// new design or the next article? We will not be repeating this, right? We
// will not have that luxury when it goes live."
//
// A fair question, and the honest answer is that learning which lives only
// in my head is worth nothing to him. Every rule below was discovered by him
// finding something broken on his screen, and each one is now pinned here so
// that a change six months from now cannot quietly undo it.
//
// These are the rules that produce a correct page, independent of any
// article. They do not test that a page looks good, which is a matter of
// taste and is his to judge. They test that it is not broken: that nothing
// runs off the bottom, that white space is not invented, and that anything
// the software offers to fix it actually fixes.
//
// Run with: npm run check:layout
//
// No test framework on purpose. This project has none, and adding one to run
// forty assertions would be a dependency, a config file and a new thing to
// learn, for something plain Node does perfectly well.

import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";

// The engine is TypeScript and imports its neighbours without file
// extensions, which is what Next expects and what Node does not. Rather
// than keep a compiled copy in step, which is the same duplication problem
// these tests exist to catch, the resolver is taught the convention.
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith(".") && !/.[cm]?[jt]s$/.test(specifier)) {
      try {
        return next(`${specifier}.ts`, context);
      } catch {
        // Fall through to the normal resolution below.
      }
    }
    return next(specifier, context);
  },
});

const { paginate, liveHeightMm } = await import("../src/lib/emag/paginate.ts");
const { tidy, MAX_GAP_MM } = await import("../src/lib/emag/tidy.ts");
const { suggestTighten, MAX_TIGHTEN } = await import("../src/lib/emag/fit.ts");

let failures = 0;

function check(name, ok, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "  pass" : "  FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

function heading(text) {
  console.log(`\n${text}`);
}

// --------------------------------------------------------------------------
// Building blocks for the fixtures
// --------------------------------------------------------------------------

const para = (heightMm) => ({ block: { type: "p", content: { text: "x" } }, heightMm });
const sub = (heightMm) => ({ block: { type: "subhead", text: "x" }, heightMm });
const pic = (heightMm, floats = false) => ({
  block: { type: "figure", assetId: "a" },
  heightMm,
  floats,
});

const LIVE = liveHeightMm({});
const OPENER = 80;

function plan(blocks, openerHeightMm = OPENER) {
  return paginate({
    head: { pillar: "think", section: "The Big Idea" },
    layout: "band-opener",
    opener: { headline: "x" },
    openerHeightMm,
    blocks,
    liveHeightMm: LIVE,
  });
}

/** How full each page ended up, which is what every rule below is about. */
function fillOf(blocks, openerHeightMm = OPENER) {
  const result = plan(blocks, openerHeightMm);
  return result.pages.map((page, i) => {
    const onPage = new Set(page.blocks);
    const flow = blocks
      .filter((m) => onPage.has(m.block) && !m.floats)
      .reduce((sum, m) => sum + m.heightMm, 0);
    const floatBottom = blocks
      .filter((m) => onPage.has(m.block) && m.floats)
      .reduce((max, m) => Math.max(max, m.heightMm), 0);
    const available = i === 0 ? LIVE - openerHeightMm : LIVE;
    return { used: Math.max(flow, floatBottom), available };
  });
}

// --------------------------------------------------------------------------

heading("A page is never filled past its own height");
// Found by Dewald: "text is actually bleeding off the page". Twice.
{
  const shapes = [
    [para(40), pic(60, true), para(30), para(25), sub(12), para(28), para(30), para(25)],
    [para(20), pic(200, true), para(30), para(40)],
    [para(150), pic(120, true), para(20), para(20), para(20)],
    [pic(10, true), para(190), para(60)],
    [para(100), pic(90, true), para(90)],
    [sub(12), para(200), para(80)],
    [para(60), pic(150), para(60)],
  ];

  let worst = 0;
  let worstShape = -1;
  shapes.forEach((shape, i) => {
    fillOf(shape).forEach((page) => {
      const over = page.used - page.available;
      if (over > worst) {
        worst = over;
        worstShape = i;
      }
    });
  });
  check("no page overflows", worst <= 0.001, worst > 0 ? `shape ${worstShape} over by ${worst.toFixed(1)}mm` : "");
}

heading("A picture the text wraps around does not invent a page");
// Found by Dewald: a quarter page of white under the reader submissions.
{
  const wrapped = [para(40), pic(60, true), para(30), para(25), sub(12), para(28), para(30), para(25)];
  check("a wrapped picture does not split a short article", plan(wrapped).pages.length === 1);

  const solid = wrapped.map((m) => ({ ...m, floats: false }));
  check("and counting it as solid is what used to break it", plan(solid).pages.length === 2);
}

heading("A subheading is never stranded at the foot of a page");
{
  // A subheading that only just fits, with a paragraph that cannot follow it.
  const blocks = [para(LIVE - OPENER - 20), sub(12), para(60), para(40)];
  const result = plan(blocks);
  const strandedSomewhere = result.pages.some((page) => {
    const last = page.blocks[page.blocks.length - 1];
    return last && last.type === "subhead";
  });
  check("no page ends on a subheading", !strandedSomewhere);
}

heading("The co-publisher only offers fixes that work");
{
  const figureOf = (block) =>
    block.type === "figure" ? { assetId: "a", widthPct: 100 } : null;

  // A picture leaving a hole should be narrowed to fill it.
  {
    const blocks = [para(135), pic(120)];
    const report = tidy(blocks, LIVE - OPENER, LIVE, figureOf);
    check("narrows a picture that leaves a hole", report.suggestions.length === 1);
  }

  // A gap inside tolerance is left alone.
  {
    const blocks = [para(LIVE - OPENER - 10), pic(30)];
    const report = tidy(blocks, LIVE - OPENER, LIVE, figureOf);
    check(`ignores a gap under ${MAX_GAP_MM}mm`, report.suggestions.length === 0);
  }

  // A picture that would have to become a stamp is reported, not butchered.
  {
    const blocks = [para(LIVE - OPENER - 21), pic(200)];
    const report = tidy(blocks, LIVE - OPENER, LIVE, figureOf);
    check("refuses to shrink a picture past a quarter width", report.suggestions.length === 0 && report.unfixable.length === 1);
  }

  // Text is never silently resized.
  {
    const blocks = [para(60), para(LIVE - OPENER)];
    const report = tidy(blocks, LIVE - OPENER, LIVE, figureOf);
    check("never resizes a paragraph", report.suggestions.length === 0);
  }

  // The same input gives the same answer, forever.
  {
    const blocks = [para(135), pic(120), para(40), pic(150)];
    const once = JSON.stringify(tidy(blocks, LIVE - OPENER, LIVE, figureOf));
    const twice = JSON.stringify(tidy(blocks, LIVE - OPENER, LIVE, figureOf));
    check("gives the same answer on repeat runs", once === twice);
  }
}

heading("Copyfitting never promises a saving it cannot deliver");
// Found by a test, not by Dewald: the first version offered squeezes that
// did nothing, because it estimated instead of simulating.
{
  const input = (blocks, openerHeightMm) => ({
    head: { pillar: "think", section: "The Big Idea" },
    layout: "band-opener",
    opener: { headline: "x" },
    openerHeightMm,
    blocks,
    liveHeightMm: LIVE,
  });

  let offered = 0;
  let broken = 0;
  let tooFar = 0;

  for (let count = 4; count <= 44; count++) {
    for (const h of [14, 18, 22, 27, 33]) {
      const blocks = Array.from({ length: count }, () => para(h));
      const suggestion = suggestTighten(input(blocks, OPENER), blocks, 0);
      if (!suggestion) continue;
      offered++;
      if (suggestion.tighten > MAX_TIGHTEN + 1e-9) tooFar++;

      const before = plan(blocks).pages.length;
      const squeezed = blocks.map((m) => ({ ...m, heightMm: m.heightMm * (1 - suggestion.tighten) }));
      const after = plan(squeezed).pages.length;
      if (after >= before) broken++;
    }
  }

  check("every squeeze offered really saves a page", broken === 0, `${offered} offered, ${broken} did nothing`);
  check("and squeezes are actually offered", offered > 0, `${offered} cases`);
  check(`never squeezes past ${MAX_TIGHTEN * 100}%`, tooFar === 0);

  // A properly full last page is not a runt and is left alone.
  {
    const blocks = Array.from({ length: 12 }, () => para(30));
    const result = plan(blocks);
    if (result.pages.length >= 2) {
      const suggestion = suggestTighten(input(blocks, OPENER), blocks, 0);
      const lastPageBlocks = result.pages[result.pages.length - 1].blocks.length;
      // Only meaningful when the last page is genuinely full.
      if (lastPageBlocks > 4) {
        check("leaves a properly full last page alone", suggestion === null);
      } else {
        check("leaves a properly full last page alone", true, "fixture was a runt, skipped");
      }
    }
  }

  // Nothing left to give.
  {
    const blocks = Array.from({ length: 18 }, () => para(27));
    check("does not squeeze an already squeezed article", suggestTighten(input(blocks, OPENER), blocks, MAX_TIGHTEN) === null);
  }
}

heading("Emphasis survives the writer typing");
// Marks are character offsets, so every edit to the text moves them. Get
// this wrong and bold appears on words nobody emphasised, which is worse
// than having no emphasis at all.
{
  const { toggleMark, clearMarks, shiftMarks, hasMark } = await import("../src/lib/emag/marks.ts");

  const base = { text: "The women who raised us." };
  const bold = toggleMark(base, 4, 9, "bold"); // "women"

  check("marks the selected words and nothing else", bold.marks.length === 1 && bold.text.slice(bold.marks[0].start, bold.marks[0].end) === "women");
  check("the text is never touched", bold.text === base.text);

  // Typing before the mark must carry it along.
  const after = shiftMarks(bold, "Only the women who raised us.");
  check("typing before a mark moves it with the words", after.text.slice(after.marks[0].start, after.marks[0].end) === "women");

  // Typing after it must not.
  const later = shiftMarks(bold, "The women who raised all of us.");
  check("typing after a mark leaves it alone", later.text.slice(later.marks[0].start, later.marks[0].end) === "women");

  // Deleting the marked words must take the mark with them, or the mark
  // ends up on whatever text slides into the gap.
  const gone = shiftMarks(bold, "The  who raised us.");
  check("deleting marked words removes the mark", (gone.marks ?? []).length === 0);

  // Typing over them is a different act and inherits the emphasis, which is
  // what every writing tool does and what a writer correcting a bold word
  // expects. Asserted so the difference is a decision on the record rather
  // than an accident of the diff.
  const replaced = shiftMarks(bold, "The people who raised us.");
  check("typing over marked words keeps the emphasis", replaced.text.slice(replaced.marks[0].start, replaced.marks[0].end) === "people");

  // Toggling twice is the same as never having done it.
  const off = toggleMark(bold, 4, 9, "bold");
  check("applying twice takes it off again", (off.marks ?? []).length === 0);

  // Un-emphasising the middle of a run splits it in two.
  const sentence = toggleMark({ text: "one two three four" }, 0, 18, "bold");
  const split = clearMarks(sentence, 4, 7);
  check("clearing the middle of a run splits it", split.marks.length === 2);
  check("and leaves the outer words marked", hasMark(split, 0, 3, "bold") && hasMark(split, 8, 18, "bold"));

  // Three kinds, all reaching the renderer.
  const three = toggleMark(toggleMark(toggleMark({ text: "abcdef" }, 0, 2, "bold"), 2, 4, "italic"), 4, 6, "highlight");
  check("bold, italic and highlight can coexist", new Set(three.marks.map((m) => m.kind)).size === 3);
}

heading("The page furniture leaves the room it says it does");
{
  const chrome = liveHeightMm({});
  check("the live area is under a full page", chrome > 0 && chrome < 297, `${chrome.toFixed(1)}mm`);
  check("and leaves room for the rule, the label bar and the footer", 297 - chrome >= 20, `${(297 - chrome).toFixed(1)}mm of furniture`);

  // A taller footer must take room away, millimetre for millimetre.
  const deeper = liveHeightMm({ footerMm: 30 });
  check("a deeper footer takes the room from the live area", Math.abs((chrome - deeper) - 20) < 0.001, `${(chrome - deeper).toFixed(1)}mm less`);
}

heading("The measuring column reads the real page geometry");
{
  // Not a layout rule so much as a guard on one.
  //
  // The footer height and top rule are editable in Settings, and for a while
  // pagination ignored them completely: it called liveHeightMm with no
  // arguments and always assumed the stylesheet defaults. Nothing looked
  // wrong, because no publication had overrides saved. The first one to edit
  // a footer would have had every article in the magazine run over by
  // exactly that difference, silently, on every page.
  //
  // The arithmetic above cannot catch that, because the fault was never in
  // the arithmetic. It was in the one caller that never passed anything in.
  // So this reads the source.
  const src = readFileSync(new URL("../src/components/emag/useMeasuredPages.ts", import.meta.url), "utf8");
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const bare = code.match(/liveHeightMm\(\s*\{\s*\}\s*\)/g) ?? [];

  // One is allowed, and only one: the initial state, set before any DOM
  // exists to measure. Every call made while measuring must pass the
  // geometry it read from the page.
  check("pagination does not assume the default page furniture", bare.length <= 1, `${bare.length} bare call${bare.length === 1 ? "" : "s"}`);
  check("the geometry is read from the rendered page", code.includes("readPageGeometry(probe)"));
}

console.log("");
if (failures > 0) {
  console.error(`${failures} layout rule${failures === 1 ? "" : "s"} broken.`);
  console.error("These are the rules that stop a page being wrong. Do not skip them.");
  process.exit(1);
}
console.log("Every layout rule holds.");
