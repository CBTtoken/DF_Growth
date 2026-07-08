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
//
// Where to send them next isn't guessable from the link itself — Supabase's
// hosted verify flow doesn't reliably preserve a requested path, only the
// origin. So this checks the account's actual status instead: still mid
// setup goes to /onboard, an already-active account (any login after the
// first) goes to /dashboard. This is also just the correct real-world
// behavior, not a workaround — a returning client should never be dropped
// back into the wizard.
export function AuthHashHandler() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("access_token")) return;

    const params = new URLSearchParams(hash.slice(1));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    if (!access_token || !refresh_token) return;

    const supabase = createClient();
    supabase.auth.setSession({ access_token, refresh_token }).then(async ({ data }) => {
      const userId = data.session?.user.id;
      if (!userId) {
        window.location.replace("/onboard");
        return;
      }

      const { data: membership } = await supabase
        .from("growth_members")
        .select("growth_clients(status)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const status = (
        membership?.growth_clients as unknown as { status: string } | null
      )?.status;

      window.location.replace(status === "active" ? "/dashboard" : "/onboard");
    });
  }, []);

  return null;
}
