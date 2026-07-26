import { createAdminClient } from "@/lib/supabase/admin";
import { RESERVED_SLUGS } from "@/lib/slugify";

// Agent Programme Phase 1 Sec 1.2: "agent slugs, business slugs, and
// reserved platform routes now share one namespace. Build a single
// uniqueness check across both agents and businesses."
//
// This is deliberately one function rather than a check at each call site.
// Before this existed, a business slug was protected only by the unique
// constraint on growth_clients.slug, which cannot see the agents table at
// all — so an agent published at /losaan and a business that later
// slugified to "losaan" would both insert successfully, and whichever one
// the root resolver checked first would silently shadow the other.
export type SlugTaken =
  | { taken: false }
  | { taken: true; reason: "reserved" | "business" | "business_former" | "agent" };

export async function checkSlugAvailable(
  slug: string,
  // Set when re-saving an existing agent page: its own slug must not count
  // as a collision with itself.
  options: { ignoreAgentId?: string } = {}
): Promise<SlugTaken> {
  if (RESERVED_SLUGS.has(slug)) return { taken: true, reason: "reserved" };

  const admin = createAdminClient();

  const [{ data: business }, { data: formerSlug }, { data: agentPage }] = await Promise.all([
    admin.from("growth_clients").select("id").eq("slug", slug).maybeSingle(),
    // A former slug still 301s to its current one (see [clientSlug]/
    // page.tsx), so handing it to someone else would break a redirect that
    // is already out in the wild in the reactivation emails.
    admin.from("growth_clients").select("id").contains("previous_slugs", [slug]).limit(1).maybeSingle(),
    admin.from("agents").select("id").eq("page_slug", slug).maybeSingle(),
  ]);

  if (business) return { taken: true, reason: "business" };
  if (formerSlug) return { taken: true, reason: "business_former" };
  if (agentPage && agentPage.id !== options.ignoreAgentId) return { taken: true, reason: "agent" };

  return { taken: false };
}

// Sec 1.2: "Enforce at creation with a clear error message." Written for a
// human reading it in the admin form, so it says what to do next, not just
// what went wrong.
export function slugTakenMessage(result: SlugTaken): string | null {
  if (!result.taken) return null;
  switch (result.reason) {
    case "reserved":
      return "That address is used by the platform itself. Pick a different one.";
    case "business":
      return "A business page already uses that address. Pick a different one.";
    case "business_former":
      return "A business page used to live at that address and still redirects from it. Pick a different one.";
    case "agent":
      return "Another agent page already uses that address. Pick a different one.";
  }
}

// Used by provisionGrowthClient, which cannot express a cross-table
// constraint in its insert and instead relies on the unique constraint
// firing. An agent page slug never trips that constraint, so a business
// whose name slugifies onto a live agent page has to be caught here and
// pushed down the same random-suffix path a reserved word already takes.
export async function agentPageSlugExists(slug: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin.from("agents").select("id").eq("page_slug", slug).maybeSingle();
  return Boolean(data);
}
