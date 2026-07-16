"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { confirmReviewerEmail } from "@/lib/reviews/actions";
import { BrandHeader } from "@/components/brand/BrandHeader";

// Reached only via a hard navigation from /review-confirmed, after the
// session was already established — see that page's comment for why this
// split exists. This page's very first render is a genuinely fresh load,
// so the Server Action call below is guaranteed to see the just-written
// session cookie, not a stale one from before the navigation.
export default function ReviewConfirmedFinishPage() {
  const [status, setStatus] = useState<"working" | "done" | "error">("working");

  useEffect(() => {
    confirmReviewerEmail().then((result) => setStatus(result.ok ? "done" : "error"));
  }, []);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-gray-50 p-8 text-center">
      <BrandHeader />
      <div className="flex max-w-md flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-white p-10 shadow-sm">
        {status === "working" && (
          <>
            <div className="size-8 animate-spin rounded-full border-2 border-gray-200 border-t-brand" aria-hidden />
            <p className="text-sm text-gray-500">Confirming your email…</p>
          </>
        )}
        {status === "done" && (
          <>
            <span className="grid size-14 place-items-center rounded-full bg-brand/10 text-2xl text-brand">✓</span>
            <h1 className="text-2xl font-bold tracking-tight text-ink">You&apos;re verified</h1>
            <p className="text-sm text-gray-500">
              Your email is confirmed. If you left a review while waiting, it&apos;s live now.
            </p>
            <Link
              href="/marketplace"
              className="mt-2 inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark"
            >
              Browse the Marketplace
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <span className="grid size-14 place-items-center rounded-full bg-gray-100 text-2xl text-gray-400">?</span>
            <h1 className="text-2xl font-bold tracking-tight text-ink">Something went wrong</h1>
            <p className="text-sm text-gray-500">
              We couldn&apos;t confirm your account just now. Try leaving your review again if it didn&apos;t go
              through.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
