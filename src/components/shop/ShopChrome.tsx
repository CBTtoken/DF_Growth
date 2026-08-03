"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/shop/CartProvider";
import { readableTextOn } from "@/lib/color";

/**
 * The strip at the top of every shop page.
 *
 * Handoff Sec 1.1: the storefront "must feel like part of their site, using
 * their theme, not a generic Growth page." So this carries the member's own
 * logo, their own name and their own colour, and the only thing on it that
 * belongs to us is the link back to their landing page.
 *
 * Sticky because the cart count is the one thing a buyer looks up to check,
 * and a buyer scrolling a phone should never have to scroll back to the top
 * to find out whether the thing they tapped went in.
 */
export function ShopHeader({
  clientSlug,
  businessName,
  logoUrl,
  primaryColor,
}: {
  clientSlug: string;
  businessName: string;
  logoUrl: string | null;
  primaryColor: string;
}) {
  const { itemCount, ready } = useCart();
  const badgeText = readableTextOn(primaryColor);

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href={`/${clientSlug}`} className="flex min-w-0 items-center gap-2.5">
          {logoUrl ? (
            // Height-constrained, width free. A real small-business logo is
            // very often a wide banner lockup with its own background baked
            // in, and forcing one of those into a 36px square renders it as
            // an unreadable smudge. Letting it keep its own proportions costs
            // nothing for a square logo and saves a wide one.
            <Image
              src={logoUrl}
              alt={businessName}
              width={240}
              height={80}
              className="h-9 w-auto max-w-[180px] shrink-0 rounded object-contain sm:max-w-[220px]"
            />
          ) : (
            <span
              className="grid size-9 shrink-0 place-items-center rounded-md font-mono text-xs font-bold"
              style={{ backgroundColor: primaryColor, color: badgeText }}
            >
              {initialsOf(businessName)}
            </span>
          )}
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-gray-900">{businessName}</span>
            <span className="block text-xs text-gray-500">Shop</span>
          </span>
        </Link>

        <Link
          href={`/${clientSlug}/shop/checkout`}
          className="relative flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
          style={{ backgroundColor: primaryColor, color: badgeText }}
        >
          <CartIcon />
          {/* Hidden until the cart has actually been read from the device,
              so a returning buyer never sees a zero flash to three. */}
          <span>{ready && itemCount > 0 ? itemCount : ""}</span>
          <span className="sr-only">Your basket</span>
        </Link>
      </div>
    </header>
  );
}

/**
 * The bar that only appears once there is something in the basket.
 *
 * Sits above the fold of the thumb rather than at the top of the page, which
 * is where a phone buyer's hand already is.
 */
export function CartBar({ clientSlug, primaryColor }: { clientSlug: string; primaryColor: string }) {
  const { itemCount, goodsCents, ready } = useCart();
  if (!ready || itemCount === 0) return null;

  return (
    <div className="sticky bottom-0 z-40 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <span className="text-sm text-gray-700">
          <strong className="font-semibold text-gray-900">
            {itemCount} item{itemCount > 1 ? "s" : ""}
          </strong>{" "}
          · R{(goodsCents / 100).toFixed(2)}
        </span>
        <Link
          href={`/${clientSlug}/shop/checkout`}
          className="rounded-full px-6 py-2.5 text-sm font-semibold shadow-sm"
          style={{ backgroundColor: primaryColor, color: readableTextOn(primaryColor) }}
        >
          Checkout
        </Link>
      </div>
    </div>
  );
}

function CartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 3h2l2.4 12.3a2 2 0 0 0 2 1.7h7.7a2 2 0 0 0 2-1.6L21 7H6" />
      <circle cx="10" cy="20" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="18" cy="20" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
