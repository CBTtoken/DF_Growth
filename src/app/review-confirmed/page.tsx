"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { confirmReviewerEmail } from "@/lib/reviews/actions";
import { BrandHeader } from "@/components/brand/BrandHeader";

// Rate & Review Sprint 1. Deliberately not reusing /auth/callback — that
// page's has_password/type=recovery branching exists entirely to solve
// business-account migration history that doesn't apply to reviewer
// accounts (they always set a real password at signup, never a
// pre-migration account). A dedicated route keeps that already-complex,
// business-critical auth code untouched rather than adding a third
// account type's branches into it.
//
// No hard navigation after setSession() (unlike /auth/callback) — this
// page doesn't hand off to a different SSR page whose own render could
// race a stale cookie, it just calls one Server Action directly afterward.
// A same-origin fetch always carries whatever cookies the browser has at
// that moment, so the just-written session cookie is already there.
export default function ReviewConfirmedPage() {
  const [status, setStatus] = useState<"working" | "done" | "error">("working");

  useEffect(() => {
    // Every branch resolves through this one promise rather than calling
    // setState synchronously anywhere in the effect body, including the
    // early-return guard clauses below.
    async function confirmFromHash(): Promise<"done" | "error"> {
      const hash = window.location.hash;
      if (!hash.includes("access_token")) return "error";

      const params = new URLSearchParams(hash.slice(1));
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      if (!access_token || !refresh_token) return "error";

      const supabase = createClient();
      const { data } = await supabase.auth.setSession({ access_token, refresh_token });
      if (!data.session?.user) return "error";

      const result = await confirmReviewerEmail();
      return result.ok ? "done" : "error";
    }

    confirmFromHash().then(setStatus);
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
            <h1 className="text-2xl font-bold tracking-tight text-ink">Link not recognized</h1>
            <p className="text-sm text-gray-500">
              This confirmation link looks incomplete or already used. Try leaving your review again if it didn&apos;t
              go through.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
