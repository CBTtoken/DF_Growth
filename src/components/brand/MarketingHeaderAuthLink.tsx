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
export function MarketingHeaderAuthLink() {
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
      className="whitespace-nowrap text-sm font-medium text-gray-600 transition hover:text-ink"
    >
      {isLoggedIn ? "Dashboard" : "Log in"}
    </Link>
  );
}
