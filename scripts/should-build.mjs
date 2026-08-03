// Tells Vercel whether a commit is worth building.
//
// Build CPU is comfortably the largest line on the Vercel bill: 59 hours in
// the August cycle, $12.56 of a $15.08 infrastructure total, with everything
// else in this project measured in cents. So the cheapest build is the one
// that never runs.
//
// On 3 August, 10 of the day's 34 commits changed no application code at all.
// They were handover reports, client emails and notes. Every one of them
// rebuilt and redeployed the entire site to change nothing a visitor could
// see. That is roughly a third of the builds and a third of the largest line
// on the bill, spent on markdown.
//
// Vercel's contract for an Ignored Build Step:
//   exit 0  ->  skip the build, keep the current deployment
//   exit 1  ->  build
//
// Fails safe in every direction. If the diff cannot be worked out, if git is
// unavailable, if anything at all throws, it exits 1 and builds. A wasted
// build costs pennies; a skipped build that should have shipped costs a
// broken site nobody notices.
import { execSync } from "node:child_process";

/** Paths that cannot change what a visitor sees. */
const DOCS_ONLY = [
  /^docs\//,
  /^BobGo\//,
  /^BizUp\//,
  /^eMag\//,
  /^TheDesk\//,
  /^WhatsApp\//,
  /^The Board\//,
  /\.md$/,
  /^\.claude\//,
];

function build(reason) {
  console.log(`Building: ${reason}`);
  process.exit(1);
}

function skip(reason) {
  console.log(`Skipping build: ${reason}`);
  process.exit(0);
}

try {
  // Vercel gives the previous deployed commit when it has one. Falling back
  // to HEAD^ covers a normal push; if neither works, we build.
  // argv lets this be tested against any historical pair without checking
  // anything out, which is how its polarity was verified before it went live.
  const previous = process.argv[2] || process.env.VERCEL_GIT_PREVIOUS_SHA || "HEAD~1";
  const head = process.argv[3] || "HEAD";

  const changed = execSync(`git diff --name-only ${previous} ${head}`, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  })
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (changed.length === 0) build("could not tell what changed");

  const codeChanges = changed.filter((file) => !DOCS_ONLY.some((rx) => rx.test(file)));

  if (codeChanges.length === 0) {
    skip(`${changed.length} file(s) changed, all documentation`);
  }

  build(`${codeChanges.length} of ${changed.length} changed file(s) affect the site`);
} catch {
  build("could not read the diff, so building to be safe");
}
