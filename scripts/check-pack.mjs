// Reads a copy pack and reports what the builder would make of it.
//
// Two questions, and the second one is the important one.
//
// What did it find? The articles, their pillars, their sections and what
// each one produced. Run this on a pack before importing it and a formatting
// mistake shows up here rather than as a missing headline three screens on.
//
// Did it change anything? Every run of text the parser produced is looked
// for, verbatim, in the source file. A single miss means the parser altered
// somebody's writing, which is the one thing this build promises never to
// do. On Edition 03 it checks 288 runs and finds all of them.
//
// Run with: npm run check:pack -- "eMag/Moxie_Edition03_August2026_CopyPack.md"

import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
registerHooks({ resolve(s, c, n) { if (s.startsWith(".") && !/\.[cm]?[jt]s$/.test(s)) { try { return n(`${s}.ts`, c); } catch {} } return n(s, c); } });
const { parseCopyPack } = await import("../src/lib/emag/copypack.ts");
const src = readFileSync(process.argv[2], "utf8");
const pack = parseCopyPack(src);
const plain = src.split("**").join("").split("*").join("");

// Every paragraph the parser produced must appear verbatim in the source.
let checked = 0, missing = [];
for (const a of pack.articles) {
  for (const b of a.blocks) {
    const t = b.type === "p" || b.type === "tip" || b.type === "pullquote" ? b.content.text
            : b.type === "subhead" ? b.text : null;
    if (!t) continue;
    checked++;
    // Compared against a copy of the source with markdown emphasis removed.
    // Asterisks are markup, not language: bold in the pack becomes a bold
    // mark and the characters of the sentence are untouched. Comparing
    // against the raw source would fail on exactly the text the parser got
    // right, and the check has to keep catching the thing that matters,
    // which is a word being changed.
    if (!plain.includes(t)) missing.push([a.heading, b.type, t.slice(0, 70)]);
  }
}
console.log(`Text runs checked: ${checked}`);
console.log(`Not found verbatim in the source: ${missing.length}`);
missing.slice(0, 8).forEach(([h, t, s]) => console.log(`  [${h} / ${t}] ${s}`));

const ed = pack.articles[0];
console.log(`\nEditor's Letter opener:`);
console.log(`  kicker:     ${ed.opener.kicker}`);
console.log(`  headline:   ${ed.opener.headline}`);
console.log(`  turn:       ${ed.opener.headlineTurn ?? "(none)"}`);
console.log(`  standfirst: ${(ed.opener.standfirst?.text ?? "").slice(0,70)}`);
console.log(`\nFirst body paragraph, verbatim:`);
console.log(`  "${ed.blocks[0].content.text}"`);
const cover = pack.articles[1];
const stats = cover.blocks.find(b => b.type === "stats");
console.log(`\nCover story fact grid:`);
stats.cells.forEach(c => console.log(`  ${c.figure.padEnd(8)} ${c.label.slice(0,58)}`));

console.log(`\nPer article:`);
for (const a of pack.articles) {
  const c = {};
  a.blocks.forEach(b => c[b.type] = (c[b.type] ?? 0) + 1);
  const flag = a.looksUnwritten ? "  << looks unwritten, will be left unticked" : "";
  console.log(`  p${a.pageRange.padEnd(6)} ${a.heading.slice(0,28).padEnd(30)} ${JSON.stringify(c)} notes:${a.notes.length}${flag}`);
}
const ouma = pack.articles.find(a => a.heading.includes("OUMA"));
if (ouma) {
  const rows = ouma.blocks.find(b => b.type === "rows");
  console.log(`\nTen Questions rows block: ${rows ? rows.rows.length + " rows" : "NOT FOUND"}`);
  if (rows) rows.rows.slice(0,3).forEach(r => console.log(`  ${r.tag}  ${r.title.slice(0,58)}`));
}
const mothers = pack.articles.find(a => a.heading.includes("MOTHERS"));
if (mothers) {
  console.log(`\nWords Our Mothers Said, notes kept off the page: ${mothers.notes.length}`);
  mothers.notes.forEach(n => console.log(`  - ${n.slice(0,72)}`));
  const marked = mothers.blocks.filter(b => b.content?.marks?.length);
  console.log(`  paragraphs carrying real emphasis instead of asterisks: ${marked.length}`);
  if (marked.length) console.log(`  e.g. "${marked[0].content.text.slice(0,60)}"`);
}
