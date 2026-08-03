"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * SVC's own auth callback, shaped like src/app/auth/callback/page.tsx and
 * for the same hard-won reason: the session from an emailed link lives in
 * the URL hash fragment, which never reaches the server, so it must be
 * established client-side before any account page is requested. This page
 * fetches zero account data and only ever forwards within SVC.
 *
 * The prefix is derived from the current location rather than the host
 * module, because this is a client component: if the path starts with /svc
 * the prefix is needed, otherwise the proxy is stripping it.
 */
export default function SvcAuthCallbackPage() {
  useEffect(() => {
    const prefix = window.location.pathname.startsWith("/svc") ? "/svc" : "";
    const hash = window.location.hash;

    if (!hash.includes("access_token")) {
      window.location.replace(`${prefix}/login`);
      return;
    }

    const params = new URLSearchParams(hash.slice(1));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    const type = params.get("type");
    if (!access_token || !refresh_token) {
      window.location.replace(`${prefix}/login`);
      return;
    }

    const supabase = createClient();
    supabase.auth.setSession({ access_token, refresh_token }).then(({ data }) => {
      if (!data.session?.user) {
        window.location.replace(`${prefix}/login`);
        return;
      }
      // A hard navigation so the next server-rendered request carries the
      // just-written session cookie.
      window.location.replace(
        type === "recovery" ? `${prefix}/reset-password` : `${prefix}/account`
      );
    });
  }, []);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-svc-cream p-8 text-center">
      <p className="text-base text-svc-ink/70">One moment, signing you in.</p>
    </main>
  );
}
