import Image from "next/image";
import Link from "next/link";
import {
  fromPriceCents,
  hasChoices,
  isSoldOut,
  shopImageUrl,
  PRICE_ON_REQUEST,
  type StorefrontProduct,
} from "@/lib/shop/queries";

/**
 * One product in a grid, and the thing it must do is get tapped.
 *
 * A card is a link to the product page and nothing else. There is no add to
 * basket button on it, deliberately: a buyer who has never bought from this
 * seller is not ready to commit from a thumbnail, and the page is where the
 * description, the other photos and the delivery terms live. The old shop
 * had the opposite arrangement, an add button on a card and no page at all,
 * which asked for the decision before showing anything to decide on.
 */
export function ProductCard({
  product,
  clientSlug,
  primaryColor,
  priority = false,
}: {
  product: StorefrontProduct;
  clientSlug: string;
  primaryColor: string;
  priority?: boolean;
}) {
  const image = product.image_paths[0];
  const soldOut = isSoldOut(product);
  const from = fromPriceCents(product);

  return (
    <Link
      href={`/${clientSlug}/shop/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:border-gray-300 hover:shadow-md"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
        {image ? (
          <Image
            src={shopImageUrl(image)}
            alt={product.title}
            fill
            // Two per row on a phone, four on a desktop. Without this,
            // next/image serves a desktop-width file to a phone on mobile
            // data, which is the single easiest way to make a shop feel slow.
            sizes="(max-width: 640px) 50vw, 25vw"
            priority={priority}
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <span
            className="grid size-full place-items-center text-2xl font-bold opacity-40"
            style={{ color: primaryColor }}
            aria-hidden
          >
            {product.title.slice(0, 1).toUpperCase()}
          </span>
        )}
        {soldOut && (
          <span className="absolute left-2 top-2 rounded-full bg-gray-900/85 px-2.5 py-1 text-[11px] font-semibold text-white">
            Sold out
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-2 text-sm font-semibold text-gray-900">{product.title}</p>
        {product.price_pending ? (
          // Never a zero. The stand-in figure in the database is not a price
          // and must never be shown to a buyer as one.
          <p className="mt-auto pt-1 text-sm font-semibold text-gray-500">{PRICE_ON_REQUEST}</p>
        ) : (
          <p className="mt-auto pt-1 text-sm font-bold" style={{ color: primaryColor }}>
            {/* "From" only when the options genuinely cost different amounts.
                Printing "From R120" on a product with one price reads as a
                starting figure that goes up later, which is the opposite of
                what it says. */}
            {hasChoices(product) && from !== product.base_price_cents ? "From " : ""}R
            {(from / 100).toFixed(2)}
          </p>
        )}
      </div>
    </Link>
  );
}
