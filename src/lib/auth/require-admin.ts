import { createClient as createServerClient } from "@/lib/supabase/server";

// Combined spec Sec 11: shared by every admin-only page/route (the admin
// list, the new per-client detail page, and the new CSV export) instead of
// duplicating the same allowlist check three times — CLAUDE.md Section 3
// already settled on "no separate admin auth needed, gate by email
// allowlist" for the pilot; this just factors that one check out so it
// can't quietly drift between the places that need it.
export async function requireAdminEmail(): Promise<{ email: string } | { error: true }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const allowlist = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase());
  const isAdmin = !!user?.email && allowlist.includes(user.email.toLowerCase());

  if (!user || !isAdmin) return { error: true };
  return { email: user.email! };
}
