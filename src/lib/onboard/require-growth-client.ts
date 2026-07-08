import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Shared by every onboard Server Action: resolves the authenticated user's
// growth_client_id via their growth_members row. The client arrived here via
// the magic link Supabase Auth sent after Paystack confirmed payment
// (webhook), not via a token this code has to validate itself.
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
  const { data: membership } = await admin
    .from("growth_members")
    .select("growth_client_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return { error: "No account found for this login." };
  }

  return { id: membership.growth_client_id };
}
