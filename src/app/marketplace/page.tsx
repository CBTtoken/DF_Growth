import Link from "next/link";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { Search, Star, MessageCircle, CalendarDays, ShoppingBag } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { MarketingHeader } from "@/components/brand/MarketingHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SortSelect } from "@/components/marketplace/SortSelect";
import { MarketplaceCard, type MarketplaceCardData } from "@/components/marketplace/MarketplaceCard";
import { INDUSTRY_TAXONOMY } from "@/lib/industries";
import { CITIES } from "@/lib/cities";
import { truncateOnWord } from "@/lib/text";

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m away`;
  return `${(meters / 1000).toFixed(1)} km away`;
}

export const metadata: Metadata = {
  // Root layout already applies "%s | DigitalFlyer Growth" as a title
  // template — including the suffix here too produced a doubled title.
  title: "Marketplace",
  description:
    "Find real South African small businesses on DigitalFlyer Growth. Search by name, industry, or city.",
};

// Backlog Sec 1 (Marketplace + search): a real browsable/searchable
// marketplace of member businesses. Redesigned 2026-07-25 from a Bolt design
// (docs/marketplace.zip) — the data logic below is unchanged, only the
// presentation moved to a dark hero + richer MarketplaceCard grid using the
// home page's design tokens. No "verified" badge yet (Dewald has a separate
// idea for it) and no fabricated stats (real listing count only).
//
// Reads searchParams, which makes this route dynamic by definition — no
// force-static here, unlike the individual client pages, since the whole
// point is server-side filtering per request.
export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; industry?: string; city?: string; sort?: string; lat?: string; lng?: string }>;
}) {
  // "near" must never be the default — SortSelect's own comment says so
  // ("opt-in only, never the default sort") and its own dropdown never
  // requests browser GPS on a plain page load, only on an explicit change.
  // Defaulting here silently ran every first visit through the IP-geo
  // fallback instead, which is not always accurate (VPNs, some ISPs), and
  // is exactly what produced a ~7200km "away" reading for a Pretoria
  // business. "recent" matches the base query's own created_at ordering,
  // so no other branch below needs to change.
  const { q = "", industry = "", city = "", sort = "recent", lat = "", lng = "" } = await searchParams;
  const admin = createAdminClient();

  // Our own internal pages, kept off the marketplace at Dewald's ask
  // (4 Aug 2026): the marketplace is members' businesses, and DigitalFlyer's
  // own agent-recruitment page listed among them reads as a member that
  // isn't one. The page itself stays live at its URL; it just isn't listed.
  const NOT_LISTED = ["digitalflyer-agents"];
  const notListedFilter = `(${NOT_LISTED.join(",")})`;

  // published landing_pages rows only, and only active (paid/converted)
  // accounts — exactly the same gate [clientSlug]/page.tsx itself uses, so
  // nothing shows up here that wouldn't actually resolve if clicked.
  let query = admin
    .from("growth_clients")
    .select(
      "id, slug, business_name, tagline, business_description, industry, city, logo_path, hero_photo_id, screenshot_path, fallback_photo_url, brand_primary_color, whatsapp_phone, facebook_url, instagram_url, landing_pages!inner(published)"
    )
    .eq("status", "active")
    .eq("unlisted", false)
    .eq("landing_pages.published", true)
    .not("slug", "in", notListedFilter)
    .order("created_at", { ascending: false })
    .limit(60);

  if (city) query = query.eq("city", city);

  // Industry filter is by category (e.g. "Beauty & Wellness"), but the
  // stored value is always a subcategory (e.g. "Nails & Makeup") — match
  // against every subcategory under the chosen category rather than the
  // category name itself.
  if (industry) {
    const category = INDUSTRY_TAXONOMY.find((c) => c.name === industry);
    if (category) query = query.in("industry", category.subcategories);
  }

  if (q.trim()) {
    const term = q.trim().replace(/[%,]/g, "");
    query = query.or(
      `business_name.ilike.%${term}%,tagline.ilike.%${term}%,business_description.ilike.%${term}%`
    );
  }

  const { data: clients } = await query;

  // Honest hero stat: the real number of live, listable businesses (active +
  // published), independent of the current filters. Never a fabricated
  // figure. Shown only when it actually resolves to a positive count.
  const { count: totalListed } = await admin
    .from("growth_clients")
    .select("id, landing_pages!inner(published)", { count: "exact", head: true })
    .eq("status", "active")
    .eq("unlisted", false)
    .eq("landing_pages.published", true)
    .not("slug", "in", notListedFilter);

  // One batched query for every client's photos rather than one per card.
  const clientIds = (clients ?? []).map((c) => c.id);
  const { data: allPhotos } = clientIds.length
    ? await admin
        .from("client_photos")
        .select("id, growth_client_id, storage_path")
        .in("growth_client_id", clientIds)
        .order("position", { ascending: true })
    : { data: [] as { id: string; growth_client_id: string; storage_path: string }[] };

  const photosByClient = new Map<string, { id: string; storage_path: string }[]>();
  for (const photo of allPhotos ?? []) {
    const list = photosByClient.get(photo.growth_client_id) ?? [];
    list.push(photo);
    photosByClient.set(photo.growth_client_id, list);
  }

  // Ratings, batched, one round trip for every listed client. Only ever a
  // positive signal shown when count > 0 — Rate & Review Sec 5's "no rating
  // shown at all for zero reviews" rule applies here too.
  const { data: allRatings } = clientIds.length
    ? await admin.from("reviews").select("business_id, rating").eq("status", "published").in("business_id", clientIds)
    : { data: [] as { business_id: string; rating: number }[] };

  const ratingsByClient = new Map<string, { average: number; count: number }>();
  for (const clientId of clientIds) {
    const ratings = (allRatings ?? []).filter((r) => r.business_id === clientId).map((r) => r.rating);
    if (ratings.length > 0) {
      ratingsByClient.set(clientId, {
        average: ratings.reduce((sum, r) => sum + r, 0) / ratings.length,
        count: ratings.length,
      });
    }
  }

  // "Most visited" sort — only fetched when actually sorting by it.
  let sortedClients = clients ?? [];
  if (sort === "popular" && clientIds.length) {
    const { data: allViews } = await admin.from("page_views").select("growth_client_id").in("growth_client_id", clientIds);
    const viewCountByClient = new Map<string, number>();
    for (const view of allViews ?? []) {
      viewCountByClient.set(view.growth_client_id, (viewCountByClient.get(view.growth_client_id) ?? 0) + 1);
    }
    sortedClients = [...sortedClients].sort(
      (a, b) => (viewCountByClient.get(b.id) ?? 0) - (viewCountByClient.get(a.id) ?? 0)
    );
  }

  // "Near me", opt-in only. Origin coords come from the browser's GPS (sent
  // as lat/lng by SortSelect) or Vercel Edge IP-geolocation headers as a
  // fallback. If neither is available this silently no-ops.
  const distancesByClient = new Map<string, number>();
  if (sort === "near" && clientIds.length) {
    const latParam = parseFloat(lat);
    const lngParam = parseFloat(lng);
    let originLat = Number.isFinite(latParam) ? latParam : null;
    let originLng = Number.isFinite(lngParam) ? lngParam : null;

    if (originLat === null || originLng === null) {
      const requestHeaders = await headers();
      const ipLat = parseFloat(requestHeaders.get("x-vercel-ip-latitude") ?? "");
      const ipLng = parseFloat(requestHeaders.get("x-vercel-ip-longitude") ?? "");
      if (Number.isFinite(ipLat) && Number.isFinite(ipLng)) {
        originLat = ipLat;
        originLng = ipLng;
      }
    }

    if (originLat !== null && originLng !== null) {
      const { data: nearest } = await admin.rpc("nearest_active_clients", {
        origin_lat: originLat,
        origin_long: originLng,
        result_limit: 200,
      });
      for (const row of nearest ?? []) {
        distancesByClient.set(row.id, row.distance_meters);
      }
      if (distancesByClient.size) {
        sortedClients = [...sortedClients].sort((a, b) => {
          const da = distancesByClient.get(a.id);
          const db = distancesByClient.get(b.id);
          if (da === undefined && db === undefined) return 0;
          if (da === undefined) return 1;
          if (db === undefined) return -1;
          return da - db;
        });
      }
    }
  }

  const photosStorageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/client-photos`;
  const logosStorageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/client-logos`;
  const screenshotsStorageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/client-screenshots`;
  const hasFilters = Boolean(q || industry || city);

  const cards: MarketplaceCardData[] = sortedClients.map((client) => {
    const clientPhotos = photosByClient.get(client.id) ?? [];
    const heroPhoto = client.hero_photo_id
      ? clientPhotos.find((p) => p.id === client.hero_photo_id)
      : clientPhotos[0];
    const distanceMeters = distancesByClient.get(client.id);
    // Cover resolution, reordered 5 August 2026 (Dewald noticed the
    // Facebook link preview for the same page always looks clean, this
    // didn't): the page's own og:image ([clientSlug]/page.tsx) prefers a
    // curated, industry-matched library photo over the raw auto-captured
    // screenshot, and never uses the screenshot at all. This card now
    // matches that: an uploaded hero photo still wins outright, then the
    // curated fallback photo, and only then the raw screenshot, which is
    // demoted to last resort rather than the default for anyone without
    // their own photos yet.
    const thumbnailUrl = heroPhoto
      ? `${photosStorageBase}/${heroPhoto.storage_path}`
      : client.fallback_photo_url
        ? client.fallback_photo_url
        : client.screenshot_path
          ? `${screenshotsStorageBase}/${client.screenshot_path}`
          : null;
    const rawTagline = client.tagline || client.business_description;
    return {
      slug: client.slug,
      businessName: client.business_name,
      industry: client.industry,
      city: client.city,
      // Found live, 5 August 2026: the card's CSS line-clamp cuts wherever
      // the two-line box boundary falls, mid-word if that's where it lands
      // ("...organizations that thi") — line-clamp has no word-boundary
      // awareness of its own, unlike truncateOnWord (lib/text.ts), which
      // already exists in this codebase for exactly this reason but this
      // card never used it. 140 chars comfortably fills two lines of this
      // card's text-xs body at its usual width without overflowing it.
      tagline: rawTagline ? truncateOnWord(rawTagline, 140) : null,
      thumbnailUrl,
      logoUrl: client.logo_path ? `${logosStorageBase}/${client.logo_path}` : null,
      brandColor: client.brand_primary_color || "#1081b8",
      rating: ratingsByClient.get(client.id) ?? null,
      distanceLabel: distanceMeters !== undefined ? formatDistance(distanceMeters) : null,
      whatsapp: client.whatsapp_phone,
      facebookUrl: client.facebook_url,
      instagramUrl: client.instagram_url,
    };
  });

  const selectClass =
    "w-full rounded-lg border border-neutral-border bg-white px-3.5 py-2.5 text-sm text-neutral-ink outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20";

  return (
    <main className="flex flex-1 flex-col bg-neutral-light">
      <MarketingHeader />

      {/* Hero + search */}
      <section className="bg-gradient-to-br from-brand-blue-light via-white to-white px-4 pb-10 pt-12 sm:px-6 lg:pb-14 lg:pt-16">
        <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <div>
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-blue/20 bg-brand-blue-light px-3 py-1 text-xs font-semibold text-brand-blue">
              <span className="size-1.5 rounded-full bg-brand-blue" />
              South African business marketplace
            </span>
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-neutral-ink sm:text-4xl lg:text-5xl">
              Find and <span className="text-brand-blue">support</span> your local businesses
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-neutral-mid sm:text-base">
              Search by city, find the one closest to you, and back the quality local businesses near you.
              The new way to find real services you can trust.
            </p>
            {/* Honest signals only, no fabricated numbers */}
            <div className="mt-5 flex flex-wrap gap-2">
              {typeof totalListed === "number" && totalListed > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-border bg-white px-3 py-1.5 text-xs font-semibold text-neutral-ink shadow-sm">
                  {totalListed} live {totalListed === 1 ? "business" : "businesses"}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-border bg-white px-3 py-1.5 text-xs font-semibold text-neutral-ink shadow-sm">
                <Star size={12} className="fill-amber-400 text-amber-400" /> Real customer ratings
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-border bg-white px-3 py-1.5 text-xs font-semibold text-neutral-ink shadow-sm">
                <MessageCircle size={12} className="text-emerald-500" /> Direct WhatsApp contact
              </span>
            </div>
          </div>

          {/* One plain GET form (Server Component, no client JS except the
              SortSelect for the "near me" geolocation). */}
          <form method="GET" className="flex flex-col gap-3 rounded-2xl border border-neutral-border bg-white p-4 shadow-card sm:p-5">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-muted" />
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Search by business name or what they do"
                className="w-full rounded-lg border border-neutral-border bg-white py-2.5 pl-10 pr-4 text-sm text-neutral-ink placeholder:text-neutral-muted outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <select name="industry" defaultValue={industry} className={selectClass} aria-label="Industry">
                <option value="">All industries</option>
                {INDUSTRY_TAXONOMY.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select name="city" defaultValue={city} className={selectClass} aria-label="City">
                <option value="">All cities</option>
                {CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <SortSelect defaultSort={sort} defaultLat={lat} defaultLng={lng} />
            </div>
            <div className="flex flex-col items-center gap-2 pt-1">
              <button
                type="submit"
                className="inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-full bg-accent px-8 py-3.5 text-base font-bold text-white shadow-md shadow-accent/25 transition hover:-translate-y-0.5 hover:bg-accent-hover"
              >
                <Search size={18} /> Search
              </button>
              {hasFilters && (
                <Link href="/marketplace" className="text-xs font-semibold text-neutral-muted hover:text-brand-blue">
                  Clear filters
                </Link>
              )}
            </div>
          </form>
        </div>
      </section>

      {/* Results */}
      <section className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-neutral-ink">
            {sortedClients.length > 0
              ? `${sortedClients.length} ${sortedClients.length === 1 ? "business" : "businesses"}${hasFilters ? " found" : ""}`
              : ""}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/events"
              className="inline-flex items-center gap-1.5 rounded-full border border-brand-blue/30 bg-white px-4 py-2 text-xs font-semibold text-brand-blue shadow-sm transition hover:bg-brand-blue hover:text-white"
            >
              <CalendarDays size={14} /> Find Events
            </Link>
            <Link
              href="/shop"
              className="inline-flex items-center gap-1.5 rounded-full border border-brand-blue/30 bg-white px-4 py-2 text-xs font-semibold text-brand-blue shadow-sm transition hover:bg-brand-blue hover:text-white"
            >
              <ShoppingBag size={14} /> Find local Products
            </Link>
          </div>
        </div>

        {sortedClients.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-neutral-border bg-white p-16 text-center">
            <p className="text-base font-semibold text-neutral-ink">No businesses match yet</p>
            <p className="max-w-sm text-sm text-neutral-muted">
              {hasFilters
                ? "Try a different search or clear your filters."
                : "New members are added here as soon as their page goes live."}
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <MarketplaceCard key={card.slug} {...card} />
            ))}
          </div>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}
