import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client scoped to the svc database schema.
 *
 * Every SVC table lives in the svc schema (handoff 3.2), and every read and
 * write goes through this client in a server action or route handler where
 * the entitlement check lives. RLS is enabled on every svc table with no
 * anon/authenticated policies, so this is the only way in by construction.
 *
 * The svc schema must be listed in the Supabase API's exposed schemas
 * (dashboard, Settings > API) or every query here fails with a
 * schema-not-found error. That is a one-time operator step recorded in the
 * Sprint 1 report.
 *
 * persistSession/autoRefreshToken disabled for the same reason
 * src/lib/supabase/admin.ts documents: this client authenticates with a
 * static key and must not set up a token-refresh state machine per call
 * site.
 */
export function createSvcClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      db: { schema: "svc" },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}
