import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { isKatisoBizHost } from "@/lib/bizup/product";
import { listAreas, listPostSlugsForSitemap } from "@/lib/board/queries";
import { BOARD_CATEGORIES } from "@/lib/board/categories";
import { isBoardPublic } from "@/lib/board/visibility";

// Next.js special file — serves this at /sitemap.xml automatically. Every
// active client's page gets listed so Google actually knows it exists to
// crawl, not just the marketing pages — the whole point of this file, since
// a client page has no other page linking to it for a crawler to discover.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Two products share this app and this file is served on both hostnames.
  // Listing Growth's client pages under katisobiz.co.za would be telling a
  // crawler that pages exist on a domain where they do not, so KatisoBiz
  // gets its own short list and nothing else.
  const { headers } = await import("next/headers");
  const host = (await headers()).get("host") ?? "";
  const bare = host.split(":")[0].toLowerCase();

  if (isKatisoBizHost(host)) {
    const katisoUrl = `https://${bare}`;
    return [
      { url: katisoUrl, changeFrequency: "weekly", priority: 1 },
      { url: `${katisoUrl}/help`, changeFrequency: "monthly", priority: 0.8 },
      { url: `${katisoUrl}/signup`, changeFrequency: "monthly", priority: 0.7 },
      { url: `${katisoUrl}/terms`, changeFrequency: "yearly", priority: 0.3 },
      { url: `${katisoUrl}/privacy`, changeFrequency: "yearly", priority: 0.3 },
      { url: `${katisoUrl}/paia`, changeFrequency: "yearly", priority: 0.2 },
    ];
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://df-growth.vercel.app";
  const admin = createAdminClient();

  // growth_clients has created_at only, no updated_at column (confirmed
  // against the live schema — an earlier version of this query assumed
  // updated_at existed, which fails the query silently under
  // Promise.all-style destructuring and would have shipped every client
  // page missing from the sitemap with no visible error).
  const { data: clients } = await admin
    .from("growth_clients")
    .select("slug, created_at")
    .eq("status", "active")
    .not("slug", "is", null);

  const clientEntries: MetadataRoute.Sitemap = (clients ?? []).map((c) => ({
    url: `${siteUrl}/${c.slug}`,
    lastModified: c.created_at ?? undefined,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // List Your Event Sec 5: "built to be found on Google the same way every
  // other part of Growth is" — every published, still-upcoming event gets
  // listed the same way an active client page does, since an individual
  // event page has no other in-app link a crawler would discover it
  // through besides /events itself.
  const nowIso = new Date().toISOString();
  const { data: events } = await admin
    .from("events")
    .select("id, created_at")
    .eq("status", "published")
    .or(`end_datetime.gte.${nowIso},and(end_datetime.is.null,start_datetime.gte.${nowIso})`);

  const eventEntries: MetadataRoute.Sitemap = (events ?? []).map((e) => ({
    url: `${siteUrl}/events/${e.id}`,
    lastModified: e.created_at ?? undefined,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  // The Board, Phase 1. Its whole value is that member activity becomes
  // indexable pages, so every post, every area and every trade page that
  // actually has something on it is listed. An area or category page with
  // nothing on it is not listed, and does not exist, so a crawler is never
  // sent to a thin page.
  // While the board is unlisted, none of it goes in here. A sitemap entry is
  // an invitation to crawl, and the whole point of the quiet launch is that
  // only the people handed the URL see it.
  const [boardPosts, boardAreas] = isBoardPublic()
    ? await Promise.all([listPostSlugsForSitemap(), listAreas()])
    : [[], []];

  const boardEntries: MetadataRoute.Sitemap = !isBoardPublic() ? [] : [
    { url: `${siteUrl}/board`, changeFrequency: "daily", priority: 0.9 },
    ...boardAreas.map((area) => ({
      url: `${siteUrl}/board/area/${area.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...boardPosts.map((post) => ({
      url: `${siteUrl}/board/post/${post.slug}`,
      lastModified: post.publishedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];

  // Category pages are a fixed set from the taxonomy, so only the ones a
  // member is actually in are worth a crawler's time.
  if (isBoardPublic()) {
    const industriesInUse = new Set(
      (
        await admin
          .from("growth_clients")
          .select("industry, landing_pages!inner(published)")
          .eq("status", "active")
          .eq("landing_pages.published", true)
      ).data?.map((row) => row.industry) ?? []
    );

    for (const category of BOARD_CATEGORIES) {
      if (category.subcategories.some((sub) => industriesInUse.has(sub))) {
        boardEntries.push({
          url: `${siteUrl}/board/category/${category.slug}`,
          changeFrequency: "weekly",
          priority: 0.6,
        });
      }
    }
  }

  return [
    {
      url: `${siteUrl}/pricing`,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/events`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    // The KatisoBiz Members List lives on the Growth domain and is the one
    // page whose whole purpose is being found by someone searching for a
    // trade, so it goes in the sitemap deliberately rather than relying on
    // a crawler stumbling into it.
    {
      url: `${siteUrl}/katisobiz-members`,
      changeFrequency: "daily",
      priority: 0.7,
    },
    ...clientEntries,
    ...eventEntries,
    ...boardEntries,
  ];
}
