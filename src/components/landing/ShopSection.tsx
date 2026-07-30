"use client";

import { useMemo, useState, useActionState } from "react";
import { createShopOrder, type CartLine } from "@/app/[clientSlug]/shop-actions";
import { readableTextOn } from "@/lib/color";

export type PublicShopProduct = {
  id: string;
  title: string;
  description: string | null;
  base_price_cents: number;
  sale_count: number;
};

// docs/GROWTH_BOOKING_SHOP_MODULES_CLAUDE.md Sec 4.3: "the top 3 best-
// performing items surface automatically at the top" — done client-side
// here from the already-fetched product list (sorted by sale_count),
// rather than a second query, since the full list is already on the page.
export function ShopSection({
  growthClientId,
  ownerEmail,
  businessName,
  primaryColor,
  products,
  flatDeliveryCents = 0,
  freeDeliveryOverCents = null,
}: {
  growthClientId: string;
  ownerEmail: string | null;
  businessName: string;
  primaryColor: string;
  products: PublicShopProduct[];
  flatDeliveryCents?: number;
  freeDeliveryOverCents?: number | null;
}) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [showCheckout, setShowCheckout] = useState(false);

  const topProducts = useMemo(() => [...products].sort((a, b) => b.sale_count - a.sale_count).slice(0, 3), [products]);
  const topIds = new Set(topProducts.map((p) => p.id));
  const restProducts = products.filter((p) => !topIds.has(p.id));

  const cartLines: CartLine[] = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([productId, quantity]) => ({ productId, quantity }));
  const cartCount = cartLines.reduce((sum, l) => sum + l.quantity, 0);
  const goodsCents = cartLines.reduce((sum, l) => {
    const product = products.find((p) => p.id === l.productId);
    return sum + (product?.base_price_cents ?? 0) * l.quantity;
  }, 0);

  // Mirrors the server's calculation in shop-actions.ts. Shown here so the
  // buyer knows what delivery costs before they start typing an address,
  // not after. The server decides the real figure, and this only ever has
  // to agree with it: a coupon is applied server side, so a discount can
  // push an order over a free-delivery line here without this knowing,
  // which errs towards quoting more than is charged rather than less.
  const deliveryCents =
    freeDeliveryOverCents != null && goodsCents >= freeDeliveryOverCents ? 0 : flatDeliveryCents;
  const cartTotalCents = goodsCents + deliveryCents;
  const deliveryIsFree = deliveryCents === 0;

  function addToCart(productId: string) {
    setCart((prev) => ({ ...prev, [productId]: (prev[productId] ?? 0) + 1 }));
  }

  if (products.length === 0) return null;

  return (
    <section id="shop" className="bg-white px-4 py-12 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Shop</h2>

        {topProducts.length > 0 && (
          <div className="mt-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Most popular</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {topProducts.map((p) => (
                <ProductCard key={p.id} product={p} quantity={cart[p.id] ?? 0} onAdd={() => addToCart(p.id)} primaryColor={primaryColor} />
              ))}
            </div>
          </div>
        )}

        {restProducts.length > 0 && (
          <div className="mt-10">
            {topProducts.length > 0 && <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">All products</p>}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {restProducts.map((p) => (
                <ProductCard key={p.id} product={p} quantity={cart[p.id] ?? 0} onAdd={() => addToCart(p.id)} primaryColor={primaryColor} />
              ))}
            </div>
          </div>
        )}

        {cartCount > 0 && (
          <div className="sticky bottom-4 mt-8 flex items-center justify-between gap-4 rounded-2xl bg-gray-900 px-6 py-4 text-white shadow-xl">
            {/* Delivery named on the bar itself, not saved for the last
                screen. A total that grows after someone has committed to
                buying is the single most common reason a cart gets
                abandoned, and it is avoidable by saying it here. */}
            <span className="text-sm font-medium">
              {cartCount} item{cartCount > 1 ? "s" : ""} · R{(cartTotalCents / 100).toFixed(2)}
              {flatDeliveryCents > 0 && (
                <span className="block text-xs font-normal text-gray-300">
                  {deliveryIsFree
                    ? "Delivery included"
                    : `Includes R${(deliveryCents / 100).toFixed(2)} delivery`}
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={() => setShowCheckout(true)}
              className="rounded-full px-5 py-2 text-sm font-semibold"
              style={{ backgroundColor: primaryColor, color: readableTextOn(primaryColor) }}
            >
              Checkout
            </button>
          </div>
        )}

        {showCheckout && (
          <CheckoutForm
            growthClientId={growthClientId}
            ownerEmail={ownerEmail}
            businessName={businessName}
            primaryColor={primaryColor}
            cartLines={cartLines}
            cartTotalCents={cartTotalCents}
            goodsCents={goodsCents}
            deliveryCents={deliveryCents}
            onClose={() => setShowCheckout(false)}
          />
        )}
      </div>
    </section>
  );
}

