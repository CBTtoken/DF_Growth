"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// Task #12 cold-start fix: same pattern as OwnerBarGate — the previous
// server-side auth.getUser() check here (via createServerClient(), which
// reads cookies()) was a Next.js Dynamic API, forcing every page that
// rendered MarketingHeader (/pricing, /privacy, /terms) to bypass static
// rendering and ISR entirely on every request. Starts as "Log in" (the
// correct default for the overwhelming majority of visitors, who aren't
// logged in) and swaps to "Dashboard" after the client-side check
// resolves, rather than blocking the page render on it.
// className is overridable so MobileNavMenu can render this as a full-width
// row matching its other menu items, instead of the compact inline-nav
// style this uses in the desktop header bar.
export function MarketingHeaderAuthLink({ className }: { className?: string } = {}) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        if (!cancelled && user) setIsLoggedIn(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Link
      href={isLoggedIn ? "/dashboard" : "/login"}
      className={className ?? "whitespace-nowrap text-xs font-medium text-gray-600 transition hover:text-ink sm:text-sm"}
    >
      {isLoggedIn ? "Dashboard" : "Log in"}
    </Link>
  );
}
