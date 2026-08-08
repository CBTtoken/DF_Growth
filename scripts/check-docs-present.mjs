// Fails if a document sitting in this working tree is cited by the
// repository but was never added to git.
//
// On 8 August 2026 twenty documents were found in exactly that state. Among
// them was INTERFACE-STANDARD.md, which CLAUDE.md instructs every handoff
// that touches a screen to read, which three shipped docs cite by name, and
// which existed only on Dewald's machine. docs/DOCUMENT_INDEX.md, the map of
// where every specification lives, pointed at eight files a fresh clone
// would not have. Source comments in src/app/dashboard/page.tsx cited a
// handoff nobody else could open.
//
// None of it was deliberate. A handoff arrives, gets worked, gets cited, and
// never gets added, because nothing ever complained. Handoffs had already
// briefly vanished once before, which is what makes this worth a check.
//
// The question is asked in this direction on purpose. The obvious version,
// scanning prose for anything shaped like a path, flags every deliberate
// cross-repository reference in DOCUMENT_INDEX.md and ESTATE.md, and a
// check that cries wolf gets switched off within a week. Starting from the
// untracked files instead means every hit is real: the file is here, the
// repository talks about it, and a clone would not get it.
//
// **This cannot run in CI, and putting it there would be worse than not
// having it.** It compares the working tree against the index, and a CI
// checkout has no untracked files at all, so it would pass every time and
// look like proof while proving nothing. It belongs where the untracked
// file actually exists, which is the machine the document arrived on: run
// it before pushing, via `npm run check`. The em dash check is in CI
// because the thing it looks for is committed; this one looks for the
// absence of a commit, which CI cannot see.
import { execFileSync } from "node:child_process";

function git(args) {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
    .split(/\r?\n/)
    .filter(Boolean);
}

// Documents, not working files. Images, spreadsheets and PDFs are usually
// source material rather than something the repo reasons about, and they
// are heavy, so adding them stays a human decision.
const DOCUMENT = /\.(md|html|txt)$/i;

const untracked = git(["ls-files", "-o", "--exclude-standard"]).filter((f) => DOCUMENT.test(f));

if (untracked.length === 0) {
  console.log("Every document this repository cites is in this repository.");
  process.exit(0);
}

const problems = [];

for (const file of untracked) {
  const base = file.split("/").pop();
  let citedBy = [];
  try {
    // Fixed-string search of tracked files only. Source comments count:
    // they are how this codebase explains itself, and a comment pointing at
    // a document nobody has is a dead end exactly when someone needs it.
    citedBy = git([
      "grep",
      "--cached",
      "-l",
      "-F",
      "--",
      base,
      "--",
      "*.md",
      "*.ts",
      "*.tsx",
      "*.mjs",
    ]);
  } catch {
    continue; // git grep exits non-zero when nothing matches
  }
  // A file citing itself is not a citation.
  citedBy = citedBy.filter((c) => c !== file);
  if (citedBy.length > 0) problems.push({ file, citedBy });
}

if (problems.length > 0) {
  console.error("This repository cites documents that are not in it.\n");
  console.error("Each of these is on this machine and nowhere else. Anyone");
  console.error("cloning the repository cannot open them.\n");
  console.error("Add it:  git add <path>");
  console.error("Or, if it genuinely belongs to another repository, move the");
  console.error("reference to ESTATE.md and cite it as external.\n");
  for (const { file, citedBy } of problems) {
    console.error(`  ${file}`);
    citedBy.slice(0, 4).forEach((c) => console.error(`      cited by ${c}`));
    if (citedBy.length > 4) console.error(`      and ${citedBy.length - 4} more`);
  }
  console.error(`\n${problems.length} to fix.`);
  process.exit(1);
}

console.log("Every document this repository cites is in this repository.");
