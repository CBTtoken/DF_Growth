"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ACTIVE_ACCOUNT_COOKIE } from "@/lib/auth/require-growth-client";

// The only writer of the active-account cookie — never trusts the
// growthClientId argument on its own, always re-checks it against a real
// growth_members row for the current session first. Without that check,
// any logged-in user could set the cookie to someone else's account id and
// land in their dashboard.
export async function switchAccount(growthClientId: string) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: membership } = await admin
    .from("growth_members")
    .select("growth_client_id")
    .eq("user_id", user.id)
    .eq("growth_client_id", growthClientId)
    .maybeSingle();

  if (!membership) redirect("/dashboard");

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ACCOUNT_COOKIE, growthClientId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect("/dashboard");
}
