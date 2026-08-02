import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Search, ShoppingBag, ArrowRight } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { MarketingHeader } from "@/components/brand/MarketingHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { shopImageUrl } from "@/lib/shop/queries";

/** image_paths is jsonb, so it arrives as unknown rather than an array. */
function firstImage(paths: unknown): string | null {
  return Array.isArray(paths) && typeof paths[0] === "string" ? paths[0] : null;
}

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

// Moxie Magazine, curated the same way Standing 365 is and for the same
// reason: it keeps its own real checkout on its own pages, so it is not a
// shop_products row and must not be turned into one.
//
// The cover is a static asset rather than a client screenshot, because Moxie
// is not a growth_clients record. It is a publication with its own domain,
// and the shop links across to it.
const FEATURED_MOXIE = {
  title: "Moxie Magazine",
  description:
    "South Africa's family discovery magazine. Science, nature, history, travel, food and puzzles, written for curious minds aged 8 to 80.",
  priceLabel: "R49 a month",
  href: "/moxie",
  cover: "/moxie/covers/july-2026.webp",
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const admin = createAdminClient();

  // Only products belonging to an active client with Shop switched on.
  //
  // Custom-page clients are excluded, and Standing 365 is why: it is
  // curated above as a FEATURED card pointing at its own bespoke checkout,
  // and it was also appearing again in this list underneath, linking into a
  // generic storefront that knows nothing about its personalised edition.
  // One entry, pointing at the flow that actually sells the thing.
  let query = admin
    .from("shop_products")
    .select(
      "id, slug, title, description, base_price_cents, image_paths, growth_clients!inner(slug, business_name, shop_enabled, status, landing_pages!inner(page_type))"
    )
    .eq("status", "active")
    .eq("growth_clients.shop_enabled", true)
    .eq("growth_clients.status", "active")
    .eq("growth_clients.landing_pages.page_type", "template")
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

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-blue via-brand-blue-mid to-brand-blue-dark">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{ backgroundImage: "radial-gradient(circle, white 1.5px, transparent 1.5px)", backgroundSize: "26px 26px" }}
          aria-hidden
        />
        <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-white/10 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-28 left-10 size-80 rounded-full bg-accent/20 blur-3xl" aria-hidden />

        <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-14 sm:px-6 lg:pt-20">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="text-white">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
                Local products
              </span>
              <h1 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
                Shop <span className="text-amber-300">local products</span> from real businesses
              </h1>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-white/80">
                Real products from South African small businesses. Buy directly from the people who make them, no
                middleman.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <a
                  href="#products"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-bold text-white shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-accent-hover"
                >
                  <ShoppingBag size={16} /> Browse products
                </a>
                <Link
                  href="/marketplace"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
                >
                  Find businesses <ArrowRight size={16} />
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-white/70">
                {["Buy direct from makers", "Secure Paystack checkout", "Support local"].map((p) => (
                  <span key={p} className="inline-flex items-center gap-1.5">
                    <span className="grid size-4 place-items-center rounded-full bg-emerald-400/20 text-emerald-300">✓</span>
                    {p}
                  </span>
                ))}
              </div>
            </div>

            {/* Floating product-card previews (decorative) */}
            <div className="relative mx-auto hidden h-[340px] w-full max-w-sm lg:block" aria-hidden>
              <div className="absolute right-2 top-12 w-56 -rotate-6 rounded-2xl border border-white/20 bg-white/95 shadow-xl">
                <div className="flex h-24 items-center justify-center rounded-t-2xl bg-gradient-to-br from-brand-blue-mid to-brand-blue-dark text-white/40">
                  <ShoppingBag size={26} />
                </div>
                <div className="space-y-2 p-3">
                  <div className="h-2 w-3/4 rounded bg-neutral-border" />
                  <div className="h-2 w-1/2 rounded bg-neutral-border" />
                </div>
              </div>
              <div className="absolute left-2 top-0 w-64 rotate-3 rounded-2xl border border-white/20 bg-white shadow-2xl">
                <div className="relative flex h-28 items-center justify-center rounded-t-2xl bg-gradient-to-br from-brand-blue to-brand-blue-dark text-white/50">
                  <ShoppingBag size={32} />
                  <span className="absolute right-3 top-3 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">New</span>
                </div>
                <div className="p-3">
                  <p className="text-sm font-bold text-neutral-ink">Handmade Soap Bar</p>
                  <p className="text-[11px] text-neutral-muted">Cape Botanicals</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-bold text-accent">R120</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-blue">
                      View <ArrowRight size={12} />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Elevated search bar */}
          <form
            method="GET"
            className="relative z-10 mt-10 flex flex-col gap-3 rounded-2xl bg-white p-3 shadow-2xl shadow-black/20 sm:mt-12 sm:flex-row sm:items-center sm:p-2.5"
          >
            <div className="relative flex-1">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-muted" />
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Search products"
                className="w-full rounded-xl border border-neutral-border bg-white py-2.5 pl-10 pr-4 text-sm text-neutral-ink placeholder:text-neutral-muted outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 sm:border-transparent sm:focus:border-brand-blue"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-7 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-accent-hover"
            >
              <Search size={16} /> Search
            </button>
          </form>
        </div>
      </section>

      <section id="products" className="mx-auto w-full max-w-6xl flex-1 scroll-mt-8 px-4 py-10 sm:px-6">
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

              <Link
                href={FEATURED_MOXIE.href}
                className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-border bg-white shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-brand-blue/30 hover:shadow-card-hover"
              >
                <div className="relative h-40 overflow-hidden bg-neutral-light">
                  <Image
                    src={FEATURED_MOXIE.cover}
                    alt={FEATURED_MOXIE.title}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover object-top transition duration-500 group-hover:scale-105"
                  />
                  <span className="absolute right-2.5 top-2.5 rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-white shadow">
                    Featured
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="text-sm font-bold text-neutral-ink group-hover:text-brand-blue">
                    {FEATURED_MOXIE.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 flex-1 text-xs leading-relaxed text-neutral-mid">
                    {FEATURED_MOXIE.description}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm font-bold text-accent">{FEATURED_MOXIE.priceLabel}</span>
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
                    // The product's own page, not an anchor on the seller's
                    // landing page. That anchor used to list every product a
                    // member had; since the storefront sprint it is a row of
                    // three featured items, so a link to it could easily
                    // land somebody on a page not showing the thing they
                    // just clicked. Every product has a real page now.
                    href={`/${client.slug}/shop/${product.slug}`}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-border bg-white shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-brand-blue/30 hover:shadow-card-hover"
                  >
                    <div className="relative flex h-40 items-center justify-center overflow-hidden bg-gradient-to-br from-brand-blue to-brand-blue-dark text-white">
                      {firstImage(product.image_paths) ? (
                        <Image
                          src={shopImageUrl(firstImage(product.image_paths)!)}
                          alt={product.title}
                          fill
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          className="object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <ShoppingBag size={30} aria-hidden />
                      )}
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
