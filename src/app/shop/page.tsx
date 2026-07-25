import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Search, ShoppingBag, ArrowRight } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { MarketingHeader } from "@/components/brand/MarketingHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Shop",
  description: "Browse real products from South African small businesses on DigitalFlyer Growth.",
};

// A cross-member product shop, the same idea as /marketplace but for products.
// Standing 365 keeps its own real checkout; it is a curated featured entry
// linking back to its own page, not a generic shop_products row. Redesigned
// 2026-07-25 to match the Marketplace/home look.
const FEATURED = {
  title: "Standing 365",
  description: "365 daily devotions for real people, in real hard seasons. Standard and personalised gift editions.",
  priceLabel: "From R299",
  href: "/standing365#own-a-copy",
  coverSlug: "standing365",
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const admin = createAdminClient();

  // Only products belonging to an active client with Shop switched on.
  let query = admin
    .from("shop_products")
    .select("id, title, description, base_price_cents, growth_clients!inner(slug, business_name, shop_enabled, status)")
    .eq("status", "active")
    .eq("growth_clients.shop_enabled", true)
    .eq("growth_clients.status", "active")
    .order("created_at", { ascending: false })
    .limit(60);

  if (q.trim()) {
    const term = q.trim().replace(/[%,]/g, "");
    query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
  }

  const { data: products } = await query;

  // Featured cover: Standing 365's real captured page screenshot when present.
  const { data: featuredClient } = await admin
    .from("growth_clients")
    .select("screenshot_path")
    .eq("slug", FEATURED.coverSlug)
    .maybeSingle();
  const screenshotsBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/client-screenshots`;
  const featuredCover = featuredClient?.screenshot_path ? `${screenshotsBase}/${featuredClient.screenshot_path}` : null;

  const productList = products ?? [];

  return (
    <main className="flex flex-1 flex-col bg-neutral-light">
      <MarketingHeader />

      {/* Hero + search */}
      <section className="bg-gradient-to-br from-brand-blue-light via-white to-white px-4 pb-10 pt-12 sm:px-6 lg:pb-14 lg:pt-16">
        <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <div>
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-blue/20 bg-brand-blue-light px-3 py-1 text-xs font-semibold text-brand-blue">
              <span className="size-1.5 rounded-full bg-brand-blue" />
              Local products
            </span>
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-neutral-ink sm:text-4xl lg:text-5xl">
              Shop <span className="text-brand-blue">local products</span> from real businesses
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-neutral-mid sm:text-base">
              Real products from South African small businesses, built and hosted on DigitalFlyer. Buy directly from
              the people who make them.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-1.5 rounded-full border border-brand-blue/30 bg-white px-4 py-2 text-xs font-semibold text-brand-blue shadow-sm transition hover:bg-brand-blue hover:text-white"
              >
                Find businesses
              </Link>
              <Link
                href="/events"
                className="inline-flex items-center gap-1.5 rounded-full border border-brand-blue/30 bg-white px-4 py-2 text-xs font-semibold text-brand-blue shadow-sm transition hover:bg-brand-blue hover:text-white"
              >
                Find events
              </Link>
            </div>
          </div>

          <form method="GET" className="flex flex-col gap-3 rounded-2xl border border-neutral-border bg-white p-4 shadow-card sm:p-5">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-muted" />
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Search products"
                className="w-full rounded-lg border border-neutral-border bg-white py-2.5 pl-10 pr-4 text-sm text-neutral-ink placeholder:text-neutral-muted outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
              />
            </div>
            <div className="flex flex-col items-center gap-2 pt-1">
              <button
                type="submit"
                className="inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-full bg-accent px-8 py-3 text-base font-bold text-white shadow-md shadow-accent/25 transition hover:-translate-y-0.5 hover:bg-accent-hover"
              >
                <Search size={18} /> Search
              </button>
              {q && (
                <Link href="/shop" className="text-xs font-semibold text-neutral-muted hover:text-brand-blue">
                  Clear search
                </Link>
              )}
            </div>
          </form>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        {/* Featured */}
        {!q && (
          <div className="mb-10">
            <p className="section-eyebrow">Featured</p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href={FEATURED.href}
                className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-border bg-white shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-brand-blue/30 hover:shadow-card-hover"
              >
                <div className="relative h-40 overflow-hidden bg-neutral-light">
                  {featuredCover ? (
                    <Image
                      src={featuredCover}
                      alt={FEATURED.title}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover object-top transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-blue to-brand-blue-dark text-white" aria-hidden>
                      <ShoppingBag size={32} />
                    </div>
                  )}
                  <span className="absolute right-2.5 top-2.5 rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-white shadow">
                    Featured
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="text-sm font-bold text-neutral-ink group-hover:text-brand-blue">{FEATURED.title}</h3>
                  <p className="mt-1 line-clamp-2 flex-1 text-xs leading-relaxed text-neutral-mid">{FEATURED.description}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm font-bold text-accent">{FEATURED.priceLabel}</span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-blue">
                      View <ArrowRight size={13} />
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        )}

        {productList.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-neutral-border bg-white p-16 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-brand-blue/10 text-brand-blue">
              <ShoppingBag size={22} />
            </span>
            <p className="text-base font-semibold text-neutral-ink">
              {q ? "No products match yet" : "More products on the way"}
            </p>
            <p className="max-w-md text-sm text-neutral-muted">
              {q
                ? "Try a different search."
                : "Products from DigitalFlyer members appear here as soon as they add a shop to their page."}
            </p>
          </div>
        ) : (
          <>
            <p className="section-eyebrow">All products</p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {productList.map((product) => {
                const client = product.growth_clients as unknown as { slug: string; business_name: string };
                return (
                  <Link
                    key={product.id}
                    href={`/${client.slug}#shop`}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-border bg-white shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-brand-blue/30 hover:shadow-card-hover"
                  >
                    <div className="flex h-40 items-center justify-center bg-gradient-to-br from-brand-blue to-brand-blue-dark text-white" aria-hidden>
                      <ShoppingBag size={30} />
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <h3 className="text-sm font-bold text-neutral-ink group-hover:text-brand-blue">{product.title}</h3>
                      <p className="text-xs text-neutral-muted">{client.business_name}</p>
                      {product.description && (
                        <p className="mt-1 line-clamp-2 flex-1 text-sm text-neutral-mid">{product.description}</p>
                      )}
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm font-bold text-accent">R{(product.base_price_cents / 100).toFixed(2)}</span>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-blue">
                          View in shop <ArrowRight size={13} />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}
