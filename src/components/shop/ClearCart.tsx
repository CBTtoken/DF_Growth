"use client";

import { useEffect } from "react";
import { useCart } from "@/components/shop/CartProvider";

/**
 * Empties the basket once an order exists.
 *
 * Rendered on the confirmation page rather than fired before submitting, so
 * a failed or abandoned checkout never costs somebody the basket they spent
 * five minutes filling on a phone.
 */
export function ClearCart() {
  const { clear, itemCount, ready } = useCart();

  useEffect(() => {
    if (ready && itemCount > 0) clear();
  }, [ready, itemCount, clear]);

  return null;
}
