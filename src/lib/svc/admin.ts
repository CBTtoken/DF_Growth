import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * The SVC admin gate for Sprint 2's minimal admin surface (the coupon
 * import and the member ledger, which the sprint's acceptance criteria
 * need). A comma-separated allowlist of emails in SVC_ADMIN_EMAILS; the
 * full role model arrives with Sprint 3's real admin.
 */
export async function getSvcAdmin(): Promise<{ id: string; email: string } | null> {
  const allowlist = (process.env.SVC_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (allowlist.length === 0) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  return allowlist.includes(user.email.toLowerCase()) ? { id: user.id, email: user.email } : null;
}
