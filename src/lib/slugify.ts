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
// these exact words become a live, unsuffixed slug at /g/[slug].
export const RESERVED_SLUGS = new Set(["growth", "stoep", "beta", "app", "www", "admin", "api"]);
