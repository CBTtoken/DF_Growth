import { createAdminClient } from "@/lib/supabase/admin";

export type TopVisitedClient = {
  id: string;
  business_name: string;
  slug: string;
  hero_photo_id: string | null;
  screenshot_path: string | null;
};

// Extracted from src/app/pricing/page.tsx's original inline
// getTopVisitedClientPages() so the screenshot-refresh cron can rank
// clients the exact same way the homepage does, instead of a second,
// possibly-drifting copy of this logic. No SQL aggregate/RPC exists for
// "most-viewed client" yet (page_views volume is small enough at this
// stage that counting client-side is cheap and accurate) — unchanged from
// the original, revisit if that stops being true.
export async function getTopVisitedClients(limit = 3): Promise<TopVisitedClient[]> {
  const admin = createAdminClient();
  const { data: views } = await admin.from("page_views").select("growth_client_id").limit(5000);
  if (!views || views.length === 0) return [];

  const counts = new Map<string, number>();
  for (const v of views) {
    counts.set(v.growth_client_id, (counts.get(v.growth_client_id) ?? 0) + 1);
  }
  const rankedIds = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  if (rankedIds.length === 0) return [];

  const { data: clients } = await admin
    .from("growth_clients")
    .select("id, business_name, slug, hero_photo_id, screenshot_path")
    .in("id", rankedIds.slice(0, limit * 3))
    .eq("status", "active")
    .not("slug", "is", null);
  if (!clients) return [];

  const rank = new Map(rankedIds.map((id, i) => [id, i]));
  return clients
    .filter((c): c is typeof c & { slug: string } => !!c.slug)
    .sort((a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999))
    .slice(0, limit);
}
