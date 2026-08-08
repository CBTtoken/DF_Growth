import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/shop/ProductCard";
import { deliverySummary } from "@/lib/shop/delivery";
import {
  collectionAnchor,
  getShopOwner,
  getStorefrontProducts,
  groupByCollection,
} from "@/lib/shop/queries";
import { truncateOnWord } from "@/lib/text";

// Same caching posture as the landing page next door, and for the same
// reason its own comment gives: a dynamic segment with no
// generateStaticParams defaults to on-demand SSR in this Next.js version,
// and `revalidate` alone does not make it cacheable. A shop's contents only
// change when the member edits them, and a cold function run measured
// several seconds of LCP against a warm one on the page beside this.
export const revalidate = 60;
export const dynamic = "force-static";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ clientSlug: string }>;
}): Promise<Metadata> {
  const { clientSlug } = await params;
  const owner = await getShopOwner(clientSlug);
  if (!owner) return {};

  const title = `Shop | ${owner.business_name}`;
  const description = truncateOnWord(
    `Buy directly from ${owner.business_name}${owner.city ? ` in ${owner.city}` : ""}. Order online, no account needed.`,
    160
  );
  const url = `/${clientSlug}/shop`;
  const image = owner.logo_path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/client-logos/${owner.logo_path}`
    : "/brand/logo-blue.png";

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, images: [image], locale: "en_ZA", type: "website" },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ clientSlug: string }>;
}) {
  const { clientSlug } = await params;
  const owner = await getShopOwner(clientSlug);
  if (!owner) return notFound();

  const products = await getStorefrontProducts(owner.id);
  const primaryColor = owner.brand_primary_color ?? "#1081b8";
  const groups = groupByCollection(products);
  // One group is not a grouping. A shop that sells four things gets the plain
  // grid it always had, with no headings and no jump bar to read past.
  const grouped = groups.length > 1;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          {owner.business_name}
        </h1>
        {/* Delivery terms at the top of the shop rather than only at
            checkout. A buyer deciding whether to bother is asking "can this
            even reach me", and making them fill in a basket to find out is
            how a shop loses somebody who would have bought. */}
        <p className="text-sm text-gray-600">{deliverySummary(owner.delivery)}</p>
      </div>

      {/* What is in this shop, before any of it has to be scrolled past.
          A range that runs to twenty-odd products across three different
          kinds of thing is three shopping trips, and somebody who came for
          moringa should not have to swipe through nine perfumes to find it.
          Plain anchor links, so they work with no JavaScript at all. */}
      {grouped && (
        <nav aria-label="Product ranges" className="mt-5 flex flex-wrap gap-2">
          {groups.map((group) => (
            <a
              key={group.name}
              href={`#${collectionAnchor(group.name!)}`}
              className="rounded-full border border-gray-300 px-3.5 py-1.5 text-sm font-medium text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
            >
              {group.name}
              <span className="ml-1.5 text-gray-400">{group.products.length}</span>
            </a>
          ))}
        </nav>
      )}

      {products.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
          Nothing is listed here just yet. Check back soon.
        </p>
      ) : (
        groups.map((group, groupIndex) => (
          <section
            key={group.name ?? "all"}
            id={group.name ? collectionAnchor(group.name) : undefined}
            // scroll-mt keeps a heading clear of the sticky shop header when
            // a jump link lands on it.
            className="scroll-mt-24"
          >
            {grouped && (
              <h2 className="mt-10 border-b border-gray-200 pb-2 text-lg font-bold tracking-tight text-gray-900">
                {group.name}
              </h2>
            )}
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {group.products.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  clientSlug={clientSlug}
                  primaryColor={primaryColor}
                  // Only the first row is worth preloading. Beyond that it
                  // competes with the images the buyer is actually looking at.
                  priority={groupIndex === 0 && i < 2}
                />
              ))}
            </div>
          </section>
        ))
      )}

      <SellerCard owner={owner} />
    </div>
  );
}

/**
 * Who the buyer is dealing with.
 *
 * Handoff Sec 1.2 asks for this on the product page, "so the page stands on
 * its own when it arrives as a link with no other context". It belongs on
 * the storefront for the same reason: this is a stranger deciding whether a
 * business is real, and a name with a phone number attached answers that
 * better than any badge.
 *
 * No banking details here or anywhere else public. Handoff Sec 1.3, and the
 * reason given there is the right one: published account numbers invite
 * impersonation and there is no way to police it.
 */
function SellerCard({
  owner,
}: {
  owner: { business_name: string; city: string | null; call_phone: string | null; whatsapp_phone: string | null; contact_email: string | null };
}) {
  const phone = owner.call_phone ?? owner.whatsapp_phone;
  if (!phone && !owner.contact_email) return null;

  return (
    <div className="mt-12 rounded-2xl border border-gray-200 bg-gray-50 p-5 text-sm">
      <p className="font-semibold text-gray-900">
        Sold by {owner.business_name}
        {owner.city ? `, ${owner.city}` : ""}
      </p>
      <p className="mt-1 text-gray-600">
        Questions before you order? Get hold of us
        {phone ? (
          <>
            {" "}on{" "}
            <a href={`tel:${phone}`} className="font-medium text-gray-900 underline-offset-2 hover:underline">
              {phone}
            </a>
          </>
        ) : null}
        {phone && owner.contact_email ? " or" : ""}
        {owner.contact_email ? (
          <>
            {" "}at{" "}
            <a
              href={`mailto:${owner.contact_email}`}
              className="font-medium text-gray-900 underline-offset-2 hover:underline"
            >
              {owner.contact_email}
            </a>
          </>
        ) : null}
        .
      </p>
    </div>
  );
}
