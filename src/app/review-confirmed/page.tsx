"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BrandHeader } from "@/components/brand/BrandHeader";

// Rate & Review Sprint 1. Deliberately not reusing /auth/callback — that
// page's has_password/type=recovery branching exists entirely to solve
// business-account migration history that doesn't apply to reviewer
// accounts (they always set a real password at signup, never a
// pre-migration account). A dedicated route keeps that already-complex,
// business-critical auth code untouched rather than adding a third
// account type's branches into it.
//
// Found via a real live test: calling the confirmReviewerEmail Server
// Action directly after setSession() intermittently read the PREVIOUS
// session (or failed entirely) when a different account was already
// logged in in the same browser — Supabase confirmed the email correctly
// server-side either way, but this page showed "error" regardless. A hard
// navigation to /review-confirmed/finish, exactly the technique
// /auth/callback already uses and explains in its own comment, guarantees
// the next request is a genuinely fresh page load with the just-written
// cookie, not a fetch that might race it.
export default function ReviewConfirmedPage() {
  const [status, setStatus] = useState<"working" | "error">("working");

  useEffect(() => {
    async function establishSession(): Promise<boolean> {
      const hash = window.location.hash;
      if (!hash.includes("access_token")) return false;

      const params = new URLSearchParams(hash.slice(1));
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      if (!access_token || !refresh_token) return false;

      const supabase = createClient();
      const { data } = await supabase.auth.setSession({ access_token, refresh_token });
      return !!data.session?.user;
    }

    establishSession().then((ok) => {
      if (ok) {
        window.location.replace("/review-confirmed/finish");
      } else {
        setStatus("error");
      }
    });
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
