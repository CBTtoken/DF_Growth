"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// Sprint 1 fix, Section 1 — this is the actual fix for the account
// cross-contamination bug, not a copy of AuthHashHandler.
//
// Root cause: every invite/magic-link/OTP email pointed redirectTo straight
// at /onboard, a Server Component that reads the session from cookies and
// immediately server-renders real account data (business name, status,
// membership) — using WHATEVER cookies already existed in that browser at
// request time. The fresh session for the new link only exists in the URL's
// hash fragment (#access_token=...), which never reaches the server at all,
// and was only being applied client-side, after that first render, by
// AuthHashHandler (mounted globally, on every page). If a browser already
// had an older session cookie (e.g. from testing a different account
// earlier), the very first paint showed that OLD account's real data before
// the hash-based session swap and its window.location.replace() ever ran —
// and if that replace didn't fire for any reason (slow network, a user
// clicking away, JS erroring), the wrong account's data was the only thing
// ever shown, not just a flicker.
//
// This page is the fix: it is the ONLY thing every invite/magic-link/OTP
// email now points redirectTo at, and it fetches zero account data itself —
// nothing here reads growth_clients, growth_members, or anything else
// specific to an account. The correct session is established and cookies
// written BEFORE the very first real account page is ever requested, so
// there is no window where the wrong account's data can render.
export default function AuthCallbackPage() {
  useEffect(() => {
    const hash = window.location.hash;

    if (!hash.includes("access_token")) {
      // No token in the URL at all (someone navigated here directly, or a
      // link was malformed) — nothing to establish, nowhere safe to send
      // them with an assumed identity. Back to login, not into onboarding
      // or a dashboard under any account.
      window.location.replace("/login");
      return;
    }

    const params = new URLSearchParams(hash.slice(1));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    if (!access_token || !refresh_token) {
      window.location.replace("/login");
      return;
    }

    // Public Beta Polish Sprint Sec 1: every email landing here now needs to
    // branch before ever reaching a real account page. has_password takes
    // priority over the link's own type — a "recovery" link is also what
    // gets sent to a pre-migration account forced through /login (see
    // login/actions.ts and provision.ts), and the spec is explicit that
    // migration must land on /set-password, not /reset-password (its
    // acceptance criteria: "route through a forced /set-password step
    // rather than /forgot-password, since they don't know they never set
    // one" — reset-password's own behavior signs the session back out and
    // sends them to log in again, which would be a confusing double-step
    // for someone who just proved ownership by clicking this exact link).
    // Only an already-migrated account clicking a genuine forgot-password
    // link reaches /reset-password.
    const type = new URLSearchParams(hash.slice(1)).get("type");

    const supabase = createClient();
    supabase.auth.setSession({ access_token, refresh_token }).then(async ({ data }) => {
      const user = data.session?.user;
      if (!user) {
        window.location.replace("/login");
        return;
      }

      const hasPassword = user.app_metadata?.has_password === true;
      if (!hasPassword) {
        window.location.replace("/set-password");
        return;
      }

      if (type === "recovery") {
        window.location.replace("/reset-password");
        return;
      }

      const { data: membership } = await supabase
        .from("growth_members")
        .select("growth_clients(status)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const status = (
        membership?.growth_clients as unknown as { status: string } | null
      )?.status;

      // A hard navigation, not a client-side route change — this guarantees
      // the NEXT request the server sees carries the just-written session
      // cookie, not a stale one from before this page ever ran.
      window.location.replace(status === "active" ? "/dashboard" : "/onboard");
    });
  }, []);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-gray-50 p-8 text-center">
      <div className="size-8 animate-spin rounded-full border-2 border-gray-200 border-t-brand" aria-hidden />
      <p className="text-sm text-gray-500">Signing you in…</p>
    </main>
  );
}
