import Image from "next/image";
import Link from "next/link";
import { supportingAccent, withAlpha } from "@/lib/color";
import {
  fromPriceCents,
  hasChoices,
  isSoldOut,
  optionSummary,
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
 * description, the other photos and the delivery terms live.
 *
 * The no-photo state is designed rather than left to fail. Most members
 * arrive with no product photography at all, and a grey box with a letter in
 * it makes a real business look abandoned. Instead the tile becomes a tinted
 * field in the member's own two colours with the product's initial set in
 * the heading serif, which reads as a deliberate monogram rather than a
 * missing image. It should still be replaced by a real photograph, and the
 * dashboard says so, but the shop does not look broken while it waits.
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
  const accent = supportingAccent(primaryColor);
  const options = optionSummary(product);

  return (
    <Link
      href={`/${clientSlug}/shop/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition duration-200 hover:-translate-y-0.5 hover:border-transparent hover:shadow-xl"
    >
      <div className="relative aspect-square w-full overflow-hidden">
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
            className="object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <span
            aria-hidden
            className="grid size-full place-items-center"
            style={{
              backgroundImage: `linear-gradient(135deg, ${withAlpha(primaryColor, 0.14)}, ${withAlpha(accent, 0.18)})`,
            }}
          >
            <span
              className="text-4xl font-bold opacity-70 font-[family-name:var(--font-anchor-serif)]"
              style={{ color: primaryColor }}
            >
              {product.title.slice(0, 1).toUpperCase()}
            </span>
          </span>
        )}

        {soldOut && (
          <span className="absolute left-2 top-2 rounded-full bg-gray-900/85 px-2.5 py-1 text-[11px] font-semibold text-white">
            Sold out
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 border-t border-gray-100 p-3.5">
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900">{product.title}</p>
        {/* "51 fragrances" is the single most useful thing a card can add
            here. Without it a tile selling one bottle and a tile selling the
            whole range look identical, and the buyer has to open both. */}
        {options && <p className="text-xs text-gray-500">{options} to choose from</p>}
        {product.price_pending ? (
          // Never a zero. The stand-in figure in the database is not a price
          // and must never be shown to a buyer as one. Set in the supporting
          // accent so it reads as a different kind of thing to a price.
          <span
            className="mt-auto w-fit rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{ backgroundColor: withAlpha(accent, 0.16), color: accent }}
          >
            {PRICE_ON_REQUEST}
          </span>
        ) : (
          <p className="mt-auto pt-1 text-base font-bold" style={{ color: primaryColor }}>
            {/* "From" only when the options genuinely cost different amounts.
                Printing "From R120" on a product with one price reads as a
                starting figure that goes up later, which is the opposite of
                what it says. */}
            {hasChoices(product) && from !== product.base_price_cents ? (
              <span className="text-xs font-medium text-gray-500">From </span>
            ) : null}
            R{(from / 100).toFixed(2)}
          </p>
        )}
      </div>
    </Link>
  );
}
