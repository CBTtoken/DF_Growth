"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * The buyer's basket, held in their own browser.
 *
 * Handoff Sec 1.3: "Guest checkout. No account creation to buy anything,
 * ever." Which rules out a server-side cart, because a server-side cart
 * needs something to key on and the only honest options are an account or a
 * cookie we would then have to explain in a privacy policy. localStorage is
 * the buyer's own device, survives the walk from the storefront to a product
 * page and back, and disappears when they clear their browser.
 *
 * Everything stored here is display-only. The line a buyer sees is a
 * snapshot taken when they added it, and the server re-reads every price,
 * every variant and every stock number from the database at checkout before
 * charging anybody anything. A cart is a note about what somebody wants, not
 * a source of truth about what it costs.
 */

export type CartLineSnapshot = {
  productId: string;
  variantId: string | null;
  /** For the link back to the product page from the cart. */
  productSlug: string;
  title: string;
  /** "Small", "Blue", or empty when the product has no options. */
  variantLabel: string;
  unitPriceCents: number;
  imagePath: string | null;
  quantity: number;
};

type CartContextValue = {
  lines: CartLineSnapshot[];
  /** False until localStorage has been read, so nothing flashes an empty cart. */
  ready: boolean;
  itemCount: number;
  goodsCents: number;
  add: (line: Omit<CartLineSnapshot, "quantity">, quantity?: number) => void;
  setQuantity: (productId: string, variantId: string | null, quantity: number) => void;
  remove: (productId: string, variantId: string | null) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const storageKey = (clientSlug: string) => `df-shop-cart:${clientSlug}`;

const sameLine = (a: CartLineSnapshot, productId: string, variantId: string | null) =>
  a.productId === productId && (a.variantId ?? null) === variantId;

export function CartProvider({
  clientSlug,
  children,
}: {
  clientSlug: string;
  children: React.ReactNode;
}) {
  const [lines, setLines] = useState<CartLineSnapshot[]>([]);
  const [ready, setReady] = useState(false);

  // Read once on mount rather than during render.
  //
  // react-hooks/set-state-in-effect is disabled here deliberately, and the
  // rule's own escape clause is the reason: an effect may "subscribe for
  // updates from some external system", and localStorage is exactly that.
  // The alternative it usually pushes you towards, reading in a useState
  // initialiser, cannot work on this page. That initialiser runs on the
  // server too, where there is no localStorage, so the server renders an
  // empty basket and the client renders a full one, and the result is a
  // hydration mismatch that only shows up for the returning buyer with
  // something already in their basket. The single extra render this costs
  // happens once per page load and is what `ready` exists to cover.
  useEffect(() => {
    let restored: CartLineSnapshot[] = [];
    try {
      const raw = window.localStorage.getItem(storageKey(clientSlug));
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) restored = parsed;
    } catch {
      // A corrupt or unreadable basket is an empty basket. There is nothing
      // useful to tell a buyer here and nothing they could do about it.
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading the buyer's own device on mount, see above
    setLines(restored);
    setReady(true);
  }, [clientSlug]);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(storageKey(clientSlug), JSON.stringify(lines));
    } catch {
      // Private browsing modes and full storage both throw. The cart still
      // works for this page view, which is the whole of what matters.
    }
  }, [lines, ready, clientSlug]);

  const add = useCallback((line: Omit<CartLineSnapshot, "quantity">, quantity = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => sameLine(l, line.productId, line.variantId ?? null));
      if (existing) {
        return prev.map((l) =>
          sameLine(l, line.productId, line.variantId ?? null)
            ? { ...l, quantity: l.quantity + quantity }
            : l
        );
      }
      return [...prev, { ...line, quantity }];
    });
  }, []);

  const setQuantity = useCallback((productId: string, variantId: string | null, quantity: number) => {
    setLines((prev) =>
      quantity <= 0
        ? prev.filter((l) => !sameLine(l, productId, variantId))
        : prev.map((l) => (sameLine(l, productId, variantId) ? { ...l, quantity } : l))
    );
  }, []);

  const remove = useCallback((productId: string, variantId: string | null) => {
    setLines((prev) => prev.filter((l) => !sameLine(l, productId, variantId)));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      ready,
      itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
      goodsCents: lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0),
      add,
      setQuantity,
      remove,
      clear,
    }),
    [lines, ready, add, setQuantity, remove, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside a CartProvider");
  return context;
}
