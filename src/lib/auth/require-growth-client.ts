import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Shared by every authenticated Server Action (onboard wizard, dashboard):
// resolves the current user's growth_client_id via their growth_members
// row. The client arrived here via the magic link Supabase Auth sent after
// Paystack confirmed payment (webhook), not via a token this code validates
// itself.
export async function requireGrowthClientId(): Promise<
  { id: string; error?: undefined } | { id?: undefined; error: string }
> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Your session has expired, please use the link from your email again." };
  }

  const admin = createAdminClient();
  // A user can belong to more than one growth_client (growth_members is a
  // proper join table for exactly that reason) — take the most recent one
  // rather than assuming there's only ever a single row.
  const { data: memberships } = await admin
    .from("growth_members")
    .select("growth_client_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (!memberships || memberships.length === 0) {
    return { error: "No account found for this login." };
  }

  return { id: memberships[0].growth_client_id };
}
