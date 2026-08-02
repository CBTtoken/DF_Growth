import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/shop/ProductDetail";
import { ProductCard } from "@/components/shop/ProductCard";
import { deliverySummary } from "@/lib/shop/delivery";
import {
  fromPriceCents,
  getProductBySlug,
  getShopOwner,
  getStorefrontProducts,
  isSoldOut,
  shopImageUrl,
  variantPriceCents,
  type ShopOwner,
  type StorefrontProduct,
} from "@/lib/shop/queries";
import { truncateOnWord } from "@/lib/text";

export const revalidate = 60;
export const dynamic = "force-static";

/**
 * Handoff Sec 1.1: "A product page for every product. Its own URL, its own
 * title, its own description, its own images. This is the most valuable part
 * of this sprint. It is what gets indexed, what gets sent in a WhatsApp
 * message, and what converts."
 *
 * The metadata below is the whole of the second and third of those. A link
 * pasted into WhatsApp is unfurled by fetching this page and reading these
 * tags, so an og:image pointing at the product photo is the difference
 * between a message that shows the thing being sold and one that shows a
 * grey rectangle with a domain name on it.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ clientSlug: string; productSlug: string }>;
}): Promise<Metadata> {
  const { clientSlug, productSlug } = await params;
  const owner = await getShopOwner(clientSlug);
  if (!owner) return {};

  const product = await getProductBySlug(owner.id, productSlug);
  if (!product) return {};

  const title = `${product.title} | ${owner.business_name}`;
  // The stand-in zero never reaches a search result or a link preview
  // either, so a product still waiting for its price says so instead.
  const price = product.price_pending
    ? "Contact us for a price"
    : `R${(fromPriceCents(product) / 100).toFixed(2)}`;
  const description = truncateOnWord(
    product.description?.trim()
      ? `${product.description.trim()}`
      : `${product.title} from ${owner.business_name}${owner.city ? ` in ${owner.city}` : ""}. ${price}.`,
    160
  );

  const url = `/${clientSlug}/shop/${product.slug}`;
  // The product's own photo, not the member's logo. A link preview showing
  // a logo tells a buyer which shop it came from; one showing the product
  // tells them what it is, which is the question they are actually asking.
  const image = product.image_paths[0]
    ? shopImageUrl(product.image_paths[0])
    : owner.logo_path
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/client-logos/${owner.logo_path}`
      : "/brand/logo-blue.png";

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      images: [image],
      // South African English, so a preview renders prices and dates the way
      // the buyer reading it writes them.
      locale: "en_ZA",
      type: "website",
      siteName: owner.business_name,
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ clientSlug: string; productSlug: string }>;
}) {
  const { clientSlug, productSlug } = await params;
  const owner = await getShopOwner(clientSlug);
  if (!owner) return notFound();

  const product = await getProductBySlug(owner.id, productSlug);
  if (!product) return notFound();

  const all = await getStorefrontProducts(owner.id);
  const more = all.filter((p) => p.id !== product.id).slice(0, 4);
  const primaryColor = owner.brand_primary_color ?? "#1081b8";

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <ProductSchema owner={owner} product={product} clientSlug={clientSlug} />

      <nav className="mb-5 text-sm text-gray-500">
        <Link href={`/${clientSlug}/shop`} className="underline-offset-2 hover:text-gray-800 hover:underline">
          ← All products
        </Link>
      </nav>

      <ProductDetail
        product={product}
        clientSlug={clientSlug}
        primaryColor={primaryColor}
        deliveryLine={deliverySummary(owner.delivery)}
      />

      {/* The page has to stand on its own when it arrives as a link with no
          other context (Sec 1.2). Somebody who has only ever seen this one
          URL should be able to tell who they would be buying from and how to
          reach them before they hand over a cent. */}
      <section className="mt-10 rounded-2xl border border-gray-200 bg-gray-50 p-5 text-sm">
        <p className="font-semibold text-gray-900">
          Sold by {owner.business_name}
          {owner.city ? `, ${owner.city}` : ""}
        </p>
        <p className="mt-1 text-gray-600">
          {[
            owner.call_phone ?? owner.whatsapp_phone,
            owner.contact_email,
          ]
            .filter(Boolean)
            .join(" · ") || "Get in touch through the seller's page."}
        </p>
        <Link
          href={`/${clientSlug}`}
          className="mt-3 inline-block font-semibold underline-offset-2 hover:underline"
          style={{ color: primaryColor }}
        >
          More about {owner.business_name}
        </Link>
      </section>

      {more.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-bold tracking-tight text-gray-900">More from this shop</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {more.map((p) => (
              <ProductCard key={p.id} product={p} clientSlug={clientSlug} primaryColor={primaryColor} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * Product structured data, so a search result can carry the price.
 *
 * Handoff Sec 1.2 asks for "product structured data so it can appear
 * properly in search results". The offer shape switches to AggregateOffer
 * when the options genuinely cost different amounts, because publishing a
 * single price for a product that sells at three is how a shop ends up with
 * a rich result advertising a figure the buyer cannot actually pay.
 */
function ProductSchema({
  owner,
  product,
  clientSlug,
}: {
  owner: ShopOwner;
  product: StorefrontProduct;
  clientSlug: string;
}) {
  const url = `${process.env.NEXT_PUBLIC_SITE_URL}/${clientSlug}/shop/${product.slug}`;
  const prices = product.variants.length
    ? product.variants.map((v) => variantPriceCents(product, v))
    : [product.base_price_cents];
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  const availability = isSoldOut(product)
    ? "https://schema.org/OutOfStock"
    : "https://schema.org/InStock";
  const seller = { "@type": "Organization", name: owner.business_name };

  // A product with no price yet publishes no offer at all.
  //
  // schema.org requires a price on an Offer, so the stand-in zero would go
  // straight into the structured data and Google would be entitled to show
  // "R0.00" in a search result for something that is not free. Omitting the
  // offer costs the rich price snippet and keeps the product indexable,
  // which is the right trade: the page still says what the thing is, and
  // nothing anywhere claims a price nobody has set.
  const offers = product.price_pending
    ? undefined
    : low === high
      ? {
          "@type": "Offer",
          url,
          priceCurrency: "ZAR",
          price: (low / 100).toFixed(2),
          availability,
          seller,
        }
      : {
          "@type": "AggregateOffer",
          url,
          priceCurrency: "ZAR",
          lowPrice: (low / 100).toFixed(2),
          highPrice: (high / 100).toFixed(2),
          offerCount: prices.length,
          availability,
          seller,
        };

  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description ?? undefined,
    image: product.image_paths.map(shopImageUrl),
    brand: { "@type": "Brand", name: owner.business_name },
    offers,
  };

  return (
    <script
      type="application/ld+json"
      // Server-rendered from our own database rather than anything a visitor
      // supplied, matching how LocalBusinessSchema does it next door.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
