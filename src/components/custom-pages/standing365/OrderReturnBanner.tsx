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

  // Real feedback: success used to be the same slim top strip as failure,
  // and it didn't feel like enough for someone who just bought the book —
  // "make them feel special". Failure stays a slim, actionable strip since
  // it needs a quick nudge to retry, not fanfare; success gets a full,
  // prominent section instead, matching the weight of the Hero it sits
  // above.
  if (state === "failed") {
    return (
      <div className="sticky top-0 z-50 bg-red-800 px-4 py-3 text-center text-sm font-semibold text-white">
        That payment didn&apos;t go through. Please try ordering again below.
      </div>
    );
  }

  return (
    <section className="flex flex-col items-center gap-4 bg-[#B8832A] px-6 py-14 text-center text-[#16213E]">
      <span className="grid size-14 place-items-center rounded-full bg-[#16213E] text-2xl text-[#D6A857]">✓</span>
      <h2 className="font-[family-name:var(--font-s365-serif)] text-2xl sm:text-3xl">
        Thank you — you&apos;re part of the Standing 365 family
      </h2>
      <p className="max-w-xl text-sm leading-relaxed sm:text-base">
        We&apos;ll confirm your expected delivery date by email shortly. If this copy is for you, we hope every
        page meets you exactly where you are. If it&apos;s for someone you love, get ready — they&apos;re about to
        have 365 days that could change everything.
      </p>
    </section>
  );
}
