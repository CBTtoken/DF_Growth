"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// Supabase's free-tier email templates can't be customised (needs custom
// SMTP), so magic-link confirmation uses the default hosted verify flow,
// which redirects back here with the session in a URL hash fragment
// (#access_token=...&refresh_token=...) instead of a server-readable query
// param. Fragments never reach the server, so this has to run client-side —
// it establishes the session and then hard-navigates so the server picks up
// the new cookies.
export function AuthHashHandler() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("access_token")) return;

    const params = new URLSearchParams(hash.slice(1));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    if (!access_token || !refresh_token) return;

    const supabase = createClient();
    supabase.auth.setSession({ access_token, refresh_token }).then(() => {
      window.location.replace("/onboard");
    });
  }, []);

  return null;
}
