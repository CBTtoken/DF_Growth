import Link from "next/link";
import { ProductCard } from "@/components/shop/ProductCard";
import { featuredProducts, type StorefrontProduct } from "@/lib/shop/queries";
import { readableTextOn } from "@/lib/color";

export type PublicShopProduct = StorefrontProduct;

/**
 * A short row of products on the landing page, and a way through to the shop.
 *
 * This used to be the shop: every product as a small card, a cart, and a
 * checkout in a modal, all on the landing page. Handoff Sec 1.1 replaces
 * that with a real storefront and a page per product, and reduces this to
 * what it should always have been, which is an advertisement for the shop
 * rather than the shop itself.
 *
 * The heading is not "Most popular". It was, ranked by sale_count, on shops
 * that have never sold anything, which presented three products at zero
 * sales to a buyer as evidence that other people had bought them. The member
 * now chooses what appears here, and if they have not chosen, the fallback
 * is the most recently added, which claims nothing at all.
 */
export function ShopSection({
  clientSlug,
  primaryColor,
  products,
}: {
  clientSlug: string;
  primaryColor: string;
  products: PublicShopProduct[];
}) {
  if (products.length === 0) return null;

  const featured = featuredProducts(products, 3);
  const shopHref = `/${clientSlug}/shop`;

  return (
    <section id="shop" className="bg-white px-4 py-12 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Shop</h2>
          <Link
            href={shopHref}
            className="text-sm font-semibold underline-offset-2 hover:underline"
            style={{ color: primaryColor }}
          >
            See all {products.length} product{products.length === 1 ? "" : "s"} →
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {featured.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              clientSlug={clientSlug}
              primaryColor={primaryColor}
            />
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href={shopHref}
            className="inline-block rounded-full px-7 py-3.5 text-base font-semibold shadow-sm transition hover:-translate-y-0.5"
            style={{ backgroundColor: primaryColor, color: readableTextOn(primaryColor) }}
          >
            Visit the shop
          </Link>
        </div>
      </div>
    </section>
  );
}
