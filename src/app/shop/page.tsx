import Link from "next/link";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { MarketingHeader } from "@/components/brand/MarketingHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Shop",
  description: "Browse real products from South African small businesses on DigitalFlyer Growth.",
};

// Dewald's ask, 2026-07-18: a "Shop Now" directory across every Growth
// member's Shop, the same idea as /marketplace but for products instead of
// businesses — confirmed as the full cross-client build (not just a link to
// each business's own page), and explicitly NOT pulling Standing 365's real,
// working order flow onto the generic shop_products/checkout system to get
// it in here. Standing 365 keeps its own real checkout; it's listed below as
// a hardcoded featured entry that links straight back to its own page,
// exactly the same shape Marketplace's SHOWCASE_SAMPLES pattern already
// uses for editorial content that isn't itself a database row.
const FEATURED_LISTINGS = [
  {
    title: "Standing 365",
    description: "365 daily devotions for real people, in real hard seasons. Standard and personalised gift editions.",
    priceLabel: "From R299",
    href: "/standing365#own-a-copy",
  },
];

// Reads searchParams (server-side filtering per request), same reasoning as
// /marketplace/page.tsx — no force-static here.
export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const admin = createAdminClient();

  // Only products belonging to a client with Shop actually switched on and
  // the account active — same gate the per-client ShopSection itself uses,
  // via growth_clients!inner the same way /marketplace/page.tsx filters on
  // landing_pages!inner(published), since supabase-js can't filter a plain
  // left join.
  let query = admin
    .from("shop_products")
    .select(
      "id, title, description, base_price_cents, growth_clients!inner(slug, business_name, shop_enabled, status)"
    )
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

  return (
    <main className="flex flex-1 flex-col bg-gray-50">
      <MarketingHeader />

      <section className="border-b border-gray-100 bg-white px-4 py-14 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 text-center">
          <span className="font-badge text-xs uppercase tracking-widest text-brand">Shop</span>
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Shop Now</h1>
          <p className="max-w-xl text-sm text-gray-500 sm:text-base">
            Real products from real South African small businesses, built and hosted on DigitalFlyer Growth.
          </p>

          <form method="GET" className="mt-4 flex w-full max-w-xl flex-col gap-3 sm:flex-row">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search products"
              className="w-full rounded-full border border-gray-200 bg-white px-5 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark"
            >
              Search
            </button>
          </form>

          {q && (
            <Link href="/shop" className="text-xs font-medium text-gray-400 hover:text-brand">
              Clear search
            </Link>
          )}
          <Link href="/marketplace" className="text-xs font-medium text-gray-400 hover:text-brand">
            Looking for a business instead? Browse Marketplace →
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6">
        {!q && FEATURED_LISTINGS.length > 0 && (
          <div className="mb-10">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Featured</p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURED_LISTINGS.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="group flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-200 hover:shadow-md"
                >
                  <h2 className="text-base font-bold tracking-tight text-ink group-hover:text-brand">{item.title}</h2>
                  <p className="line-clamp-2 text-sm text-gray-500">{item.description}</p>
                  <span className="mt-auto pt-2 text-sm font-bold text-brand">{item.priceLabel}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {(products ?? []).length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-gray-200 bg-white p-16 text-center">
            <p className="text-base font-semibold text-ink">No products match yet</p>
            <p className="max-w-sm text-sm text-gray-500">
              {q ? "Try a different search." : "New products are added here as soon as a business lists them."}
            </p>
          </div>
        ) : (
          <>
            {!q && <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">All products</p>}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {(products ?? []).map((product) => {
                const client = product.growth_clients as unknown as { slug: string; business_name: string };
                return (
                  <Link
                    key={product.id}
                    href={`/${client.slug}#shop`}
                    className="group flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-200 hover:shadow-md"
                  >
                    <h2 className="text-base font-bold tracking-tight text-ink group-hover:text-brand">
                      {product.title}
                    </h2>
                    <p className="text-xs text-gray-400">{client.business_name}</p>
                    {product.description && (
                      <p className="line-clamp-2 text-sm text-gray-500">{product.description}</p>
                    )}
                    <span className="mt-auto pt-2 text-sm font-bold text-brand">
                      R{(product.base_price_cents / 100).toFixed(2)}
                    </span>
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
