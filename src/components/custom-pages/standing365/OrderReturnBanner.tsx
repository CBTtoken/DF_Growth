"use client";

import { useEffect, useState } from "react";

type ReturnState = "success" | "failed" | null;

// STANDING365_LANDING_BUILD_SPEC_CLAUDE.md Sec 10. Client-side because the
// page this renders on is force-static (see api/checkout/book-order/verify
// for the full reason) — window.location.search is the only reliable way
// to read Paystack's ?reference= after redirect back, since a static page
// has no real per-request searchParams to read server-side.
export function OrderReturnBanner() {
  const [state, setState] = useState<ReturnState>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference") ?? params.get("trxref");
    if (!reference) return;

    // No separate "checking" state — that would need a synchronous
    // setState right at the top of this effect before the async fetch even
    // starts, which react-hooks' set-state-in-effect rule correctly flags
    // as an avoidable extra render. The fetch is sub-second in practice, so
    // going straight from "nothing shown" to the real success/failed result
    // costs no meaningful UX over a flashed "checking" state.
    fetch(`/api/checkout/book-order/verify?reference=${encodeURIComponent(reference)}`)
      .then((res) => res.json())
      .then((data) => setState(data.status === "success" ? "success" : "failed"))
      .catch(() => setState("failed"));

    // Cleans the reference out of the URL so refreshing the page doesn't
    // re-trigger this banner or re-verify the same transaction again.
    const url = new URL(window.location.href);
    url.searchParams.delete("reference");
    url.searchParams.delete("trxref");
    window.history.replaceState({}, "", url.toString());
  }, []);

  if (!state) return null;

  return (
    <div
      className={`sticky top-0 z-50 px-4 py-3 text-center text-sm font-semibold text-white ${
        state === "success" ? "bg-[#16213E]" : "bg-red-800"
      }`}
    >
      {state === "success"
        ? "Thank you — your order is confirmed! You'll get an email shortly with your batch details."
        : "That payment didn't go through. Please try ordering again below."}
    </div>
  );
}
