import { createAdminClient } from "@/lib/supabase/admin";

// Public Beta Polish Sprint Sec 1: the server-side counterpart to
// auth/callback/page.tsx's own status lookup — that one runs client-side
// against the user's own session (RLS-scoped), this one runs from a
// Server Action (the new /login flow) where an admin client is already the
// established pattern (see requireGrowthClientId). Same underlying
// question either way: does this user's most recent growth_client have an
// active status, or do they still belong in onboarding?
export async function resolveLandingPath(userId: string): Promise<"/dashboard" | "/onboard"> {
  const admin = createAdminClient();
  const { data: membership } = await admin
    .from("growth_members")
    .select("growth_clients(status)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const status = (membership?.growth_clients as unknown as { status: string } | null)?.status;
  return status === "active" ? "/dashboard" : "/onboard";
}
