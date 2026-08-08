"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useCart } from "@/components/shop/CartProvider";
import { OptionPicker, PILL_LIMIT } from "@/components/shop/OptionPicker";
import { readableTextOn } from "@/lib/color";
import {
  shopImageUrl,
  variantPriceCents,
  PRICE_ON_REQUEST,
  type ShopVariant,
  type StorefrontProduct,
} from "@/lib/shop/queries";

/**
 * The product page's interactive half: pictures, options, one buy action.
 *
 * Handoff Sec 1.2 lists what has to be here and Sec 1.2 also sets the tone:
 * "Phone first. Light. A buyer on mobile data must see the product and the
 * price without waiting." So the first image is a real priority image and
 * the rest are only fetched if somebody taps a thumbnail, and there is
 * exactly one button that buys.
 */
export function ProductDetail({
  product,
  clientSlug,
  primaryColor,
  deliveryLine,
}: {
  product: StorefrontProduct;
  clientSlug: string;
  primaryColor: string;
  deliveryLine: string;
}) {
  const { add } = useCart();

  // Only options with something written on them are a real choice. A
  // product created through the ordinary form has one blank variant
  // carrying its stock, which is a storage detail and not something to make
  // a buyer pick from a list of one.
  const options = useMemo(
    () => product.variants.filter((v) => Object.keys(v.descriptor ?? {}).length > 0),
    [product.variants]
  );
  const defaultVariant = options[0] ?? product.variants[0] ?? null;

  const [variantId, setVariantId] = useState<string | null>(defaultVariant?.id ?? null);
  const [imageIndex, setImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const selected = product.variants.find((v) => v.id === variantId) ?? defaultVariant;
  const priceCents = variantPriceCents(product, selected);

  // A product that does not track stock is never out of it. See
  // lib/shop/queries.ts for why that is the default rather than a lenience.
  const outOfStock = product.track_stock && (selected?.stock_quantity ?? 0) <= 0;
  const lowStock =
    product.track_stock && !outOfStock && (selected?.stock_quantity ?? 0) > 0 && (selected?.stock_quantity ?? 0) <= 5;

  const buttonText = readableTextOn(primaryColor);
  const images = product.image_paths;

  function handleAdd() {
    if (outOfStock) return;
    add(
      {
        productId: product.id,
        variantId: selected?.id ?? null,
        productSlug: product.slug,
        title: product.title,
        variantLabel: labelOf(selected),
        unitPriceCents: priceCents,
        imagePath: images[0] ?? null,
      },
      quantity
    );
    setAdded(true);
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 sm:gap-10">
      <div className="flex flex-col gap-3">
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-gray-100">
          {images.length > 0 ? (
            <Image
              src={shopImageUrl(images[imageIndex] ?? images[0])}
              alt={product.title}
              fill
              sizes="(max-width: 640px) 100vw, 45vw"
              priority
              className="object-cover"
            />
          ) : (
            <span
              className="grid size-full place-items-center text-5xl font-bold opacity-30"
              style={{ color: primaryColor }}
              aria-hidden
            >
              {product.title.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>

        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((path, i) => (
              <button
                key={path}
                type="button"
                onClick={() => setImageIndex(i)}
                aria-label={`Picture ${i + 1} of ${images.length}`}
                aria-current={i === imageIndex}
                className={`relative size-16 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                  i === imageIndex ? "border-gray-900" : "border-transparent opacity-70"
                }`}
              >
                <Image src={shopImageUrl(path)} alt="" fill sizes="64px" className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{product.title}</h1>
          {product.price_pending ? (
            <p className="mt-2 text-lg font-semibold text-gray-500">{PRICE_ON_REQUEST}</p>
          ) : (
            <p className="mt-2 text-2xl font-extrabold" style={{ color: primaryColor }}>
              R{(priceCents / 100).toFixed(2)}
            </p>
          )}
        </div>

        {product.description && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-600">{product.description}</p>
        )}

        {/* Shop audit fix, 4 Aug 2026: with exactly one named option the
            picker collapsed entirely and the buyer first learned they had
            ordered "Large" on the confirmation page. One real option is
            still information; it is just not a choice. */}
        {options.length === 1 && labelOf(options[0]) && (
          <p className="text-sm text-gray-600">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Option:</span>{" "}
            {labelOf(options[0])}
          </p>
        )}

        {/* Past a dozen the pills below stop being a choice and become a
            paragraph to read, so the same options become a searchable list.
            See OptionPicker for why the threshold sits where it does. */}
        {options.length > PILL_LIMIT && (
          <OptionPicker
            options={options}
            selectedId={selected?.id ?? null}
            onSelect={(id) => {
              setVariantId(id);
              setAdded(false);
            }}
            primaryColor={primaryColor}
            trackStock={product.track_stock}
          />
        )}

        {options.length > 1 && options.length <= PILL_LIMIT && (
          <fieldset className="flex flex-col gap-2">
            <legend className="text-xs font-semibold uppercase tracking-wide text-gray-500">Choose an option</legend>
            <div className="flex flex-wrap gap-2">
              {options.map((option) => {
                const disabled = product.track_stock && option.stock_quantity <= 0;
                const active = option.id === selected?.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setVariantId(option.id);
                      setAdded(false);
                    }}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      active ? "border-transparent text-white" : "border-gray-300 text-gray-700 hover:border-gray-400"
                    }`}
                    style={active ? { backgroundColor: primaryColor, color: buttonText } : undefined}
                  >
                    {labelOf(option)}
                    {disabled ? " (sold out)" : ""}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        {/* Stock is only ever mentioned when the member is counting it.
            Handoff Sec 1.2: "Stock status if the member tracks stock,
            otherwise nothing." */}
        {product.track_stock && (
          <p className={`text-sm font-medium ${outOfStock ? "text-red-600" : lowStock ? "text-amber-700" : "text-green-700"}`}>
            {outOfStock
              ? "Sold out at the moment"
              : lowStock
                ? `Only ${selected?.stock_quantity} left`
                : "In stock"}
          </p>
        )}

        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600" htmlFor="shop-quantity">
            Quantity
          </label>
          <div className="flex items-center rounded-full border border-gray-300">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="size-10 text-lg font-semibold text-gray-600"
              aria-label="One fewer"
            >
              −
            </button>
            <input
              id="shop-quantity"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              className="w-12 border-0 bg-transparent text-center text-sm font-semibold text-gray-900 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="size-10 text-lg font-semibold text-gray-600"
              aria-label="One more"
            >
              +
            </button>
          </div>
        </div>

        {/* A product waiting for its price cannot be bought, and is not
            offered as though it could be. The stand-in zero in the database
            must never reach a basket. */}
        {product.price_pending ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm">
            <p className="font-semibold text-gray-800">Not yet available to order online</p>
            <p className="mt-1 text-gray-600">
              We are still setting the price for this one. Get in touch and we will give you a
              price and take your order directly.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleAdd}
            disabled={outOfStock}
            className="w-full rounded-full px-6 py-4 text-base font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: primaryColor, color: buttonText }}
          >
            {outOfStock ? "Sold out" : "Add to basket"}
          </button>
        )}

        {added && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
            <span className="font-medium text-gray-700">Added to your basket.</span>
            <Link
              href={`/${clientSlug}/shop/checkout`}
              className="font-semibold underline-offset-2 hover:underline"
              style={{ color: primaryColor }}
            >
              Go to checkout
            </Link>
          </div>
        )}

        <p className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">{deliveryLine}</p>
      </div>
    </div>
  );
}

function labelOf(variant: ShopVariant | null | undefined): string {
  return Object.values(variant?.descriptor ?? {})
    .filter(Boolean)
    .join(", ");
}
