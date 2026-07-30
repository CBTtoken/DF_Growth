import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Finds an auth user by email address, exactly.
 *
 * GoTrue's admin list endpoint accepts an email filter and ignores it,
 * returning every user regardless. That has already caused a real bug on
 * this project, where taking users[0] from a "filtered" list meant acting on
 * whichever unrelated account happened to sort first. So this pages through
 * and matches on the address itself, in code, and returns null rather than a
 * best guess.
 */
export async function findAuthUserByEmail(email: string): Promise<{ id: string } | null> {
  const admin = createAdminClient();
  const target = email.trim().toLowerCase();
  const perPage = 1000;

  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error || !data?.users?.length) return null;

    const match = data.users.find((user) => (user.email ?? "").toLowerCase() === target);
    if (match) return { id: match.id };

    if (data.users.length < perPage) return null;
  }

  return null;
}
