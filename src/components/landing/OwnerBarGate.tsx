"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { OwnerBar } from "@/components/landing/OwnerBar";

// Cold-start/caching fix, revisited per Task #12 (parked earlier this
// project, revisited now that a real launch push is closer).
//
// Root cause found: reading a visitor's auth session server-side (via
// next/headers' cookies(), inside createServerClient()) is a Next.js
// "Dynamic API" — using it anywhere in a route's render path forces that
// entire route to render fresh on every single request, unconditionally
// bypassing static rendering and ISR regardless of any `revalidate`
// export. Confirmed live: production was serving Cache-Control:
// no-store/must-revalidate and X-Vercel-Cache: MISS on every request,
// not intermittently — this page was never actually eligible for caching
// at all, so `export const revalidate = 60` had nothing to apply to.
//
// The only thing on this page that genuinely needs per-visitor session
// data is whether to show the owner-only "manage this page" bar — moving
// that one check to the client removes the sole reason the whole page's
// Server Component needed cookies() in the first place. Safe by
// construction: this queries growth_members with the anon key, scoped by
// RLS's own "members read own membership" policy (user_id = auth.uid()),
// the exact same authorization the server-side check was enforcing —
// just now evaluated by Postgres itself rather than duplicated in app
// code, and after the page has already rendered instead of blocking it.
export function OwnerBarGate({ growthClientId }: { growthClientId: string }) {
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkOwnership() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data: membership } = await supabase
        .from("growth_members")
        .select("id")
        .eq("user_id", user.id)
        .eq("growth_client_id", growthClientId)
        .maybeSingle();

      if (!cancelled && membership) setIsOwner(true);
    }

    checkOwnership();
    return () => {
      cancelled = true;
    };
  }, [growthClientId]);

  if (!isOwner) return null;
  return <OwnerBar />;
}