function ProductCard({
  product,
  quantity,
  onAdd,
  primaryColor,
}: {
  product: PublicShopProduct;
  quantity: number;
  onAdd: () => void;
  primaryColor: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-gray-100 p-4 shadow-sm">
      <p className="font-semibold text-gray-900">{product.title}</p>
      {product.description && <p className="line-clamp-2 text-xs text-gray-500">{product.description}</p>}
      <div className="mt-auto flex items-center justify-between pt-2">
        <span className="font-bold" style={{ color: primaryColor }}>
          R{(product.base_price_cents / 100).toFixed(2)}
        </span>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-full px-3 py-1.5 text-xs font-semibold"
          style={{ backgroundColor: primaryColor, color: readableTextOn(primaryColor) }}
        >
          {quantity > 0 ? `Add (${quantity})` : "Add to cart"}
        </button>
      </div>
    </div>
  );
}

function CheckoutForm({
  growthClientId,
  ownerEmail,
  businessName,
  primaryColor,
  cartLines,
  cartTotalCents,
  goodsCents,
  deliveryCents,
  onClose,
}: {
  growthClientId: string;
  ownerEmail: string | null;
  businessName: string;
  primaryColor: string;
  cartLines: CartLine[];
  cartTotalCents: number;
  goodsCents: number;
  deliveryCents: number;
  onClose: () => void;
}) {
  const boundAction = createShopOrder.bind(null, growthClientId, ownerEmail, businessName, cartLines);
  const [state, formAction, pending] = useActionState(boundAction, null);
  const buttonTextColor = readableTextOn(primaryColor);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {state?.success ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <span aria-hidden className="grid size-12 place-items-center rounded-full text-2xl" style={{ backgroundColor: `${primaryColor}1a`, color: primaryColor }}>
              ✓
            </span>
            <h3 className="mt-2 text-xl font-bold text-gray-900">Order received!</h3>
            <p className="max-w-sm text-gray-500">{businessName} will be in touch shortly to arrange payment and delivery.</p>
            <button type="button" onClick={onClose} className="mt-4 text-sm font-semibold underline-offset-2 hover:underline" style={{ color: primaryColor }}>
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Checkout: R{(cartTotalCents / 100).toFixed(2)}</h3>
              <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            {/* Broken out rather than one number, because "R374" and
                "R299 plus R75 delivery" are the same amount and only one of
                them answers the question the buyer is about to ask. */}
            <dl className="mb-4 flex flex-col gap-1 rounded-xl bg-gray-50 p-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <dt>Items</dt>
                <dd>R{(goodsCents / 100).toFixed(2)}</dd>
              </div>
              <div className="flex justify-between text-gray-600">
                <dt>Delivery</dt>
                <dd>{deliveryCents === 0 ? "Included" : `R${(deliveryCents / 100).toFixed(2)}`}</dd>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-1 font-semibold text-gray-900">
                <dt>Total</dt>
                <dd>R{(cartTotalCents / 100).toFixed(2)}</dd>
              </div>
            </dl>
            <form action={formAction} className="flex flex-col gap-3">
              <input name="customerName" placeholder="Name" required className="h-11 rounded-xl border border-gray-300 px-3 text-gray-900 placeholder:text-gray-400" />
              <input name="customerEmail" type="email" placeholder="Email" required className="h-11 rounded-xl border border-gray-300 px-3 text-gray-900 placeholder:text-gray-400" />
              <input name="customerPhone" type="tel" placeholder="Phone (optional)" className="h-11 rounded-xl border border-gray-300 px-3 text-gray-900 placeholder:text-gray-400" />
              <input name="line1" placeholder="Delivery address" required className="h-11 rounded-xl border border-gray-300 px-3 text-gray-900 placeholder:text-gray-400" />
              <div className="grid grid-cols-2 gap-2">
                <input name="city" placeholder="City" required className="h-11 rounded-xl border border-gray-300 px-3 text-gray-900 placeholder:text-gray-400" />
                <input name="postalCode" placeholder="Postal code" required className="h-11 rounded-xl border border-gray-300 px-3 text-gray-900 placeholder:text-gray-400" />
              </div>
              <input name="couponCode" placeholder="Coupon code (optional)" className="h-11 rounded-xl border border-gray-300 px-3 text-gray-900 placeholder:text-gray-400" />

              {state?.error?._form && <p className="text-sm text-red-600">{state.error._form[0]}</p>}

              <button
                type="submit"
                disabled={pending}
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-base font-semibold shadow-lg disabled:opacity-50"
                style={{ backgroundColor: primaryColor, color: buttonTextColor }}
              >
                {pending ? "Placing order..." : "Place order"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
