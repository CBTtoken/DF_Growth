import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client. Bypasses RLS entirely — every call site is responsible
// for its own authorization check before touching tenant data (growth_client_id
// scoping). Never expose this client or its key to the browser.
//
// Sprint 1, Build Item 7 (connection pooling audit): this client never has
// or needs a user session — it authenticates purely via the static service
// role key. Without persistSession/autoRefreshToken explicitly disabled,
// supabase-js sets up a full auth state machine (including a background
// token-refresh timer) by default on every single call site, of which
// there are dozens across this codebase. In a serverless function that
// stays warm across multiple invocations, those timers accumulate with
// nothing ever tearing them down — real, if slow-building, overhead for a
// client that was never going to refresh anything in the first place.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
