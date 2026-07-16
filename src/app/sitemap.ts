import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

// Next.js special file — serves this at /sitemap.xml automatically. Every
// active client's page gets listed so Google actually knows it exists to
// crawl, not just the marketing pages — the whole point of this file, since
// a client page has no other page linking to it for a crawler to discover.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
    ...clientEntries,
    ...eventEntries,
  ];
}
