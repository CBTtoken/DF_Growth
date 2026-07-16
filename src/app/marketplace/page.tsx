import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { MarketingHeader } from "@/components/brand/MarketingHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { INDUSTRY_TAXONOMY } from "@/lib/industries";
import { CITIES } from "@/lib/cities";

export const metadata: Metadata = {
  // Root layout already applies "%s | DigitalFlyer Growth" as a title
  // template — including the suffix here too produced a doubled title.
  title: "Marketplace",
  description:
    "Find real South African small businesses on DigitalFlyer Growth — search by name, industry, or city.",
};

// Backlog Sec 1 (Marketplace directory + search), built this sprint: a
// real browsable/searchable page for member businesses. Sorts by
// recently-added rather than "most visited" — there's no page-view
// tracking anywhere in the platform yet (separate backlog item), so
// recency is the only honest signal available today.
//
// Reads searchParams, which makes this route dynamic by definition — no
// force-static here, unlike the individual client pages, since the whole
// point is server-side filtering per request.
export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; industry?: string; city?: string }>;
}) {
  const { q = "", industry = "", city = "" } = await searchParams;
  const admin = createAdminClient();

  // published landing_pages rows only, and only active (paid/converted)
  // accounts — exactly the same gate [clientSlug]/page.tsx itself uses, so
  // nothing shows up here that wouldn't actually resolve if clicked.
  let query = admin
    .from("growth_clients")
    .select(
      "id, slug, business_name, tagline, business_description, industry, city, logo_path, hero_photo_id, brand_primary_color, landing_pages!inner(published)"
    )
    .eq("status", "active")
    .eq("landing_pages.published", true)
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

  // Real feedback: text-only cards had "no context or colour" — a real
  // photo thumbnail per card, same idea as the homepage's "See It In
  // Action" previews but without embedding a live iframe (that technique
  // only works there because /sample/* has a deliberately loosened
  // clickjacking header; widening that to every real client page for a
  // directory that could grow to hundreds of listings isn't a good trade,
  // see the earlier conversation). One batched query for every client's
  // photos rather than one query per card.
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

  const photosStorageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/client-photos`;
  const logosStorageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/client-logos`;

  return (
    <main className="flex flex-1 flex-col bg-gray-50">
      <MarketingHeader />

      <section className="border-b border-gray-100 bg-white px-4 py-14 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 text-center">
          <span className="font-badge text-xs uppercase tracking-widest text-brand">Marketplace</span>
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Find your local supplier
          </h1>
          <p className="max-w-xl text-sm text-gray-500 sm:text-base">
            Real South African small businesses, built and hosted on DigitalFlyer Growth.
          </p>

          {/* One plain form, GET method, no client-side JS at all — this is
              a Server Component, and an onChange auto-submit handler on the
              selects (tried first) can't cross the server/client boundary
              here, which produced a real 500 on every load. A single
              "Apply" button for all three filters is simpler and avoids
              needing to split this into a client component just for that. */}
          <form method="GET" className="mt-4 flex w-full max-w-xl flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Search by business name or what they do"
                className="w-full rounded-full border border-gray-200 bg-white px-5 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                name="industry"
                defaultValue={industry}
                className="w-full rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
              >
                <option value="">All industries</option>
                {INDUSTRY_TAXONOMY.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                name="city"
                defaultValue={city}
                className="w-full rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
              >
                <option value="">All cities</option>
                {CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark sm:w-auto sm:self-center"
            >
              Search
            </button>
          </form>

          {(q || industry || city) && (
            <Link href="/marketplace" className="text-xs font-medium text-gray-400 hover:text-brand">
              Clear filters
            </Link>
          )}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6">
        {!clients || clients.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-gray-200 bg-white p-16 text-center">
            <p className="text-base font-semibold text-ink">No businesses match yet</p>
            <p className="max-w-sm text-sm text-gray-500">
              {q || industry || city
                ? "Try a different search or clear your filters."
                : "New members are added here as soon as their page goes live."}
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {clients.map((client) => {
              const logoUrl = client.logo_path ? `${logosStorageBase}/${client.logo_path}` : null;
              const brandColor = client.brand_primary_color || "#1081b8";

              // Same resolution order as a real client page's hero photo
              // (ClientLandingPageView.tsx): an explicit hero_photo_id
              // selection wins, otherwise the first uploaded gallery photo
              // — never a stock photo standing in for a business that
              // hasn't uploaded anything, that would misrepresent them.
              const clientPhotos = photosByClient.get(client.id) ?? [];
              const heroPhoto = client.hero_photo_id
                ? clientPhotos.find((p) => p.id === client.hero_photo_id)
                : clientPhotos[0];
              const thumbnailUrl = heroPhoto ? `${photosStorageBase}/${heroPhoto.storage_path}` : null;

              // A real photo genuinely helps and keeps its own card shape.
              // No-photo cards used to be a big flat colour rectangle with
              // just 2 initials — with most listings still photo-less
              // (every one of the first 31 reactivated businesses has zero
              // gallery photos), a wall of those reads as dull, repetitive
              // colour blocks rather than a real directory. Redesigned as a
              // text-forward card instead — a Google Business Profile-style
              // icon + name + category, name and industry doing the actual
              // work rather than a colour standing in for content.
              if (thumbnailUrl) {
                return (
                  <Link
                    key={client.slug}
                    href={`/${client.slug}`}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
                      <Image
                        src={thumbnailUrl}
                        alt={client.business_name}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 p-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: brandColor }}
                          aria-hidden
                        />
                        <h2 className="truncate text-sm font-bold tracking-tight text-ink group-hover:text-brand">
                          {client.business_name}
                        </h2>
                      </div>
                      <p className="truncate text-xs text-gray-400">
                        {client.industry}
                        {client.city ? ` · ${client.city}` : ""}
                      </p>
                      <p className="line-clamp-2 text-sm text-gray-500">
                        {client.tagline || client.business_description}
                      </p>
                    </div>
                  </Link>
                );
              }

              return (
                <Link
                  key={client.slug}
                  href={`/${client.slug}`}
                  className="group flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-200 hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    {logoUrl ? (
                      <Image
                        src={logoUrl}
                        alt={client.business_name}
                        width={44}
                        height={44}
                        className="size-11 shrink-0 rounded-full border border-gray-100 bg-white object-cover p-1"
                      />
                    ) : (
                      <span
                        className="grid size-11 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
                        style={{ backgroundColor: brandColor }}
                        aria-hidden
                      >
                        {client.business_name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <div className="flex min-w-0 flex-col gap-1 pt-0.5">
                      <h2 className="truncate text-base font-bold tracking-tight text-ink group-hover:text-brand">
                        {client.business_name}
                      </h2>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {client.industry && (
                          <span
                            className="truncate rounded-full px-2 py-0.5 text-xs font-semibold"
                            style={{ backgroundColor: `${brandColor}1a`, color: brandColor }}
                          >
                            {client.industry}
                          </span>
                        )}
                        {client.city && <span className="text-xs text-gray-400">{client.city}</span>}
                      </div>
                    </div>
                  </div>
                  <p className="line-clamp-2 text-sm text-gray-500">
                    {client.tagline || client.business_description}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}
