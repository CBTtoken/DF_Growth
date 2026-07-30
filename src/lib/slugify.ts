export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Public Beta Polish Sprint Sec 13.2: a business genuinely named "Growth"
// or "Admin" shouldn't be refused a page outright, so this isn't a hard
// signup block — provisionGrowthClient (src/lib/growth-client/provision.ts)
// checks this and forces a random suffix instead of ever letting one of
// these exact words become a live, unsuffixed slug at /[slug].
//
// Client pages moved from /g/[clientSlug] to root /[clientSlug] (shorter,
// easier for a business to hand out) on 2026-07-15, so this list now has to
// be a complete, maintained match of every real top-level route segment —
// Next.js's own static-route-priority means a client can never actually
// steal a route like /login (the static route always wins), but an
// unreserved match would make that client's own page permanently
// unreachable at their own slug with no obvious error, which is worse than
// the signup-time suffix this list forces instead. Add any new top-level
// route folder here when one is created.
//
// Agent Programme Phase 1 Sec 1.2: agent pages now resolve at root level
// too, so this list stopped being "business slugs vs routes" and became one
// shared namespace across three things (business slugs, agent page slugs,
// platform routes). The nine entries added below were real, live top-level
// route folders that were never in this list — /marketplace, /shop and
// /faq in particular are pages a business could plausibly be named after.
// The cross-table half of the check (an agent page slug vs a business slug)
// can't live in a static Set, so it sits in src/lib/slug-namespace.ts,
// which reads this list as its first gate.
export const RESERVED_SLUGS = new Set([
  "growth",
  "stoep",
  "beta",
  "app",
  "www",
  "admin",
  "api",
  "privacy",
  "terms",
  "pricing",
  "preview",
  "sample",
  "login",
  "logout",
  "dashboard",
  "onboard",
  "auth",
  "set-password",
  "forgot-password",
  "reset-password",
  "sitemap",
  "robots",
  "g",
  "marketplace",
  "board",
  "shop",
  "events",
  "faq",
  "how-it-works",
  "agents",
  "agent-link",
  "unsubscribe",
  "r",
]);
