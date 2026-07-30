// Whether the board is openly public yet.
//
// Dewald's decision on 30 July: build it all, put it live, but hand the URL
// to a handful of testers rather than announcing it. So "hidden" here means
// three specific things and nothing else:
//
//   1. No link to it in any menu.
//   2. Not in the sitemap.
//   3. Every board page tells crawlers not to index it.
//
// It does not mean a password, a gate or a feature flag wrapped around the
// code. Anyone with the URL gets the real thing, exactly as it will be, and
// a tester's post is a real post that survives the switch. A gate would mean
// testing something other than what ships.
//
// Flipping it is one environment variable in Vercel, NEXT_PUBLIC_BOARD_LIVE
// set to true, and a redeploy. Nothing in the database changes and no post
// has to be recreated.
export function isBoardPublic(): boolean {
  return process.env.NEXT_PUBLIC_BOARD_LIVE === "true";
}

/**
 * Metadata for a board page.
 *
 * While hidden, this is the only thing standing between a tester sharing a
 * link in a WhatsApp group and Google indexing a board nobody has announced,
 * so it is applied on every board route rather than only the post page.
 */
export function boardRobots() {
  return isBoardPublic() ? undefined : { robots: { index: false, follow: false } };
}
